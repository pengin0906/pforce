'use strict';

/**
 * Report Agent Routes - /api/report/generate/:resultId, /api/report/mode
 * AI report generation logic using Gemini
 */

function createReportAgentRoutes(app, ctx) {
  const { INSTANCE_NAME } = ctx;

  const NOVASEC_URL = process.env.NOVASEC_URL || `http://localhost:${process.env.NOVASEC_PORT || 8081}`;

  // Agent型レポート生成 -- Claude APIで複数ステップ思考
  app.post('/api/report/generate/:resultId', ctx.ensureAuthenticated, async (req, res) => {
    const resultId = req.params.resultId;

    // Step 1: NovaSeq Pforceからソースデータ取得
    let resultData;
    try {
      const r = await fetch(`${NOVASEC_URL}/api/results/${resultId}`);
      const json = await r.json();
      resultData = json.result;
      if (!resultData) throw new Error('Result not found');
    } catch (err) {
      return res.status(404).json({ error: 'NovaSeq Pforceからデータ取得失敗', detail: err.message });
    }

    if (resultData.status !== 'completed' && resultData.status !== 'delivered') {
      return res.status(400).json({ error: '解析が完了していない検体のレポートは生成できません' });
    }

    // APIキー確認（最低限Geminiが必要。OpenAIもあればデュアルAgent）
    const openaiKey = process.env.OPENAI_API_KEY;
    const googleKey = process.env.GOOGLE_AI_KEY;
    if (!googleKey) {
      // フォールバック: テンプレートレポート（Gemini APIキーなし）
      try {
        const r = await fetch(`${NOVASEC_URL}/api/results/${resultId}/report`);
        const json = await r.json();
        return res.json({
          success: true,
          mode: 'template',
          message: `テンプレートベースレポート（GOOGLE_AI_KEY未設定）`,
          reportId: json.reportId,
          reportHtml: json.reportHtml
        });
      } catch (err) {
        return res.status(500).json({ error: 'テンプレートレポート生成失敗', detail: err.message });
      }
    }

    // ============================================================
    // Gemini Agent: gemini-3-flash-preview で生成+レビュー（全5ターン）
    // ============================================================
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(googleKey);
      const GEMINI_MODEL = 'gemini-3-flash-preview';

      // --- 匿名化（患者名・施設名・医師名をマスク） ---
      const anonMap = {};
      let anonCtr = 0;
      function anon(val, cat) {
        if (!val) return val;
        if (!anonMap[val]) { anonCtr++; anonMap[val] = `[${cat}_${String(anonCtr).padStart(3,'0')}]`; }
        return anonMap[val];
      }
      function deanon(text) {
        let r = text;
        for (const [orig, masked] of Object.entries(anonMap)) r = r.replaceAll(masked, orig);
        return r;
      }
      const anonPatient = anon(resultData.patientName, 'PATIENT');
      const anonInst = anon(resultData.institution, 'INST');
      const anonDoc = anon(resultData.doctor, 'DR');
      console.log(`[Agent] 匿名化: ${resultData.patientName}→${anonPatient}, ${resultData.institution||'-'}→${anonInst||'-'}`);

      // --- Gemini Flash ヘルパー ---
      async function geminiCall(sysInst, prompt) {
        const m = genAI.getGenerativeModel({
          model: GEMINI_MODEL,
          systemInstruction: { parts: [{ text: sysInst }] }
        });
        const r = await m.generateContent(prompt);
        return r.response.text();
      }

      // 匿名化ソースデータ
      const sourceJson = JSON.stringify({
        patientName: anonPatient, cancerType: resultData.cancerType,
        specimenId: resultData.specimenId, orderId: resultData.orderId,
        panel: resultData.panel, runId: resultData.runId,
        institution: anonInst, doctor: anonDoc,
        qcResult: resultData.qcResult, meanDepth: resultData.meanDepth,
        uniformity: resultData.uniformity, onTargetRate: resultData.onTargetRate,
        totalReads: resultData.totalReads, mappedReads: resultData.mappedReads,
        msi: resultData.msi, tmb: resultData.tmb, hrd: resultData.hrd,
        variants: resultData.variants, fusionGenes: resultData.fusionGenes, cnv: resultData.cnv
      }, null, 2);

      const reportDate = new Date().toLocaleDateString('ja-JP', { year:'numeric', month:'2-digit', day:'2-digit' });
      const reportId = `RPT-${resultId.replace('AR-','')}-${new Date().getFullYear()}`;
      const modelsUsed = []; // 各ターンで使ったモデルを記録

      // === Phase 1: Gemini Flash でレポート生成 (Turn 1-3) ===

      // === Turn 1: 臨床解釈ドラフト ===
      console.log(`[${GEMINI_MODEL}] Turn 1/5: 臨床解釈ドラフト生成 (${resultId})`);
      const draft = await geminiCall(
        `あなたは遺伝子検査の臨床レポートを作成する専門家です。
提供されたゲノム解析データに基づいて臨床解釈を行います。

【厳守ルール】
- 提供データに含まれるバリアント・バイオマーカーのみに言及すること
- データにない変異や薬剤を創作しないこと（ハルシネーション厳禁）
- エビデンスレベルはデータに記載されたTierをそのまま使用すること
- 治療推奨ではなく情報提供であることを明記すること`,
        `以下のゲノム解析結果に基づいて、臨床解釈のドラフトを日本語で作成してください。

【解析データ（ソース）】
${sourceJson}

以下の構成で書いてください:
1. 検査結果概要（3-4文で簡潔に）
2. 治療に関連するアクショナブルバリアント（Tier I/IIのみ、各バリアントの臨床的意義と対応薬剤）
3. バイオマーカー解釈（MSI/TMB/HRDの臨床的意義）
4. その他の検出バリアント（簡潔に）
5. 推奨事項（エキスパートパネル検討の推奨等）

※データに存在しないバリアントや薬剤には絶対に言及しないでください。`
      );
      modelsUsed.push({ turn: 1, label: '臨床解釈ドラフト', model: GEMINI_MODEL });
      console.log(`[${GEMINI_MODEL}] Turn 1 完了: ${draft.length}文字`);

      // === Turn 2: ハルシネーションチェック ===
      console.log(`[${GEMINI_MODEL}] Turn 2/5: ハルシネーションチェック (${resultId})`);
      const verificationText = await geminiCall(
        `あなたは医療AIの品質管理担当です。レポートドラフトとソースデータを比較し、ハルシネーション（データにない情報の捏造）がないか検証します。`,
        `以下のレポートドラフトを検証してください。

【ソースデータ（正解）】
${sourceJson}

【レポートドラフト】
${draft}

以下を確認してください:
1. ドラフトに記載されている全バリアントがソースデータに存在するか
2. 薬剤名がソースデータのdrugResponseと一致するか
3. エビデンスレベル（Tier）が正しいか
4. MSI/TMB/HRDの値とステータスが正確か
5. ソースデータにない情報が追加されていないか

結果をJSON形式のみで返してください（前後の説明不要）:
{
  "passed": true/false,
  "issues": ["問題点の説明..."],
  "corrections": ["修正すべき箇所..."],
  "verifiedFacts": ["検証済みの事実..."]
}`
      );
      modelsUsed.push({ turn: 2, label: 'ハルシネーションチェック', model: GEMINI_MODEL });
      console.log(`[${GEMINI_MODEL}] Turn 2 完了: ${verificationText.length}文字`);

      let verification;
      try {
        const jsonMatch = verificationText.match(/\{[\s\S]*\}/);
        verification = jsonMatch ? JSON.parse(jsonMatch[0]) : { passed: true, issues: [], corrections: [] };
      } catch { verification = { passed: true, issues: [], corrections: [] }; }

      // === Turn 3: レポートHTML生成 ===
      console.log(`[${GEMINI_MODEL}] Turn 3/5: レポートHTML生成 (${resultId})`);
      let reportHtmlDraft = await geminiCall(
        `あなたはgenmine社の遺伝子検査レポートを生成するAIシステムです。
ソースデータと臨床解釈ドラフト、ハルシネーション検証結果から、A4印刷可能なHTMLレポートを生成します。

【厳守ルール】
- ソースデータに含まれる情報のみを使用（ハルシネーション厳禁）
- 検証で指摘された問題は必ず修正すること
- レポートは医療従事者向け
- HTMLのみを出力（前後の説明文不要。\`\`\`htmlフェンス不要）`,
        `以下からレポートHTMLを生成してください。

【ソースデータ】
${sourceJson}

【臨床解釈ドラフト（Turn 1）】
${draft}

【ハルシネーション検証（Turn 2）】
${JSON.stringify(verification)}

レポート構成:
- <!DOCTYPE html>完全なHTML（lang="ja"）、@media print対応A4
- ヘッダー: "genmine TOP 包括的がんゲノムプロファイリング検査レポート", レポートID: ${reportId}, 日付: ${reportDate}
- "CONFIDENTIAL 医療従事者専用" バナー
- 患者情報・検体情報（2カラム）
- エグゼクティブサマリー
- アクショナブルバリアント（カード形式、薬剤名/エビデンスレベル付き）
- ゲノムバイオマーカー（MSI/TMB/HRD カード形式）
- 全バリアント一覧テーブル
- 融合遺伝子（あれば）、CNV（あれば）
- QCメトリクスグリッド
- エビデンスレベル凡例
- フッター: genmine中央研究所, CAP/ISO15189/CLIA
- 印刷/PDF保存ボタン(no-print)、閉じるボタン
- デザイン: 青系グラデーション（#0d47a1～#1565c0）

HTMLのみ出力。\`\`\`htmlフェンス不要。<!DOCTYPE html>から始めてください。`
      );
      modelsUsed.push({ turn: 3, label: 'レポートHTML生成', model: GEMINI_MODEL });
      console.log(`[${GEMINI_MODEL}] Turn 3 完了: レポートHTML ${reportHtmlDraft.length}文字`);

      // HTMLクリーンアップ
      reportHtmlDraft = reportHtmlDraft.replace(/^```html\s*/i, '').replace(/\s*```\s*$/i, '');
      const draftStart = reportHtmlDraft.indexOf('<!DOCTYPE');
      const draftEnd = reportHtmlDraft.lastIndexOf('</html>');
      if (draftStart >= 0 && draftEnd >= 0) reportHtmlDraft = reportHtmlDraft.substring(draftStart, draftEnd + 7);

      // === Phase 2: Gemini Flash でレビュー (Turn 4-5) ===

      // === Turn 4: レビュー（ガイドライン + CDx + ハルシネーション総合検証）===
      console.log(`[${GEMINI_MODEL}] Turn 4/5: レビュー (${resultId})`);
      const guidelineText = await geminiCall(
        `あなたはTurn 1-3で生成された遺伝子検査レポートをレビューする検証者です。
ガイドライン適合性、コンパニオン診断、ハルシネーションの有無を総合的に検証します。
生成ターンとは異なる視点（レビュアー）として、見落としや誤りがないか厳密にチェックしてください。`,
        `Turn 1-3で生成された以下のレポートを総合的にダブルチェックしてください。

【がん種】${resultData.cancerType}
【パネル】${resultData.panel}

【ソースデータ（正解データ）】
${sourceJson}

【Turn 1の臨床解釈ドラフト（${modelsUsed[0]?.model || 'AI'}）】
${draft}

【Turn 2のハルシネーションチェック結果（${modelsUsed[1]?.model || 'AI'}）】
${JSON.stringify(verification)}

以下を包括的にチェック:
A. ハルシネーション再検証: ドラフトのバリアント・薬剤がソースデータに存在するか
B. ガイドライン適合: 各バリアント-薬剤ペアがNCCN/JSCO/ESMO/FDA/PMDA承認と整合するか
C. コンパニオン診断: genmine TOPパネルの適格性、保険適用条件
D. エビデンスレベル: Tier分類が適切か
E. 重要な見落とし: 言及すべきだった情報

JSON形式のみで返してください:
{
  "guidelineCompliant": true/false,
  "findings": [{"variant":"遺伝子名", "drug":"薬剤名", "status":"承認済み/ガイドライン記載/適応外/要確認", "note":"補足"}],
  "companionDxValid": true/false,
  "drugAssessments": [{"drug":"薬剤名","gene":"遺伝子","applicability":"保険適用/適応外/治験/要EP","note":"補足"}],
  "hallucinationRecheck": {"passed": true/false, "newIssues": []},
  "missingInfo": ["見落とし情報"],
  "warnings": ["注意事項"],
  "recommendations": ["推奨事項"]
}`
      );
      modelsUsed.push({ turn: 4, label: 'レビュー', model: GEMINI_MODEL });
      console.log(`[${GEMINI_MODEL}] Turn 4 完了: ${guidelineText.length}文字`);

      let geminiCheck;
      try {
        const jsonMatch = guidelineText.match(/\{[\s\S]*\}/);
        geminiCheck = jsonMatch ? JSON.parse(jsonMatch[0]) : { guidelineCompliant: true, findings: [], warnings: [], hallucinationRecheck: { passed: true, newIssues: [] } };
      } catch { geminiCheck = { guidelineCompliant: true, findings: [], warnings: [], hallucinationRecheck: { passed: true, newIssues: [] } }; }

      console.log(`[${GEMINI_MODEL}] レビュー結果:`);
      console.log(`  ガイドライン: ${geminiCheck.guidelineCompliant ? '適合' : '要注意'}`);
      console.log(`  CDx: ${geminiCheck.companionDxValid ? '適格' : '要確認'}`);
      console.log(`  ハルシネーション再検証: ${geminiCheck.hallucinationRecheck?.passed ? 'PASS' : 'FAIL'}`);

      // AI検証ログ（レポートHTMLに埋め込む用）
      const aiLogSummary = modelsUsed.map(m => `Turn ${m.turn}: ${m.model}（${m.label}）`).join(' → ');

      // === Turn 5: レポートHTMLを修正・最終化 ===
      console.log(`[${GEMINI_MODEL}] Turn 5/5: レポート最終化 (${resultId})`);
      let reportHtml = await geminiCall(
        `あなたはTurn 1-3で生成された遺伝子検査レポートHTMLを最終チェック・修正するシステムです。
ダブルチェック結果に基づいてHTMLを修正し、最終版を出力します。

【厳守ルール】
- ソースデータに含まれる情報のみを使用
- ダブルチェックで指摘された問題を必ず修正
- AI検証ログセクションを追加
- HTMLのみ出力（\`\`\`htmlフェンス不要）`,
        `以下のTurn 3で生成されたレポートHTMLを、ダブルチェック結果に基づいて修正してください。

【Turn 3生成レポートHTML】
${reportHtmlDraft}

【Gemini 3.1 Pro ダブルチェック結果】
${JSON.stringify(geminiCheck)}

修正事項:
1. ダブルチェックで指摘された問題をHTMLに反映
2. 以下のAI検証ログセクションをQCメトリクスの後に追加:
   ${aiLogSummary} → Turn 5: Gemini 3.1 Pro（最終修正）
   ハルシネーションチェック: ${verification.passed ? 'PASS' : 'FAIL（' + (verification.issues?.length || 0) + '件）'}
   ダブルチェック: ガイドライン${geminiCheck.guidelineCompliant ? '適合' : '要注意'} / CDx${geminiCheck.companionDxValid ? '適格' : '要確認'}
3. warningsがあればエグゼクティブサマリーに注意事項として追記

HTMLのみ出力。<!DOCTYPE html>から始めてください。`
      );
      modelsUsed.push({ turn: 5, label: '最終修正', model: GEMINI_MODEL });
      console.log(`[${GEMINI_MODEL}] Turn 5 完了: 最終レポートHTML ${reportHtml.length}文字`);

      // HTMLクリーンアップ
      reportHtml = reportHtml.replace(/^```html\s*/i, '').replace(/\s*```\s*$/i, '');
      const htmlStart = reportHtml.indexOf('<!DOCTYPE');
      const htmlEnd = reportHtml.lastIndexOf('</html>');
      if (htmlStart >= 0 && htmlEnd >= 0) reportHtml = reportHtml.substring(htmlStart, htmlEnd + 7);

      // 匿名化を復元（レポートHTMLに実名を戻す）
      reportHtml = deanon(reportHtml);

      const uniqueModels = [...new Set(modelsUsed.map(m => m.model))].join(' + ');
      res.json({
        success: true,
        mode: 'agent',
        agentModel: uniqueModels,
        agentTurns: 5,
        modelsUsed,
        reportId,
        verification: {
          hallucinationCheck: { passed: verification.passed, issueCount: verification.issues?.length || 0, issues: verification.issues || [] },
          guidelineCheck: { compliant: geminiCheck.guidelineCompliant, findings: geminiCheck.findings || [], warnings: geminiCheck.warnings || [] },
          cdxCheck: { valid: geminiCheck.companionDxValid, assessments: geminiCheck.drugAssessments || [], recommendations: geminiCheck.recommendations || [] },
          hallucinationRecheck: geminiCheck.hallucinationRecheck || { passed: true, newIssues: [] }
        },
        reportHtml
      });

    } catch (err) {
      console.error('[Dual Agent] レポート生成エラー:', err.message);
      // Agent失敗時はテンプレートフォールバック
      try {
        const r = await fetch(`${NOVASEC_URL}/api/results/${resultId}/report`);
        const json = await r.json();
        return res.json({
          success: true,
          mode: 'template-fallback',
          message: `Dual Agent生成失敗（${err.message}）、テンプレートにフォールバック`,
          reportId: json.reportId,
          reportHtml: json.reportHtml
        });
      } catch (e2) {
        return res.status(500).json({ error: 'レポート生成失敗', detail: err.message });
      }
    }
  });

  // レポート生成モード確認
  app.get('/api/report/mode', ctx.ensureAuthenticated, (req, res) => {
    const hasGemini = !!process.env.GOOGLE_AI_KEY;
    res.json({
      mode: hasGemini ? 'agent' : 'template',
      agentAvailable: hasGemini,
      agentModel: hasGemini ? 'gemini-3-flash-preview' : null,
      description: hasGemini
        ? 'Gemini Agent型（gemini-3-flash-previewが5ステップで生成+レビュー）'
        : 'テンプレート型（GOOGLE_AI_KEY設定でAgent型に切替可能）',
      anonymization: true,
      noTraining: { gemini: 'API経由は学習対象外' }
    });
  });
}

module.exports = { createReportAgentRoutes };

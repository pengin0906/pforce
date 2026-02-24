const { db, collectionExists } = require('./pg-service');
const { generateSeedId } = require('./salesforce-id');

// ============================================================================
// Generate deterministic Salesforce-compatible 18-character IDs
// ============================================================================

// Helper to create ID maps for each object type
function buildIdMap(objectName, count) {
  const map = {};
  for (let i = 1; i <= count; i++) {
    map[i] = generateSeedId(objectName, i);
  }
  return map;
}

// Pre-generate all IDs
const MI  = buildIdMap('Medical_Institution__c', 8);
const D   = buildIdMap('Doctor__c', 15);
const O   = buildIdMap('Pharma_Opportunity__c', 12);
const G   = buildIdMap('Genomic_Project__c', 8);
const V   = buildIdMap('Visit_Record__c', 15);
const SP  = buildIdMap('Specimen__c', 12);
const MA  = buildIdMap('MA_Activity__c', 15);
const S   = buildIdMap('Seminar__c', 8);
const L   = buildIdMap('Lab__c', 5);
const J   = buildIdMap('Joint_Research__c', 5);
const ACC = buildIdMap('Account', 10);
const CON = buildIdMap('Contact', 8);
const LEAD = buildIdMap('Lead', 5);
const OPP = buildIdMap('Opportunity', 6);
const PROD = buildIdMap('Product2', 5);
const PB  = buildIdMap('Pricebook2', 2);
const PBE = buildIdMap('PricebookEntry', 5);
const CMP = buildIdMap('Campaign', 3);
const CMM = buildIdMap('CampaignMember', 6);
const CASE = buildIdMap('Case', 4);
const TASK = buildIdMap('Task', 8);
const EVT = buildIdMap('Event', 5);
const OLI = buildIdMap('OpportunityLineItem', 4);
const OCR = buildIdMap('OpportunityContactRole', 4);
const QUO = buildIdMap('Quote', 3);
const QLI = buildIdMap('QuoteLineItem', 4);
const CTR = buildIdMap('Contract', 3);
const ORD = buildIdMap('Order', 2);
const OI  = buildIdMap('OrderItem', 3);
const USR = buildIdMap('User', 8);
const NOTE = buildIdMap('Note', 4);
const CD  = buildIdMap('ContentDocument', 3);
const BRK = buildIdMap('Broker__c', 8);
const PROP = buildIdMap('Property__c', 12);
const BNT = buildIdMap('Bento_Order__c', 6);
const SA  = buildIdMap('Seminar_Attendee__c', 12);
const TO  = buildIdMap('Testing_Order__c', 10);
const DR  = buildIdMap('Daily_Report__c', 6);
const AR  = buildIdMap('Approval_Request__c', 6);
const EX  = buildIdMap('Expense_Report__c', 6);
const CI  = buildIdMap('Competitive_Intel__c', 5);
const VT  = buildIdMap('Visit_Target__c', 12);
const WF  = buildIdMap('Workflow_Instance__c', 8);
const demoData = {
  Medical_Institution__c: [
    { Id: MI[1], Name: '東京大学医学部附属病院', Facility_Type__c: '大学病院', Prefecture__c: '東京都', Adapter_Status__c: '導入完了', Bed_Count__c: 1217, Latitude__c: 35.7128, Longitude__c: 139.7630 },
    { Id: MI[2], Name: '京都大学医学部附属病院', Facility_Type__c: '大学病院', Prefecture__c: '京都府', Adapter_Status__c: '導入中', Bed_Count__c: 1121, Latitude__c: 35.0193, Longitude__c: 135.7723 },
    { Id: MI[3], Name: '大阪国際がんセンター', Facility_Type__c: 'がん拠点病院', Prefecture__c: '大阪府', Adapter_Status__c: '導入完了', Bed_Count__c: 500, Latitude__c: 34.6936, Longitude__c: 135.5131 },
    { Id: MI[4], Name: '横浜市立大学附属病院', Facility_Type__c: '大学病院', Prefecture__c: '神奈川県', Adapter_Status__c: '導入完了', Bed_Count__c: 674, Latitude__c: 35.3384, Longitude__c: 139.5726 },
    { Id: MI[5], Name: '国立がん研究センター', Facility_Type__c: 'がん拠点病院', Prefecture__c: '東京都', Adapter_Status__c: '導入完了', Bed_Count__c: 578, Latitude__c: 35.6703, Longitude__c: 139.7568 },
    { Id: MI[6], Name: '慶應義塾大学病院', Facility_Type__c: '大学病院', Prefecture__c: '東京都', Adapter_Status__c: '導入中', Bed_Count__c: 960, Latitude__c: 35.7003, Longitude__c: 139.7172 },
    { Id: MI[7], Name: '順天堂大学病院', Facility_Type__c: '大学病院', Prefecture__c: '東京都', Adapter_Status__c: '未導入', Bed_Count__c: 1051, Latitude__c: 35.7017, Longitude__c: 139.7617 },
    { Id: MI[8], Name: '九州大学病院', Facility_Type__c: '大学病院', Prefecture__c: '福岡県', Adapter_Status__c: '導入完了', Bed_Count__c: 1275, Latitude__c: 33.6138, Longitude__c: 130.4189 }
  ],
  Doctor__c: [
    { Id: D[1], Name: '山田太郎', Department__c: '腫瘍内科', Title__c: '教授', Relationship_Level__c: 'ファン（KOL）', Is_KOL__c: true, KOL_Score__c: 95, Assigned_MR__c: '鈴木一郎', Visit_Count__c: 12, Referred_Specimen_Count__c: 8, Medical_Institution__c: MI[1] },
    { Id: D[2], Name: '田中次郎', Department__c: '呼吸器内科', Title__c: '准教授', Relationship_Level__c: '推進者', Is_KOL__c: false, KOL_Score__c: 65, Assigned_MR__c: '鈴木一郎', Visit_Count__c: 8, Referred_Specimen_Count__c: 3, Medical_Institution__c: MI[1] },
    { Id: D[3], Name: '佐藤花子', Department__c: '病理診断科', Title__c: '部長', Relationship_Level__c: '関心あり', Is_KOL__c: false, KOL_Score__c: 40, Assigned_MR__c: '田中花子', Visit_Count__c: 4, Referred_Specimen_Count__c: 1, Medical_Institution__c: MI[3] },
    { Id: D[4], Name: '鈴木健二', Department__c: '乳腺外科', Title__c: '助教', Relationship_Level__c: '初回面談済', Is_KOL__c: false, KOL_Score__c: 20, Assigned_MR__c: '佐藤健太', Visit_Count__c: 2, Referred_Specimen_Count__c: 0, Medical_Institution__c: MI[2] },
    { Id: D[5], Name: '高橋美咲', Department__c: '消化器内科', Title__c: '部長', Relationship_Level__c: 'ファン（KOL）', Is_KOL__c: true, KOL_Score__c: 88, Assigned_MR__c: '山本優子', Visit_Count__c: 15, Referred_Specimen_Count__c: 10, Medical_Institution__c: MI[4] },
    { Id: D[6], Name: '渡辺隆', Department__c: '腫瘍内科', Title__c: '医長', Relationship_Level__c: '検討中', Is_KOL__c: false, KOL_Score__c: 50, Assigned_MR__c: '渡辺翔太', Visit_Count__c: 5, Referred_Specimen_Count__c: 2, Medical_Institution__c: MI[5] },
    { Id: D[7], Name: '伊藤裕子', Department__c: '遺伝診療科', Title__c: '准教授', Relationship_Level__c: '推進者', Is_KOL__c: false, KOL_Score__c: 72, Assigned_MR__c: '田中花子', Visit_Count__c: 9, Referred_Specimen_Count__c: 5, Medical_Institution__c: MI[6] },
    { Id: D[8], Name: '中村誠', Department__c: '腫瘍内科', Title__c: '教授', Relationship_Level__c: 'ファン（KOL）', Is_KOL__c: true, KOL_Score__c: 92, Assigned_MR__c: '佐藤健太', Visit_Count__c: 11, Referred_Specimen_Count__c: 7, Medical_Institution__c: MI[8] },
    { Id: D[9], Name: '小林真理', Department__c: '呼吸器内科', Title__c: '講師', Relationship_Level__c: '関心あり', Is_KOL__c: false, KOL_Score__c: 35, Assigned_MR__c: '鈴木一郎', Visit_Count__c: 3, Referred_Specimen_Count__c: 0, Medical_Institution__c: MI[3] },
    { Id: D[10], Name: '加藤大輔', Department__c: '消化器内科', Title__c: '助教', Relationship_Level__c: '未接触', Is_KOL__c: false, KOL_Score__c: 10, Assigned_MR__c: '山本優子', Visit_Count__c: 0, Referred_Specimen_Count__c: 0, Medical_Institution__c: MI[5] },
    { Id: D[11], Name: '松本恵', Department__c: '乳腺外科', Title__c: '医長', Relationship_Level__c: '初回面談済', Is_KOL__c: false, KOL_Score__c: 25, Assigned_MR__c: '渡辺翔太', Visit_Count__c: 1, Referred_Specimen_Count__c: 0, Medical_Institution__c: MI[7] },
    { Id: D[12], Name: '井上健太郎', Department__c: '病理診断科', Title__c: '教授', Relationship_Level__c: '検討中', Is_KOL__c: false, KOL_Score__c: 55, Assigned_MR__c: '田中花子', Visit_Count__c: 4, Referred_Specimen_Count__c: 1, Medical_Institution__c: MI[2] },
    { Id: D[13], Name: '木村彩', Department__c: '腫瘍内科', Title__c: '講師', Relationship_Level__c: '推進者', Is_KOL__c: false, KOL_Score__c: 60, Assigned_MR__c: '佐藤健太', Visit_Count__c: 7, Referred_Specimen_Count__c: 3, Medical_Institution__c: MI[8] },
    { Id: D[14], Name: '林大介', Department__c: '外科', Title__c: '准教授', Relationship_Level__c: '関心あり', Is_KOL__c: false, KOL_Score__c: 45, Assigned_MR__c: '山本優子', Visit_Count__c: 3, Referred_Specimen_Count__c: 0, Medical_Institution__c: MI[2] },
    { Id: D[15], Name: '清水由美', Department__c: '腫瘍内科', Title__c: '部長', Relationship_Level__c: 'ファン（KOL）', Is_KOL__c: true, KOL_Score__c: 85, Assigned_MR__c: '鈴木一郎', Visit_Count__c: 14, Referred_Specimen_Count__c: 9, Medical_Institution__c: MI[6] }
  ],
  Pharma_Opportunity__c: [
    { Id: O[1], Name: 'Lens導入（JSR製薬）', Pharma_Company__c: 'JSR製薬', Phase__c: '提案', Amount__c: 5000, Service_Type__c: 'Tempus Lens', Owner_Name__c: '鈴木一郎', Probability__c: 40 },
    { Id: O[2], Name: 'カスタム解析（ペプチドリーム）', Pharma_Company__c: 'ペプチドリーム', Phase__c: 'セキュリティ審査', Amount__c: 3000, Service_Type__c: 'カスタム解析', Owner_Name__c: '田中花子', Probability__c: 60 },
    { Id: O[3], Name: '共同研究（武田薬品）', Pharma_Company__c: '武田薬品工業', Phase__c: 'ヒアリング', Amount__c: 20000, Service_Type__c: '共同研究', Owner_Name__c: '佐藤健太', Probability__c: 20 },
    { Id: O[4], Name: 'Explore導入（メディセーフ）', Pharma_Company__c: 'メディセーフ', Phase__c: '契約交渉', Amount__c: 2500, Service_Type__c: 'Tempus Explore', Owner_Name__c: '鈴木一郎', Probability__c: 80 },
    { Id: O[5], Name: 'RWD（アムジェン）', Pharma_Company__c: 'アムジェン', Phase__c: 'リード', Amount__c: 10000, Service_Type__c: 'カスタム解析', Owner_Name__c: '山本優子', Probability__c: 10 },
    { Id: O[6], Name: 'バイオマーカー（中外製薬）', Pharma_Company__c: '中外製薬', Phase__c: '成約', Amount__c: 8000, Service_Type__c: 'カスタム解析', Owner_Name__c: '田中花子', Probability__c: 100 },
    { Id: O[7], Name: 'AI診断共同開発（第一三共）', Pharma_Company__c: '第一三共', Phase__c: '提案', Amount__c: 15000, Service_Type__c: '共同研究', Owner_Name__c: '渡辺翔太', Probability__c: 35 },
    { Id: O[8], Name: 'Lens年間契約（アステラス）', Pharma_Company__c: 'アステラス製薬', Phase__c: '成約', Amount__c: 6000, Service_Type__c: 'Tempus Lens', Owner_Name__c: '佐藤健太', Probability__c: 100 },
    { Id: O[9], Name: '膵がん解析（小野薬品）', Pharma_Company__c: '小野薬品工業', Phase__c: 'ヒアリング', Amount__c: 4500, Service_Type__c: 'カスタム解析', Owner_Name__c: '山本優子', Probability__c: 25 },
    { Id: O[10], Name: 'Explore（エーザイ）', Pharma_Company__c: 'エーザイ', Phase__c: '失注', Amount__c: 3500, Service_Type__c: 'Tempus Explore', Owner_Name__c: '渡辺翔太', Probability__c: 0 },
    { Id: O[11], Name: 'リキッドバイオプシー（大塚）', Pharma_Company__c: '大塚製薬', Phase__c: 'セキュリティ審査', Amount__c: 12000, Service_Type__c: '共同研究', Owner_Name__c: '鈴木一郎', Probability__c: 55 },
    { Id: O[12], Name: '病理AI（塩野義）', Pharma_Company__c: '塩野義製薬', Phase__c: '契約交渉', Amount__c: 7000, Service_Type__c: 'カスタム解析', Owner_Name__c: '田中花子', Probability__c: 75 }
  ],
  Genomic_Project__c: [
    { Id: G[1], Name: '肺がんゲノム解析PJ', Cancer_Type__c: '肺がん', Status__c: '解析中', Sample_Count__c: 25 },
    { Id: G[2], Name: '乳がんバイオマーカー研究', Cancer_Type__c: '乳がん', Status__c: 'レポート完了', Sample_Count__c: 50 },
    { Id: G[3], Name: '膵がんシーケンス', Cancer_Type__c: '膵がん', Status__c: '検体待ち', Sample_Count__c: 10 },
    { Id: G[4], Name: '大腸がん初期例解析', Cancer_Type__c: '大腸がん', Status__c: 'レポート作成中', Sample_Count__c: 15 },
    { Id: G[5], Name: '血液がんマルチオミクス', Cancer_Type__c: '血液がん', Status__c: '解析中', Sample_Count__c: 30 },
    { Id: G[6], Name: '胃がんAI病理', Cancer_Type__c: '胃がん', Status__c: '納品済', Sample_Count__c: 40 },
    { Id: G[7], Name: '希少がんパネル', Cancer_Type__c: '希少がん', Status__c: '解析中', Sample_Count__c: 8 },
    { Id: G[8], Name: '肺がんリキッドBx研究', Cancer_Type__c: '肺がん', Status__c: 'レポート完了', Sample_Count__c: 60 }
  ],
  Visit_Record__c: [
    { Id: V[1], Name: 'VR-0001', Doctor__c: D[1], Visit_Date__c: '2025-12-10', Meeting_Result__c: '好感触', Visit_Purpose__c: 'フォローアップ', Next_Action__c: '検体提出依頼' },
    { Id: V[2], Name: 'VR-0002', Doctor__c: D[3], Visit_Date__c: '2025-12-05', Meeting_Result__c: '継続検討', Visit_Purpose__c: '新規紹介', Next_Action__c: '資料送付' },
    { Id: V[3], Name: 'VR-0003', Doctor__c: D[2], Visit_Date__c: '2025-12-12', Meeting_Result__c: '好感触', Visit_Purpose__c: '学術情報提供', Next_Action__c: '勉強会案内' },
    { Id: V[4], Name: 'VR-0004', Doctor__c: D[5], Visit_Date__c: '2025-12-08', Meeting_Result__c: '好感触', Visit_Purpose__c: '検査結果説明', Next_Action__c: '共同研究提案' },
    { Id: V[5], Name: 'VR-0005', Doctor__c: D[7], Visit_Date__c: '2025-11-28', Meeting_Result__c: '継続検討', Visit_Purpose__c: 'フォローアップ' },
    { Id: V[6], Name: 'VR-0006', Doctor__c: D[8], Visit_Date__c: '2025-11-20', Meeting_Result__c: '好感触', Visit_Purpose__c: '共同研究打合せ' },
    { Id: V[7], Name: 'VR-0007', Doctor__c: D[6], Visit_Date__c: '2025-11-15', Meeting_Result__c: '保留', Visit_Purpose__c: '新規紹介' },
    { Id: V[8], Name: 'VR-0008', Doctor__c: D[1], Visit_Date__c: '2025-11-10', Meeting_Result__c: '好感触', Visit_Purpose__c: 'フォローアップ' },
    { Id: V[9], Name: 'VR-0009', Doctor__c: D[12], Visit_Date__c: '2025-11-05', Meeting_Result__c: '継続検討', Visit_Purpose__c: '学術情報提供' },
    { Id: V[10], Name: 'VR-0010', Doctor__c: D[13], Visit_Date__c: '2025-10-28', Meeting_Result__c: '好感触', Visit_Purpose__c: '検査結果説明' },
    { Id: V[11], Name: 'VR-0011', Doctor__c: D[15], Visit_Date__c: '2025-10-20', Meeting_Result__c: '好感触', Visit_Purpose__c: '共同研究打合せ' },
    { Id: V[12], Name: 'VR-0012', Doctor__c: D[5], Visit_Date__c: '2025-10-15', Meeting_Result__c: '好感触', Visit_Purpose__c: 'フォローアップ' },
    { Id: V[13], Name: 'VR-0013', Doctor__c: D[9], Visit_Date__c: '2025-10-10', Meeting_Result__c: '保留', Visit_Purpose__c: '新規紹介' },
    { Id: V[14], Name: 'VR-0014', Doctor__c: D[14], Visit_Date__c: '2025-09-20', Meeting_Result__c: '継続検討', Visit_Purpose__c: '学術情報提供' },
    { Id: V[15], Name: 'VR-0015', Doctor__c: D[8], Visit_Date__c: '2025-09-10', Meeting_Result__c: '好感触', Visit_Purpose__c: 'フォローアップ' }
  ],
  Specimen__c: [
    { Id: SP[1], Name: 'SP-00001', Cancer_Type__c: '肺がん', Specimen_Status__c: 'レポート発行済', Analysis_Panel__c: 'xT', Received_Date__c: '2025-10-01', Is_Retest__c: false },
    { Id: SP[2], Name: 'SP-00002', Cancer_Type__c: '乳がん', Specimen_Status__c: '解析中', Analysis_Panel__c: 'xF', Received_Date__c: '2025-12-05', Is_Retest__c: false },
    { Id: SP[3], Name: 'SP-00003', Cancer_Type__c: '膵がん', Specimen_Status__c: 'QC合格', Analysis_Panel__c: 'GenMine', Received_Date__c: '2025-12-10', Is_Retest__c: false },
    { Id: SP[4], Name: 'SP-00004', Cancer_Type__c: '大腸がん', Specimen_Status__c: 'レポート発行済', Analysis_Panel__c: 'xT', Received_Date__c: '2025-09-15', Is_Retest__c: false },
    { Id: SP[5], Name: 'SP-00005', Cancer_Type__c: '胃がん', Specimen_Status__c: '受領済', Analysis_Panel__c: 'xG', Received_Date__c: '2025-12-12', Is_Retest__c: false },
    { Id: SP[6], Name: 'SP-00006', Cancer_Type__c: '肺がん', Specimen_Status__c: '解析完了', Analysis_Panel__c: 'xF', Received_Date__c: '2025-11-20', Is_Retest__c: false },
    { Id: SP[7], Name: 'SP-00007', Cancer_Type__c: '乳がん', Specimen_Status__c: 'QC中', Analysis_Panel__c: 'GenMine', Received_Date__c: '2025-12-14', Is_Retest__c: false },
    { Id: SP[8], Name: 'SP-00008', Cancer_Type__c: '血液がん', Specimen_Status__c: '解析中', Analysis_Panel__c: 'xT', Received_Date__c: '2025-12-08', Is_Retest__c: false },
    { Id: SP[9], Name: 'SP-00009', Cancer_Type__c: '膵がん', Specimen_Status__c: 'QC不合格', Analysis_Panel__c: 'GenMine', Received_Date__c: '2025-12-01', Is_Retest__c: true },
    { Id: SP[10], Name: 'SP-00010', Cancer_Type__c: '肺がん', Specimen_Status__c: '受領待ち', Analysis_Panel__c: 'xT', Is_Retest__c: false },
    { Id: SP[11], Name: 'SP-00011', Cancer_Type__c: '希少がん', Specimen_Status__c: '解析中', Analysis_Panel__c: 'xG', Received_Date__c: '2025-12-03', Is_Retest__c: false },
    { Id: SP[12], Name: 'SP-00012', Cancer_Type__c: '大腸がん', Specimen_Status__c: 'レポート発行済', Analysis_Panel__c: 'xF', Received_Date__c: '2025-11-01', Is_Retest__c: false }
  ],
  MA_Activity__c: [
    { Id: MA[1], Name: '肺がん治療戦略セミナー', Activity_Type__c: '学術講演会', Status__c: '実施済', Activity_Date__c: '2025-12-15', Budget__c: 500, Participant_Count__c: 45, Assigned_MSL__c: '伊藤真理', Compliance_Check__c: '承認済' },
    { Id: MA[2], Name: 'KOLアドバイザリーボード', Activity_Type__c: 'アドバイザリーボード', Status__c: '準備中', Activity_Date__c: '2026-01-20', Budget__c: 1500, Participant_Count__c: 8, Assigned_MSL__c: '伊藤真理', Compliance_Check__c: '承認済' },
    { Id: MA[3], Name: 'がん薬物療法文献レビュー', Activity_Type__c: '文献レビュー提供', Status__c: '企画中', Activity_Date__c: '2026-02-10', Budget__c: 200, Assigned_MSL__c: '中村大介', Compliance_Check__c: '未確認' },
    { Id: MA[4], Name: 'メディカルインフォQ4対応', Activity_Type__c: 'メディカルインフォメーション対応', Status__c: '完了', Activity_Date__c: '2025-12-20', Budget__c: 100, Assigned_MSL__c: '小林あかり', Compliance_Check__c: '承認済' },
    { Id: MA[5], Name: '消化器がんKOL面談', Activity_Type__c: 'KOL面談', Status__c: '実施済', Activity_Date__c: '2025-11-25', Budget__c: 50, Assigned_MSL__c: '中村大介', Compliance_Check__c: '承認済' },
    { Id: MA[6], Name: 'ASCO2025ブース運営', Activity_Type__c: '学会ブース運営', Status__c: '完了', Activity_Date__c: '2025-06-01', Budget__c: 3000, Participant_Count__c: 200, Assigned_MSL__c: '伊藤真理', Compliance_Check__c: '承認済' },
    { Id: MA[7], Name: '院内勉強会（九州大学）', Activity_Type__c: '院内勉強会', Status__c: '実施済', Activity_Date__c: '2025-11-10', Budget__c: 300, Participant_Count__c: 25, Assigned_MSL__c: '中村大介', Compliance_Check__c: '承認済' },
    { Id: MA[8], Name: 'RWDレポート提供', Activity_Type__c: 'リアルワールドデータ提供', Status__c: 'フォロー中', Activity_Date__c: '2025-12-01', Budget__c: 800, Assigned_MSL__c: '小林あかり', Compliance_Check__c: '確認中' },
    { Id: MA[9], Name: '乳がんバイオマーカーレビュー', Activity_Type__c: '文献レビュー提供', Status__c: '実施済', Activity_Date__c: '2025-10-15', Budget__c: 150, Assigned_MSL__c: '伊藤真理', Compliance_Check__c: '承認済' },
    { Id: MA[10], Name: 'パブリケーションプラン2026', Activity_Type__c: 'パブリケーションプラン', Status__c: '企画中', Activity_Date__c: '2026-03-01', Budget__c: 2000, Assigned_MSL__c: '中村大介', Compliance_Check__c: '未確認' },
    { Id: MA[11], Name: '膵がんKOL面談（国がん）', Activity_Type__c: 'KOL面談', Status__c: '実施済', Activity_Date__c: '2025-12-05', Budget__c: 50, Assigned_MSL__c: '小林あかり', Compliance_Check__c: '承認済' },
    { Id: MA[12], Name: '希少がんアドバイザリー', Activity_Type__c: 'アドバイザリーボード', Status__c: '社内承認待ち', Activity_Date__c: '2026-02-15', Budget__c: 1200, Assigned_MSL__c: '伊藤真理', Compliance_Check__c: '確認中' },
    { Id: MA[13], Name: '院内勉強会（慶應大学）', Activity_Type__c: '院内勉強会', Status__c: '準備中', Activity_Date__c: '2026-01-15', Budget__c: 250, Participant_Count__c: 30, Assigned_MSL__c: '小林あかり', Compliance_Check__c: '承認済' },
    { Id: MA[14], Name: '血液がんデータ提供', Activity_Type__c: 'リアルワールドデータ提供', Status__c: '実施済', Activity_Date__c: '2025-11-20', Budget__c: 600, Assigned_MSL__c: '中村大介', Compliance_Check__c: '承認済' },
    { Id: MA[15], Name: 'JSMOサテライトシンポ', Activity_Type__c: '学術講演会', Status__c: '完了', Activity_Date__c: '2025-07-15', Budget__c: 2500, Participant_Count__c: 150, Assigned_MSL__c: '伊藤真理', Compliance_Check__c: '承認済' }
  ],
  Seminar__c: [
    { Id: S[1], Name: '次世代シーケンスセミナー', Event_Format__c: 'Web講演会', Progress_Status__c: '講師確定', Event_Date__c: '2026-01-15', Attendee_Count__c: 0, Speaker_Fee__c: 200, Operation_Cost__c: 100, Venue__c: 'オンライン' },
    { Id: S[2], Name: '液体バイオプシー講演会', Event_Format__c: '学術講演会', Progress_Status__c: '案内配信済', Event_Date__c: '2026-02-20', Attendee_Count__c: 0, Speaker_Fee__c: 300, Operation_Cost__c: 200, Venue__c: '東京国際フォーラム', Venue_Latitude__c: 35.6764, Venue_Longitude__c: 139.7633 },
    { Id: S[3], Name: 'エクソーム解析ハンズオン', Event_Format__c: 'ハンズオンセミナー', Progress_Status__c: '企画立案', Event_Date__c: '2026-03-10', Venue__c: '未定' },
    { Id: S[4], Name: 'がん遺伝子パネル実践', Event_Format__c: '院内勉強会', Progress_Status__c: '開催済', Event_Date__c: '2025-12-01', Attendee_Count__c: 35, Speaker_Fee__c: 200, Operation_Cost__c: 80, Venue__c: '東京大学医学部附属病院 講堂', Venue_Latitude__c: 35.7128, Venue_Longitude__c: 139.7630 },
    { Id: S[5], Name: '病理AI最前線', Event_Format__c: 'Web講演会', Progress_Status__c: '完了', Event_Date__c: '2025-11-15', Attendee_Count__c: 52, Speaker_Fee__c: 250, Operation_Cost__c: 100, Venue__c: 'オンライン' },
    { Id: S[6], Name: 'リキッドバイオプシー実践', Event_Format__c: 'ハンズオンセミナー', Progress_Status__c: '開催済', Event_Date__c: '2025-10-20', Attendee_Count__c: 20, Venue__c: '国立がん研究センター', Venue_Latitude__c: 35.6703, Venue_Longitude__c: 139.7568 },
    { Id: S[7], Name: '地域連携ゲノム医療', Event_Format__c: '地域連携セミナー', Progress_Status__c: '講師打診中', Event_Date__c: '2026-02-01', Venue__c: '大阪国際会議場', Venue_Latitude__c: 34.6910, Venue_Longitude__c: 135.4861 },
    { Id: S[8], Name: '精密医療の未来', Event_Format__c: 'ランチョンセミナー', Progress_Status__c: '会場・日程調整中', Event_Date__c: '2026-03-05', Venue__c: 'パレスホテル東京', Venue_Latitude__c: 35.6848, Venue_Longitude__c: 139.7632 }
  ],
  Lab__c: [
    { Id: L[1], Name: '東京解析ラボ', Location__c: '東京都千代田区', Lab_Type__c: '自社ラボ', Operation_Status__c: '通常稼働', Monthly_Capacity__c: 200, Current_Processing__c: 145 },
    { Id: L[2], Name: '大阪委託ラボ', Location__c: '大阪府大阪市', Lab_Type__c: '委託ラボ', Operation_Status__c: '高負荷', Monthly_Capacity__c: 100, Current_Processing__c: 92 },
    { Id: L[3], Name: '京都大学提携ラボ', Location__c: '京都府京都市', Lab_Type__c: '提携大学ラボ', Operation_Status__c: '通常稼働', Monthly_Capacity__c: 50, Current_Processing__c: 28 },
    { Id: L[4], Name: 'シカゴTempus本社', Location__c: 'Chicago IL', Lab_Type__c: '海外ラボ', Operation_Status__c: '通常稼働', Monthly_Capacity__c: 500, Current_Processing__c: 320 },
    { Id: L[5], Name: '福岡サテライト', Location__c: '福岡県福岡市', Lab_Type__c: '自社ラボ', Operation_Status__c: '立ち上げ中', Monthly_Capacity__c: 80, Current_Processing__c: 5 }
  ],
  Joint_Research__c: [
    { Id: J[1], Name: '膵がんマルチオミクス', Pharma_Company__c: '武田薬品工業', Status__c: '解析実施中', Budget__c: 5000 },
    { Id: J[2], Name: 'AI支援病理診断開発', Pharma_Company__c: '第一三共', Status__c: 'データ準備', Budget__c: 8000 },
    { Id: J[3], Name: 'RWD活用研究', Pharma_Company__c: '中外製薬', Status__c: '企画中', Budget__c: 3000 },
    { Id: J[4], Name: 'リキッドBx予後予測', Pharma_Company__c: '大塚製薬', Status__c: '倫理審査', Budget__c: 4000 },
    { Id: J[5], Name: 'がんゲノムDB構築', Pharma_Company__c: 'アステラス製薬', Status__c: '完了', Budget__c: 6000 }
  ],

  // ==========================================
  // Salesforce Standard Objects
  // ==========================================

  Account: [
    { Id: ACC[1], Name: '武田薬品工業株式会社', Industry: '製薬', Type: '顧客', Phone: '06-6204-2111', Website: 'https://www.takeda.com', BillingState: '大阪府', BillingCity: '大阪市中央区', NumberOfEmployees: 47000, AnnualRevenue: 4027000, Rating: 'ホット', OwnerId: USR[1] },
    { Id: ACC[2], Name: '第一三共株式会社', Industry: '製薬', Type: '顧客', Phone: '03-6225-1111', Website: 'https://www.daiichisankyo.co.jp', BillingState: '東京都', BillingCity: '中央区', NumberOfEmployees: 17000, AnnualRevenue: 1601000, Rating: 'ホット', OwnerId: USR[2] },
    { Id: ACC[3], Name: '中外製薬株式会社', Industry: '製薬', Type: '顧客', Phone: '03-3273-0881', Website: 'https://www.chugai-pharm.co.jp', BillingState: '東京都', BillingCity: '中央区', NumberOfEmployees: 7700, AnnualRevenue: 1139000, Rating: 'ウォーム', OwnerId: USR[2] },
    { Id: ACC[4], Name: 'アステラス製薬株式会社', Industry: '製薬', Type: '顧客', Phone: '03-3244-3000', Website: 'https://www.astellas.com', BillingState: '東京都', BillingCity: '中央区', NumberOfEmployees: 14500, AnnualRevenue: 1520000, Rating: 'ホット', OwnerId: USR[3] },
    { Id: ACC[5], Name: '大塚製薬株式会社', Industry: '製薬', Type: '見込客', Phone: '03-6717-1400', Website: 'https://www.otsuka.co.jp', BillingState: '東京都', BillingCity: '千代田区', NumberOfEmployees: 5800, AnnualRevenue: 697000, Rating: 'ウォーム', OwnerId: USR[1] },
    { Id: ACC[6], Name: '小野薬品工業株式会社', Industry: '製薬', Type: '見込客', Phone: '06-6263-5670', Website: 'https://www.ono-pharma.com', BillingState: '大阪府', BillingCity: '大阪市中央区', NumberOfEmployees: 3500, AnnualRevenue: 428000, Rating: 'コールド', OwnerId: USR[4] },
    { Id: ACC[7], Name: '塩野義製薬株式会社', Industry: '製薬', Type: '顧客', Phone: '06-6209-7300', Website: 'https://www.shionogi.com', BillingState: '大阪府', BillingCity: '大阪市中央区', NumberOfEmployees: 5600, AnnualRevenue: 428000, Rating: 'ウォーム', OwnerId: USR[2] },
    { Id: ACC[8], Name: 'エーザイ株式会社', Industry: '製薬', Type: 'その他', Phone: '03-3817-5111', Website: 'https://www.eisai.co.jp', BillingState: '東京都', BillingCity: '文京区', NumberOfEmployees: 11000, AnnualRevenue: 756000, Rating: 'コールド', OwnerId: USR[5] },
    { Id: ACC[9], Name: 'ペプチドリーム株式会社', Industry: 'バイオテック', Type: '顧客', Phone: '044-223-6600', Website: 'https://www.peptidream.com', BillingState: '神奈川県', BillingCity: '川崎市', NumberOfEmployees: 300, AnnualRevenue: 18000, Rating: 'ウォーム', OwnerId: USR[2] },
    { Id: ACC[10], Name: 'アムジェン株式会社', Industry: '製薬', Type: '見込客', Phone: '03-5293-8600', Website: 'https://www.amgen.co.jp', BillingState: '東京都', BillingCity: '港区', NumberOfEmployees: 800, AnnualRevenue: 280000, Rating: 'コールド', OwnerId: USR[4] }
  ],

  Contact: [
    { Id: CON[1], LastName: '松田', FirstName: '誠一', Salutation: '様', AccountId: ACC[1], Title: 'オンコロジー事業部 部長', Department: 'オンコロジー事業部', Email: 'matsuda@takeda.co.jp', Phone: '06-6204-2200', LeadSource: '紹介' },
    { Id: CON[2], LastName: '岡田', FirstName: '美咲', Salutation: '様', AccountId: ACC[2], Title: 'R&D戦略部 課長', Department: 'R&D戦略部', Email: 'okada@daiichisankyo.co.jp', Phone: '03-6225-1200', LeadSource: '学会' },
    { Id: CON[3], LastName: '藤田', FirstName: '隆志', Salutation: '様', AccountId: ACC[3], Title: 'バイオマーカー研究部 主任', Department: '研究部', Email: 'fujita@chugai-pharm.co.jp', Phone: '03-3273-0900', LeadSource: '展示会' },
    { Id: CON[4], LastName: '石井', FirstName: '裕介', Salutation: '様', AccountId: ACC[4], Title: '事業開発部 マネージャー', Department: '事業開発部', Email: 'ishii@astellas.com', Phone: '03-3244-3100', LeadSource: '紹介' },
    { Id: CON[5], LastName: '村上', FirstName: '恵子', Salutation: '様', AccountId: ACC[5], Title: 'デジタルヘルス部 課長', Department: 'デジタルヘルス部', Email: 'murakami@otsuka.co.jp', Phone: '03-6717-1500', LeadSource: 'ウェブ' },
    { Id: CON[6], LastName: '三浦', FirstName: '健太', Salutation: '様', AccountId: ACC[7], Title: '創薬化学部 主任研究員', Department: '創薬化学部', Email: 'miura@shionogi.com', Phone: '06-6209-7400', LeadSource: '学会' },
    { Id: CON[7], LastName: '吉田', FirstName: '直樹', Salutation: '様', AccountId: ACC[9], Title: '事業開発部 ディレクター', Department: '事業開発部', Email: 'yoshida@peptidream.com', Phone: '044-223-6700', LeadSource: '紹介' },
    { Id: CON[8], LastName: '田村', FirstName: '亜希子', Salutation: '様', AccountId: ACC[6], Title: 'MA部 課長', Department: 'メディカルアフェアーズ部', Email: 'tamura@ono-pharma.com', Phone: '06-6263-5700', LeadSource: '学会' }
  ],

  Lead: [
    { Id: LEAD[1], LastName: '西村', FirstName: '拓也', Company: 'バイオジェン・ジャパン', Title: 'メディカル部門 部長', Email: 'nishimura@biogen.co.jp', Phone: '03-1234-5678', Status: '新規', LeadSource: '学会', Industry: '製薬', Rating: 'ホット', State: '東京都', IsConverted: false },
    { Id: LEAD[2], LastName: '橋本', FirstName: '理恵', Company: 'ギリアド・サイエンシズ', Title: '事業開発 マネージャー', Email: 'hashimoto@gilead.co.jp', Status: '連絡済', LeadSource: '紹介', Industry: '製薬', Rating: 'ウォーム', IsConverted: false },
    { Id: LEAD[3], LastName: '安田', FirstName: '光男', Company: 'サーモフィッシャーサイエンティフィック', Title: 'NGSソリューション 部長', Email: 'yasuda@thermofisher.co.jp', Status: '認定済み', LeadSource: '展示会', Industry: '医療機器', Rating: 'ホット', IsConverted: false },
    { Id: LEAD[4], LastName: '原田', FirstName: '真由美', Company: 'Guardant Health Japan', Title: 'ビジネスデベロップメント', Email: 'harada@guardanthealth.co.jp', Status: '新規', LeadSource: 'ウェブ', Industry: 'バイオテック', Rating: 'コールド', IsConverted: false },
    { Id: LEAD[5], LastName: '大野', FirstName: '俊介', Company: 'メルクバイオファーマ', Title: 'オンコロジー事業部 課長', Email: 'ono@merck.co.jp', Status: '連絡済', LeadSource: '学会', Industry: '製薬', Rating: 'ウォーム', IsConverted: false }
  ],

  Opportunity: [
    { Id: OPP[1], Name: 'xT解析年間契約 - 武田薬品', AccountId: ACC[1], Amount: 120000000, CloseDate: '2026-03-31', StageName: '交渉/レビュー', Probability: 70, Type: '新規', LeadSource: '紹介', OwnerId: USR[1], IsClosed: false, IsWon: false },
    { Id: OPP[2], Name: 'AIプラットフォーム導入 - 第一三共', AccountId: ACC[2], Amount: 80000000, CloseDate: '2026-06-30', StageName: '提案/見積', Probability: 40, Type: '新規', LeadSource: '学会', OwnerId: USR[2], IsClosed: false, IsWon: false },
    { Id: OPP[3], Name: 'RWDデータ提供 - 中外製薬', AccountId: ACC[3], Amount: 50000000, CloseDate: '2026-02-28', StageName: '成立', Probability: 100, Type: '既存顧客', OwnerId: USR[2], IsClosed: true, IsWon: true },
    { Id: OPP[4], Name: 'GenMine導入支援 - アステラス', AccountId: ACC[4], Amount: 35000000, CloseDate: '2026-04-30', StageName: 'ニーズ分析', Probability: 25, Type: '新規', OwnerId: USR[3], IsClosed: false, IsWon: false },
    { Id: OPP[5], Name: 'リキッドBx共同研究 - 大塚', AccountId: ACC[5], Amount: 200000000, CloseDate: '2026-09-30', StageName: '見込み調査', Probability: 10, Type: '新規', OwnerId: USR[1], IsClosed: false, IsWon: false },
    { Id: OPP[6], Name: 'データ解析更新 - 塩野義', AccountId: ACC[7], Amount: 45000000, CloseDate: '2026-01-31', StageName: '不成立', Probability: 0, Type: '既存顧客', OwnerId: USR[5], IsClosed: true, IsWon: false }
  ],

  Product2: [
    { Id: PROD[1], Name: 'xT 全エクソーム解析', ProductCode: 'XT-001', Family: 'ゲノム解析', IsActive: true, Description: '組織検体からの全エクソーム解析サービス' },
    { Id: PROD[2], Name: 'xF リキッドバイオプシー', ProductCode: 'XF-001', Family: 'ゲノム解析', IsActive: true, Description: '血液検体からのリキッドバイオプシー解析' },
    { Id: PROD[3], Name: 'Tempus Lens', ProductCode: 'LENS-001', Family: 'データプラットフォーム', IsActive: true, Description: 'リアルワールドデータ閲覧プラットフォーム' },
    { Id: PROD[4], Name: 'Tempus Explore', ProductCode: 'EXP-001', Family: 'データプラットフォーム', IsActive: true, Description: 'データ探索・分析プラットフォーム' },
    { Id: PROD[5], Name: 'GenMine標準パネル', ProductCode: 'GM-001', Family: 'ゲノム解析', IsActive: true, Description: 'GenMine標準がん遺伝子パネル検査' }
  ],

  Pricebook2: [
    { Id: PB[1], Name: '標準価格表', IsActive: true, IsStandard: true, Description: '標準価格表' },
    { Id: PB[2], Name: 'アカデミック価格表', IsActive: true, IsStandard: false, Description: '大学・研究機関向け特別価格' }
  ],

  PricebookEntry: [
    { Id: PBE[1], Pricebook2Id: PB[1], Product2Id: PROD[1], UnitPrice: 500000, IsActive: true },
    { Id: PBE[2], Pricebook2Id: PB[1], Product2Id: PROD[2], UnitPrice: 350000, IsActive: true },
    { Id: PBE[3], Pricebook2Id: PB[1], Product2Id: PROD[3], UnitPrice: 12000000, IsActive: true },
    { Id: PBE[4], Pricebook2Id: PB[1], Product2Id: PROD[4], UnitPrice: 8000000, IsActive: true },
    { Id: PBE[5], Pricebook2Id: PB[1], Product2Id: PROD[5], UnitPrice: 460000, IsActive: true }
  ],

  Campaign: [
    { Id: CMP[1], Name: 'JSMO2026展示会', Type: '展示会', Status: '計画中', StartDate: '2026-03-01', EndDate: '2026-03-03', BudgetedCost: 5000000, IsActive: true, OwnerId: USR[6], Description: '日本臨床腫瘍学会学術集会への出展' },
    { Id: CMP[2], Name: 'ゲノム医療Webセミナーシリーズ', Type: 'Webセミナー', Status: '進行中', StartDate: '2026-01-15', EndDate: '2026-06-30', BudgetedCost: 2000000, ActualCost: 800000, IsActive: true, OwnerId: USR[6] },
    { Id: CMP[3], Name: 'リキッドBxキャンペーン2025', Type: 'メール', Status: '完了', StartDate: '2025-10-01', EndDate: '2025-12-31', BudgetedCost: 500000, ActualCost: 450000, IsActive: false, OwnerId: USR[4] }
  ],

  CampaignMember: [
    { Id: CMM[1], CampaignId: CMP[2], ContactId: CON[1], Status: '出席' },
    { Id: CMM[2], CampaignId: CMP[2], ContactId: CON[3], Status: '反応あり' },
    { Id: CMM[3], CampaignId: CMP[2], LeadId: LEAD[1], Status: '送信済' },
    { Id: CMM[4], CampaignId: CMP[3], ContactId: CON[4], Status: '出席' },
    { Id: CMM[5], CampaignId: CMP[3], ContactId: CON[6], Status: '反応あり' },
    { Id: CMM[6], CampaignId: CMP[3], LeadId: LEAD[5], Status: '送信済' }
  ],

  Case: [
    { Id: CASE[1], CaseNumber: 'CS-00001', Subject: 'xTレポート遅延に関する問い合わせ', Status: '進行中', Priority: '高', Origin: 'メール', Type: '技術サポート', AccountId: ACC[1], ContactId: CON[1], OwnerId: USR[1], IsClosed: false, IsEscalated: false },
    { Id: CASE[2], CaseNumber: 'CS-00002', Subject: 'Tempus Lensアクセス権限設定', Status: '新規', Priority: '中', Origin: '電話', Type: '技術サポート', AccountId: ACC[4], ContactId: CON[4], OwnerId: USR[3], IsClosed: false, IsEscalated: false },
    { Id: CASE[3], CaseNumber: 'CS-00003', Subject: 'GenMineレポートフォーマット変更依頼', Status: 'クローズ', Priority: '低', Origin: 'ウェブ', Type: '機能リクエスト', AccountId: ACC[3], ContactId: CON[3], OwnerId: USR[2], IsClosed: true, IsEscalated: false, ClosedDate: '2025-12-15' },
    { Id: CASE[4], CaseNumber: 'CS-00004', Subject: '請求金額の不一致', Status: 'エスカレーション中', Priority: '高', Origin: 'メール', Type: '請求', AccountId: ACC[7], ContactId: CON[6], OwnerId: USR[5], IsClosed: false, IsEscalated: true }
  ],

  Task: [
    { Id: TASK[1], Subject: '武田薬品 契約書ドラフト作成', Status: '進行中', Priority: '高', ActivityDate: '2026-02-28', WhoId: CON[1], WhatId: OPP[1], OwnerId: USR[1], Description: '年間契約書のドラフトを作成して法務確認' },
    { Id: TASK[2], Subject: '第一三共 提案資料準備', Status: '未着手', Priority: '中', ActivityDate: '2026-03-05', WhoId: CON[2], WhatId: OPP[2], OwnerId: USR[2] },
    { Id: TASK[3], Subject: 'バイオジェン初回コンタクト', Status: '未着手', Priority: '高', ActivityDate: '2026-02-25', WhoId: LEAD[1], OwnerId: USR[1] },
    { Id: TASK[4], Subject: '中外製薬 導入後フォローアップ', Status: '完了', Priority: '中', ActivityDate: '2026-02-20', WhoId: CON[3], WhatId: OPP[3], OwnerId: USR[2] },
    { Id: TASK[5], Subject: 'ケース対応: レポート遅延', Status: '進行中', Priority: '高', ActivityDate: '2026-02-24', WhoId: CON[1], WhatId: CASE[1], OwnerId: USR[1] },
    { Id: TASK[6], Subject: 'JSMO展示会ブース設計', Status: '未着手', Priority: '中', ActivityDate: '2026-02-28', WhatId: CMP[1], OwnerId: USR[6] },
    { Id: TASK[7], Subject: 'アステラス GenMineデモ準備', Status: '進行中', Priority: '中', ActivityDate: '2026-03-01', WhoId: CON[4], WhatId: OPP[4], OwnerId: USR[3] },
    { Id: TASK[8], Subject: 'Webセミナー 次回テーマ選定', Status: '待機中', Priority: '低', ActivityDate: '2026-03-15', WhatId: CMP[2], OwnerId: USR[6] }
  ],

  Event: [
    { Id: EVT[1], Subject: '武田薬品 契約交渉ミーティング', StartDateTime: '2026-03-05T10:00:00', EndDateTime: '2026-03-05T11:30:00', Location: '武田薬品 東京オフィス', WhoId: CON[1], WhatId: OPP[1], OwnerId: USR[1], IsAllDayEvent: false },
    { Id: EVT[2], Subject: '第一三共 AIプラットフォームデモ', StartDateTime: '2026-03-10T14:00:00', EndDateTime: '2026-03-10T16:00:00', Location: 'オンライン (Zoom)', WhoId: CON[2], WhatId: OPP[2], OwnerId: USR[2], IsAllDayEvent: false },
    { Id: EVT[3], Subject: 'JSMO2026学術集会', StartDateTime: '2026-03-01T09:00:00', EndDateTime: '2026-03-03T18:00:00', Location: '東京ビッグサイト', WhatId: CMP[1], OwnerId: USR[6], IsAllDayEvent: true },
    { Id: EVT[4], Subject: 'ゲノム医療Webセミナー Vol.3', StartDateTime: '2026-03-15T18:00:00', EndDateTime: '2026-03-15T19:30:00', Location: 'オンライン', WhatId: CMP[2], OwnerId: USR[7], IsAllDayEvent: false },
    { Id: EVT[5], Subject: 'アステラス GenMine導入キックオフ', StartDateTime: '2026-04-01T10:00:00', EndDateTime: '2026-04-01T12:00:00', Location: 'アステラス 本社', WhoId: CON[4], WhatId: OPP[4], OwnerId: USR[3], IsAllDayEvent: false }
  ],

  OpportunityLineItem: [
    { Id: OLI[1], OpportunityId: OPP[1], Product2Id: PROD[1], Quantity: 200, UnitPrice: 500000, TotalPrice: 100000000 },
    { Id: OLI[2], OpportunityId: OPP[1], Product2Id: PROD[2], Quantity: 40, UnitPrice: 350000, TotalPrice: 14000000 },
    { Id: OLI[3], OpportunityId: OPP[2], Product2Id: PROD[3], Quantity: 1, UnitPrice: 48000000, TotalPrice: 48000000 },
    { Id: OLI[4], OpportunityId: OPP[4], Product2Id: PROD[5], Quantity: 50, UnitPrice: 460000, TotalPrice: 23000000 }
  ],

  OpportunityContactRole: [
    { Id: OCR[1], OpportunityId: OPP[1], ContactId: CON[1], Role: '意思決定者', IsPrimary: true },
    { Id: OCR[2], OpportunityId: OPP[2], ContactId: CON[2], Role: '評価者', IsPrimary: true },
    { Id: OCR[3], OpportunityId: OPP[3], ContactId: CON[3], Role: 'ビジネスユーザー', IsPrimary: true },
    { Id: OCR[4], OpportunityId: OPP[4], ContactId: CON[4], Role: '技術バイヤー', IsPrimary: true }
  ],

  Quote: [
    { Id: QUO[1], Name: '武田薬品 年間解析契約見積', OpportunityId: OPP[1], Status: '提示済', ExpirationDate: '2026-03-31', Subtotal: 114000000, Discount: 5, TotalPrice: 108300000, Tax: 10830000, GrandTotal: 119130000, ContactId: CON[1], BillingState: '大阪府' },
    { Id: QUO[2], Name: '第一三共 AIプラットフォーム見積', OpportunityId: OPP[2], Status: 'ドラフト', ExpirationDate: '2026-06-30', Subtotal: 80000000, TotalPrice: 80000000, Tax: 8000000, GrandTotal: 88000000, ContactId: CON[2], BillingState: '東京都' },
    { Id: QUO[3], Name: 'アステラス GenMine見積', OpportunityId: OPP[4], Status: '承認済', ExpirationDate: '2026-04-30', Subtotal: 35000000, Discount: 10, TotalPrice: 31500000, Tax: 3150000, GrandTotal: 34650000, ContactId: CON[4], BillingState: '東京都' }
  ],

  QuoteLineItem: [
    { Id: QLI[1], QuoteId: QUO[1], Product2Id: PROD[1], Quantity: 200, UnitPrice: 500000, TotalPrice: 100000000 },
    { Id: QLI[2], QuoteId: QUO[1], Product2Id: PROD[2], Quantity: 40, UnitPrice: 350000, TotalPrice: 14000000 },
    { Id: QLI[3], QuoteId: QUO[2], Product2Id: PROD[3], Quantity: 1, UnitPrice: 80000000, TotalPrice: 80000000 },
    { Id: QLI[4], QuoteId: QUO[3], Product2Id: PROD[5], Quantity: 50, UnitPrice: 460000, TotalPrice: 23000000 }
  ],

  Contract: [
    { Id: CTR[1], ContractNumber: 'CN-00001', AccountId: ACC[3], Status: '有効', StartDate: '2026-01-01', EndDate: '2026-12-31', ContractTerm: 12, Description: 'RWDデータ提供年間契約', OwnerId: USR[2] },
    { Id: CTR[2], ContractNumber: 'CN-00002', AccountId: ACC[4], Status: 'ドラフト', StartDate: '2026-04-01', EndDate: '2027-03-31', ContractTerm: 12, Description: 'GenMine導入年間契約', OwnerId: USR[3] },
    { Id: CTR[3], ContractNumber: 'CN-00003', AccountId: ACC[1], Status: '承認プロセス中', StartDate: '2026-04-01', EndDate: '2027-03-31', ContractTerm: 12, Description: 'xT/xF年間解析契約', OwnerId: USR[1] }
  ],

  Order: [
    { Id: ORD[1], OrderNumber: 'ORD-00001', AccountId: ACC[3], ContractId: CTR[1], OpportunityId: OPP[3], Status: '有効', EffectiveDate: '2026-01-01', EndDate: '2026-12-31', TotalAmount: 50000000, BillingState: '東京都', OwnerId: USR[2] },
    { Id: ORD[2], OrderNumber: 'ORD-00002', AccountId: ACC[4], Status: 'ドラフト', EffectiveDate: '2026-04-01', TotalAmount: 35000000, BillingState: '東京都', OwnerId: USR[3] }
  ],

  OrderItem: [
    { Id: OI[1], OrderId: ORD[1], Product2Id: PROD[3], Quantity: 1, UnitPrice: 12000000, TotalPrice: 12000000 },
    { Id: OI[2], OrderId: ORD[1], Product2Id: PROD[4], Quantity: 1, UnitPrice: 8000000, TotalPrice: 8000000 },
    { Id: OI[3], OrderId: ORD[2], Product2Id: PROD[5], Quantity: 50, UnitPrice: 460000, TotalPrice: 23000000 }
  ],

  User: [
    { Id: USR[1], Username: 'suzuki.ichiro@sbtempus.co.jp', LastName: '鈴木', FirstName: '一郎', Email: 'suzuki.ichiro@sbtempus.co.jp', Title: '営業部 アカウントエグゼクティブ', Department: '営業部', IsActive: true, ProfileId: 'Sales_Rep', UserRoleId: 'Sales_Rep', Alias: 'isuzuki' },
    { Id: USR[2], Username: 'tanaka.hanako@sbtempus.co.jp', LastName: '田中', FirstName: '花子', Email: 'tanaka.hanako@sbtempus.co.jp', Title: '営業部 シニアAE', Department: '営業部', IsActive: true, ProfileId: 'Sales_Rep', UserRoleId: 'Sales_Rep', Alias: 'htanaka' },
    { Id: USR[3], Username: 'sato.kenta@sbtempus.co.jp', LastName: '佐藤', FirstName: '健太', Email: 'sato.kenta@sbtempus.co.jp', Title: '営業部 AE', Department: '営業部', IsActive: true, ProfileId: 'Sales_Rep', UserRoleId: 'Sales_Rep', Alias: 'ksato' },
    { Id: USR[4], Username: 'yamamoto.yuko@sbtempus.co.jp', LastName: '山本', FirstName: '優子', Email: 'yamamoto.yuko@sbtempus.co.jp', Title: '営業部 AE', Department: '営業部', IsActive: true, ProfileId: 'Sales_Rep', UserRoleId: 'Sales_Rep', Alias: 'yyama' },
    { Id: USR[5], Username: 'watanabe.shota@sbtempus.co.jp', LastName: '渡辺', FirstName: '翔太', Email: 'watanabe.shota@sbtempus.co.jp', Title: '営業部 AE', Department: '営業部', IsActive: true, ProfileId: 'Sales_Rep', UserRoleId: 'Sales_Rep', Alias: 'swata' },
    { Id: USR[6], Username: 'ito.mari@sbtempus.co.jp', LastName: '伊藤', FirstName: '真理', Email: 'ito.mari@sbtempus.co.jp', Title: 'MSL', Department: 'メディカル部', IsActive: true, ProfileId: 'MSL', UserRoleId: 'MSL', Alias: 'mito' },
    { Id: USR[7], Username: 'nakamura.daisuke@sbtempus.co.jp', LastName: '中村', FirstName: '大介', Email: 'nakamura.daisuke@sbtempus.co.jp', Title: 'MSL', Department: 'メディカル部', IsActive: true, ProfileId: 'MSL', UserRoleId: 'MSL', Alias: 'dnaka' },
    { Id: USR[8], Username: 'admin@sbtempus.co.jp', LastName: '管理者', FirstName: 'システム', Email: 'admin@sbtempus.co.jp', Title: 'システム管理者', Department: 'IT部', IsActive: true, ProfileId: 'System_Admin', UserRoleId: 'CEO', Alias: 'admin' }
  ],

  Note: [
    { Id: NOTE[1], Title: '武田薬品 面談メモ', Body: '先方のニーズは全エクソーム解析200件/年。予算確保済み。Q2までに契約締結希望。', ParentId: ACC[1], OwnerId: USR[1], IsPrivate: false },
    { Id: NOTE[2], Title: 'バイオジェン 初期調査', Body: 'CNS領域に強み。ゲノム解析に関心あり。まずはリキッドバイオプシーから提案。', ParentId: LEAD[1], OwnerId: USR[1], IsPrivate: false },
    { Id: NOTE[3], Title: 'ケース対応記録', Body: 'レポート遅延の原因はQC再実施。顧客に3日遅延を連絡済み。', ParentId: CASE[1], OwnerId: USR[1], IsPrivate: true },
    { Id: NOTE[4], Title: 'JSMO展示会 準備リスト', Body: 'ブースデザイン確認、パンフレット500部印刷、デモ環境準備、名刺500枚', ParentId: CMP[1], OwnerId: USR[6], IsPrivate: false }
  ],

  Broker__c: [
    { Id: BRK[1], Name: 'Caroline Kingsley', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'caroline@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/caroline_kingsley.jpg', Broker_Id__c: 1 },
    { Id: BRK[2], Name: 'Michael Jones', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'michael@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/michael_jones.jpg', Broker_Id__c: 2 },
    { Id: BRK[3], Name: 'Jonathan Bradley', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'jonathan@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/jonathan_bradley.jpg', Broker_Id__c: 3 },
    { Id: BRK[4], Name: 'Jennifer Wu', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'jen@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/jennifer_wu.jpg', Broker_Id__c: 4 },
    { Id: BRK[5], Name: 'Olivia Green', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'olivia@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/olivia_green.jpg', Broker_Id__c: 5 },
    { Id: BRK[6], Name: 'Miriam Aupont', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'miriam@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/miriam_aupont.jpg', Broker_Id__c: 6 },
    { Id: BRK[7], Name: 'Michelle Lambert', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'michelle@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/michelle_lambert.jpg', Broker_Id__c: 7 },
    { Id: BRK[8], Name: 'Victor Ochoa', Title__c: 'Senior Broker', Phone__c: '617-244-3672', Mobile_Phone__c: '617-244-3672', Email__c: 'victor@dreamhouse.demo', Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/people/victor_ochoa.jpg', Broker_Id__c: 8 }
  ],

  Property__c: [
    { Id: PROP[1], Name: 'Stunning Victorian', Address__c: '18 Henry St', City__c: 'Cambridge', State__c: 'MA', Zip__c: '01742', Price__c: 975000, Beds__c: 4, Baths__c: 3, Status__c: 'Available', Tags__c: 'victorian', Broker__c: BRK[1], Latitude__c: 42.35663, Longitude__c: -71.11095, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/18702702_sm.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/18702702_sm.jpg', Date_Listed__c: '2025-12-01' },
    { Id: PROP[2], Name: 'Ultimate Sophistication', Address__c: '24 Pearl St', City__c: 'Cambridge', State__c: 'MA', Zip__c: '02420', Price__c: 1200000, Beds__c: 5, Baths__c: 4, Status__c: 'Contracted', Tags__c: 'colonial', Broker__c: BRK[2], Latitude__c: 42.359103, Longitude__c: -71.10869, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702702_sm.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702702_sm.jpg', Date_Listed__c: '2025-11-15', Date_Contracted__c: '2025-12-20' },
    { Id: PROP[3], Name: 'Stunning Colonial', Address__c: '32 Prince St', City__c: 'Cambridge', State__c: 'MA', Zip__c: '02420', Price__c: 930000, Beds__c: 5, Baths__c: 4, Status__c: 'Available', Tags__c: 'colonial', Broker__c: BRK[4], Latitude__c: 42.360642, Longitude__c: -71.110448, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702666_sm.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702666_sm.jpg', Date_Listed__c: '2025-11-20' },
    { Id: PROP[4], Name: 'Heart of Harvard Square', Address__c: '48 Brattle St', City__c: 'Cambridge', State__c: 'MA', Zip__c: '02420', Price__c: 450000, Beds__c: 5, Baths__c: 4, Status__c: 'Under Agreement', Tags__c: 'victorian', Broker__c: BRK[8], Latitude__c: 42.374117, Longitude__c: -71.121653, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702738_sm.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702738_sm.jpg', Date_Listed__c: '2025-10-01' },
    { Id: PROP[5], Name: 'Modern City Living', Address__c: '72 Francis St', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 825000, Beds__c: 5, Baths__c: 4, Status__c: 'Pre Market', Tags__c: 'contemporary', Broker__c: BRK[3], Latitude__c: 42.335435, Longitude__c: -71.106827, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702714_sm.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702714_sm.jpg', Date_Listed__c: '2025-12-10' },
    { Id: PROP[6], Name: 'Architectural Details', Address__c: '95 Gloucester St', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 690000, Beds__c: 3, Baths__c: 3, Status__c: 'Available', Tags__c: 'contemporary', Broker__c: BRK[3], Latitude__c: 42.349693, Longitude__c: -71.084407, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702608_sm.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702608_sm.jpg', Date_Listed__c: '2025-11-05' },
    { Id: PROP[7], Name: 'Waterfront in the City', Address__c: '110 Baxter Street', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 850000, Beds__c: 3, Baths__c: 2, Status__c: 'Closed', Tags__c: 'contemporary', Broker__c: BRK[5], Latitude__c: 42.368168, Longitude__c: -71.084454, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702618_sm.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702618_sm.jpg', Date_Listed__c: '2025-09-01', Date_Closed__c: '2025-12-15' },
    { Id: PROP[8], Name: 'Seaport District Retreat', Address__c: '121 Harborwalk', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 450000, Beds__c: 3, Baths__c: 3, Status__c: 'Available', Tags__c: 'contemporary', Broker__c: BRK[1], Latitude__c: 42.35695, Longitude__c: -71.049327, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702636_sm.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702636_sm.jpg', Date_Listed__c: '2025-11-10' },
    { Id: PROP[9], Name: 'City Living', Address__c: '127 Endicott St', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 450000, Beds__c: 3, Baths__c: 1, Status__c: 'Available', Tags__c: 'colonial', Broker__c: BRK[7], Latitude__c: 42.365003, Longitude__c: -71.057352, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702660_sm.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702660_sm.jpg', Date_Listed__c: '2025-10-20' },
    { Id: PROP[10], Name: 'Contemporary Luxury', Address__c: '145 Commonwealth Ave', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 845000, Beds__c: 4, Baths__c: 3, Status__c: 'Available', Tags__c: 'contemporary', Broker__c: BRK[4], Latitude__c: 42.352466, Longitude__c: -71.075311, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702690_sm.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702690_sm.jpg', Date_Listed__c: '2025-11-25' },
    { Id: PROP[11], Name: 'Quiet Retreat', Address__c: '448 Hanover St', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 725000, Beds__c: 4, Baths__c: 2, Status__c: 'Contracted', Tags__c: 'colonial', Broker__c: BRK[6], Latitude__c: 42.366855, Longitude__c: -71.052617, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702726_sm.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702726_sm.jpg', Date_Listed__c: '2025-10-15', Date_Contracted__c: '2025-12-05' },
    { Id: PROP[12], Name: 'Contemporary City Living', Address__c: '640 Harrison Ave', City__c: 'Boston', State__c: 'MA', Zip__c: '02420', Price__c: 650000, Beds__c: 2, Baths__c: 2, Status__c: 'Available', Tags__c: 'contemporary', Broker__c: BRK[2], Latitude__c: 42.339892, Longitude__c: -71.068781, Picture__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702648_sm.jpg', Thumbnail__c: 'https://s3-us-west-2.amazonaws.com/dev-or-devrl-s3-bucket/sample-apps/photo/702648_sm.jpg', Date_Listed__c: '2025-12-05' }
  ],

  Bento_Order__c: [
    { Id: BNT[1], Name: 'がん遺伝子パネル実践 弁当', Seminar__c: S[4], Order_Date__c: '2025-11-28', Delivery_Time__c: '11:30', Quantity__c: 40, Menu_Type__c: '幕の内', Vendor__c: '叙々苑弁当', Amount__c: 60000, Status__c: '配達済' },
    { Id: BNT[2], Name: '液体バイオプシー講演会 弁当', Seminar__c: S[2], Order_Date__c: '2026-02-17', Delivery_Time__c: '12:00', Quantity__c: 80, Menu_Type__c: '松花堂', Vendor__c: 'なだ万', Amount__c: 160000, Status__c: '手配済' },
    { Id: BNT[3], Name: '精密医療の未来 弁当', Seminar__c: S[8], Order_Date__c: '2026-03-02', Delivery_Time__c: '12:00', Quantity__c: 50, Menu_Type__c: '洋食', Vendor__c: 'パレスホテル', Amount__c: 125000, Status__c: '未手配' },
    { Id: BNT[4], Name: 'リキッドバイオプシー実践 軽食', Seminar__c: S[6], Order_Date__c: '2025-10-18', Delivery_Time__c: '15:00', Quantity__c: 25, Menu_Type__c: 'サンドイッチ', Vendor__c: 'DEAN & DELUCA', Amount__c: 37500, Status__c: '配達済' },
    { Id: BNT[5], Name: '次世代シーケンスセミナー 特別食', Seminar__c: S[1], Order_Date__c: '2026-01-13', Quantity__c: 0, Menu_Type__c: 'サンドイッチ', Status__c: 'キャンセル', Notes__c: 'オンライン開催のため不要' },
    { Id: BNT[6], Name: '地域連携ゲノム医療 弁当', Seminar__c: S[7], Order_Date__c: '2026-01-28', Delivery_Time__c: '11:45', Quantity__c: 60, Menu_Type__c: '幕の内', Vendor__c: '美濃吉', Amount__c: 90000, Status__c: '未手配' }
  ],
  Seminar_Attendee__c: [
    { Id: SA[1], Name: '山田太郎', Seminar__c: S[4], Email__c: 'yamada@todai.ac.jp', Affiliation__c: '東京大学医学部附属病院', Specialty__c: '腫瘍内科', Registration_Date__c: '2025-11-20', Attendance_Status__c: '出席' },
    { Id: SA[2], Name: '高橋美咲', Seminar__c: S[4], Email__c: 'takahashi@yokohama-cu.ac.jp', Affiliation__c: '横浜市立大学附属病院', Specialty__c: '消化器内科', Registration_Date__c: '2025-11-22', Attendance_Status__c: '出席' },
    { Id: SA[3], Name: '佐藤花子', Seminar__c: S[4], Email__c: 'sato@oici.jp', Affiliation__c: '大阪国際がんセンター', Specialty__c: '病理診断科', Registration_Date__c: '2025-11-25', Attendance_Status__c: '欠席' },
    { Id: SA[4], Name: '渡辺隆', Seminar__c: S[5], Email__c: 'watanabe@ncc.go.jp', Affiliation__c: '国立がん研究センター', Specialty__c: '腫瘍内科', Registration_Date__c: '2025-11-01', Attendance_Status__c: '出席' },
    { Id: SA[5], Name: '伊藤裕子', Seminar__c: S[5], Email__c: 'ito@keio.ac.jp', Affiliation__c: '慶應義塾大学病院', Specialty__c: '遺伝診療科', Registration_Date__c: '2025-11-03', Attendance_Status__c: '出席' },
    { Id: SA[6], Name: '中村誠', Seminar__c: S[2], Email__c: 'nakamura@kyushu-u.ac.jp', Affiliation__c: '九州大学病院', Specialty__c: '腫瘍内科', Registration_Date__c: '2026-01-10', Attendance_Status__c: '登録済' },
    { Id: SA[7], Name: '清水由美', Seminar__c: S[2], Email__c: 'shimizu@keio.ac.jp', Affiliation__c: '慶應義塾大学病院', Specialty__c: '腫瘍内科', Registration_Date__c: '2026-01-15', Attendance_Status__c: '登録済' },
    { Id: SA[8], Name: '井上健太郎', Seminar__c: S[2], Email__c: 'inoue@kyoto-u.ac.jp', Affiliation__c: '京都大学医学部附属病院', Specialty__c: '病理診断科', Registration_Date__c: '2026-01-20', Attendance_Status__c: '登録済' },
    { Id: SA[9], Name: '木村彩', Seminar__c: S[1], Email__c: 'kimura@kyushu-u.ac.jp', Affiliation__c: '九州大学病院', Specialty__c: '腫瘍内科', Registration_Date__c: '2025-12-20', Attendance_Status__c: '登録済' },
    { Id: SA[10], Name: '田中次郎', Seminar__c: S[6], Email__c: 'tanaka@todai.ac.jp', Affiliation__c: '東京大学医学部附属病院', Specialty__c: '呼吸器内科', Registration_Date__c: '2025-10-10', Attendance_Status__c: '出席' },
    { Id: SA[11], Name: '松本恵', Seminar__c: S[6], Email__c: 'matsumoto@juntendo.ac.jp', Affiliation__c: '順天堂大学病院', Specialty__c: '乳腺外科', Registration_Date__c: '2025-10-12', Attendance_Status__c: '出席' },
    { Id: SA[12], Name: '林大介', Seminar__c: S[7], Email__c: 'hayashi@kyoto-u.ac.jp', Affiliation__c: '京都大学医学部附属病院', Specialty__c: '外科', Registration_Date__c: '2026-01-08', Attendance_Status__c: '登録済' }
  ],
  ContentDocument: [
    { Id: CD[1], Title: 'xT解析サービス概要資料', FileType: 'pdf', ContentSize: 2500000, Description: 'xT全エクソーム解析サービスの紹介資料', OwnerId: USR[1], ParentId: PROD[1], CreatedDate: '2025-12-01' },
    { Id: CD[2], Title: '武田薬品 提案書v2', FileType: 'pptx', ContentSize: 15000000, Description: '年間契約提案プレゼンテーション', OwnerId: USR[1], ParentId: OPP[1], CreatedDate: '2026-01-15' },
    { Id: CD[3], Title: 'GenMine標準パネル仕様書', FileType: 'pdf', ContentSize: 800000, Description: 'GenMine標準がん遺伝子パネル検査の技術仕様書', OwnerId: USR[7], ParentId: PROD[5], CreatedDate: '2025-11-20' }
  ],

  Testing_Order__c: [
    { Id: TO[1], Name: 'TO-00001', Specimen__c: SP[1], Doctor__c: D[1], Institution__c: MI[1], Order_Date__c: '2026-02-06', Panel__c: 'genmine TOP', Status__c: '検査中', Priority__c: '通常', Reviewer__c: USR[7], US_Review_Status__c: '未送信', TAT_Days__c: 8, OwnerId: USR[5] },
    { Id: TO[2], Name: 'TO-00002', Specimen__c: SP[2], Doctor__c: D[1], Institution__c: MI[1], Order_Date__c: '2026-01-29', Panel__c: 'genmine TOP', Status__c: '完了', Priority__c: '通常', Reviewer__c: USR[7], US_Review_Status__c: 'US承認', Report_Date__c: '2026-02-10', TAT_Days__c: 12, OwnerId: USR[5] },
    { Id: TO[3], Name: 'TO-00003', Specimen__c: SP[3], Doctor__c: D[2], Institution__c: MI[2], Order_Date__c: '2026-02-12', Panel__c: 'genmine TOP', Status__c: '検体待ち', Priority__c: '通常', US_Review_Status__c: '未送信', TAT_Days__c: 3, OwnerId: USR[6] },
    { Id: TO[4], Name: 'TO-00004', Specimen__c: SP[4], Doctor__c: D[3], Institution__c: MI[3], Order_Date__c: '2026-02-15', Panel__c: 'genmine TOP', Status__c: '受付', Priority__c: '通常', US_Review_Status__c: '未送信', TAT_Days__c: 1, OwnerId: USR[6] },
    { Id: TO[5], Name: 'TO-00005', Specimen__c: SP[5], Doctor__c: D[4], Institution__c: MI[4], Order_Date__c: '2026-02-01', Panel__c: 'genmine TOP', Status__c: 'レビュー中', Priority__c: '緊急', Reviewer__c: USR[7], US_Review_Status__c: 'US審査中', TAT_Days__c: 18, OwnerId: USR[5] },
    { Id: TO[6], Name: 'TO-00006', Specimen__c: SP[6], Doctor__c: D[5], Institution__c: MI[1], Order_Date__c: '2026-02-18', Panel__c: 'genmine TOP', Status__c: '受付', Priority__c: '通常', US_Review_Status__c: '未送信', TAT_Days__c: 0, OwnerId: USR[5] },
    { Id: TO[7], Name: 'TO-00007', Specimen__c: SP[7], Doctor__c: D[11], Institution__c: MI[8], Order_Date__c: '2026-02-04', Panel__c: 'genmine TOP', Status__c: 'レポート作成', Priority__c: '通常', Reviewer__c: USR[8], US_Review_Status__c: 'US審査中', TAT_Days__c: 14, OwnerId: USR[6] },
    { Id: TO[8], Name: 'TO-00008', Specimen__c: SP[8], Doctor__c: D[6], Institution__c: MI[2], Order_Date__c: '2026-01-26', Panel__c: 'genmine TOP', Status__c: '完了', Priority__c: '通常', Reviewer__c: USR[7], US_Review_Status__c: 'US承認', Report_Date__c: '2026-02-05', TAT_Days__c: 10, OwnerId: USR[5] },
    { Id: TO[9], Name: 'TO-00009', Specimen__c: SP[9], Doctor__c: D[10], Institution__c: MI[4], Order_Date__c: '2026-02-10', Panel__c: 'genmine TOP', Status__c: '検査中', Priority__c: '通常', US_Review_Status__c: '未送信', TAT_Days__c: 6, OwnerId: USR[6] },
    { Id: TO[10], Name: 'TO-00010', Specimen__c: SP[10], Doctor__c: D[12], Institution__c: MI[1], Order_Date__c: '2026-01-17', Panel__c: 'genmine TOP', Status__c: '完了', Priority__c: '緊急', Reviewer__c: USR[7], US_Review_Status__c: 'US承認', Report_Date__c: '2026-01-28', TAT_Days__c: 11, OwnerId: USR[5] }
  ],

  Daily_Report__c: [
    { Id: DR[1], Name: 'DR-0001', Report_Date__c: '2026-02-21', Report_Type__c: 'MR日報', Visit_Summary__c: 3, Key_Activities__c: '1. 東大病院 山田教授 定期訪問（45分）\n2. がん研有明 検体回収\n3. 社内MTG（商談レビュー）', Key_Findings__c: '佐藤教授からEGFR uncommon mutationが増加傾向との指摘。genmine TOPの324遺伝子パネルの優位性をアピールできる機会。', Issues__c: '阪大の中村医長へのフォローが遅れている。F1CDxとの比較データの準備が必要。', Tomorrow_Plan__c: 'AM: 国立がんセンター 田村准教授 訪問\nPM: 社内ミーティング（月次KPIレビュー）', Approval_Status__c: '提出済', OwnerId: USR[2] },
    { Id: DR[2], Name: 'DR-0002', Report_Date__c: '2026-02-21', Report_Type__c: 'MSL日報', Visit_Summary__c: 2, Key_Activities__c: '1. 油谷先生チーム レビュー会議参加（60分）\n2. genmine TOP社内トレーニング フォローアップ', Key_Findings__c: '油谷先生が共同研究JR001の暫定解析結果に言及。EGFR uncommon mutationが予想以上に高頻度（8.3%）。', Issues__c: '4/5の血液がん学術講演会の会場手配が未確定。帝国ホテル孔雀の間の仮予約期限が3/1。', Tomorrow_Plan__c: 'AM: SM002の事前準備\nPM: 木村教授とSM006の講演内容打ち合わせ', Approval_Status__c: '提出済', OwnerId: USR[4] },
    { Id: DR[3], Name: 'DR-0003', Report_Date__c: '2026-02-20', Report_Type__c: 'MR日報', Visit_Summary__c: 2, Key_Activities__c: '1. 名古屋大学 渡辺教授 訪問（40分）\n2. アステラス 高木マネージャー オンライン会議（30分）', Key_Findings__c: '渡辺教授は膵臓がんでのCGP活用に前向き。名大病院での導入検討の可能性。', Issues__c: '名大病院の導入は倫理委員会手続きが必要。アステラスのパイロット提案は価格設定の調整が必要。', Tomorrow_Plan__c: 'AM: 社内営業ミーティング\nPM: エーザイ 森マネージャー 初回訪問', Approval_Status__c: '承認済', Approved_By__c: USR[1], Approval_Date__c: '2026-02-20', Approval_Comment__c: '名大の導入検討は良い動き。受託解析の提案書を来週中に作成してください。', OwnerId: USR[3] },
    { Id: DR[4], Name: 'DR-0004', Report_Date__c: '2026-02-20', Report_Type__c: 'MR日報', Visit_Summary__c: 4, Key_Activities__c: '1. 第一三共 最終条件交渉\n2. 中外製薬 フォローアップ\n3. 武田薬品 共同研究スキーム提案\n4. 社内法務部との契約書確認', Key_Findings__c: '第一三共案件が大きく前進。3月末の取締役会で最終承認予定。', Issues__c: '第一三共の契約書ドラフトを法務部に確認依頼済み。中外の英語版提案書はマーケティング部の支援が必要。', Tomorrow_Plan__c: 'AM: 第一三共 契約書ドラフト確認\nPM: 社内法務部との打ち合わせ', Approval_Status__c: '承認済', Approved_By__c: USR[7], Approval_Date__c: '2026-02-20', Approval_Comment__c: '第一三共の進捗は素晴らしい。契約条件の最終確認を慎重に。', OwnerId: USR[1] },
    { Id: DR[5], Name: 'DR-0005', Report_Date__c: '2026-02-19', Report_Type__c: 'ラボ日報', Visit_Summary__c: 0, Key_Activities__c: '1. 検体QC実施: SP-2026-0003（乳がんFFPE）\n2. SP-2026-0001 解析結果レビュー\n3. 名古屋提携ラボ立ち上げ進捗確認', Key_Findings__c: '今月の検体受領ペースが先月比20%増。東京ラボのキャパシティに対して現在245件稼働中。', Issues__c: 'SP-2026-0003の腫瘍含有率が低い（15%）。名古屋ラボの立ち上げが1週間遅延。', Tomorrow_Plan__c: 'AM: SP-2026-0004, SP-2026-0006のQC実施\nPM: 月次ラボ稼働率レポート作成', Approval_Status__c: '承認済', Approved_By__c: USR[4], Approval_Date__c: '2026-02-19', Approval_Comment__c: 'キャパシティ状況を注視。大阪への振り分け基準を来週のMTGで検討しましょう。', OwnerId: USR[5] },
    { Id: DR[6], Name: 'DR-0006', Report_Date__c: '2026-02-22', Report_Type__c: 'MR日報', Visit_Summary__c: 2, Key_Activities__c: '1. SM002 準備作業（資料最終確認・弁当手配確認）\n2. SM006 企画ミーティング参加', Key_Findings__c: 'SM002は準備完了。田村先生の講演は具体的症例が含まれ参加者の関心を引けるはず。', Issues__c: 'SM006の会場費が予算超過の可能性。日本血液学会との共催手続きが未完了。', Tomorrow_Plan__c: '終日: SM002（がんセンター勉強会）の当日運営サポート', Approval_Status__c: '下書き', OwnerId: USR[2] }
  ],

  Approval_Request__c: [
    { Id: AR[1], Name: 'SM006 学術講演会 予算承認', Request_Type__c: '勉強会予算', Related_Object__c: 'Seminar__c', Related_Record_Id__c: S[6], Amount__c: 2500000, Status__c: '承認待ち', Priority__c: '高', Requested_By__c: USR[4], Approver__c: USR[7], Submitted_Date__c: '2026-02-20' },
    { Id: AR[2], Name: '第一三共 契約条件 最終承認', Request_Type__c: '製薬商談', Related_Object__c: 'Pharma_Opportunity__c', Related_Record_Id__c: O[1], Amount__c: 180000000, Status__c: '承認済', Priority__c: '高', Requested_By__c: USR[1], Approver__c: USR[8], Submitted_Date__c: '2026-02-18', Approved_Date__c: '2026-02-19', Approver_Comment__c: '条件は妥当。契約書の法務チェック完了後、速やかに締結を。' },
    { Id: AR[3], Name: 'JSMO 2026 出張申請（佐藤）', Request_Type__c: '出張申請', Amount__c: 85000, Description__c: 'JSMO 2026 出席のための出張申請。参加費¥35,000、日当¥9,000、その他¥41,000', Status__c: '承認済', Priority__c: '中', Requested_By__c: USR[2], Approver__c: USR[1], Submitted_Date__c: '2026-02-15', Approved_Date__c: '2026-02-15', Approver_Comment__c: '承認。ブースでのリード獲得目標を設定してください。' },
    { Id: AR[4], Name: '阪大 勉強会 弁当経費', Request_Type__c: '経費精算', Related_Object__c: 'Bento_Order__c', Amount__c: 72000, Description__c: '3/15 大阪地区ランチョンセミナーの弁当手配経費。40名分×¥1,800', Status__c: '申請中', Priority__c: '低', Requested_By__c: USR[3], Approver__c: USR[4], Submitted_Date__c: '2026-02-21' },
    { Id: AR[5], Name: 'MA活動 アドバイザリーボード承認', Request_Type__c: 'MA活動', Related_Object__c: 'MA_Activity__c', Amount__c: 1200000, Description__c: '血液がんパネル検査アドバイザリーボード実施承認。KOL 5名、謝金¥1,000,000、会場費¥100,000', Status__c: '承認済', Priority__c: '高', Requested_By__c: USR[4], Approver__c: USR[7], Submitted_Date__c: '2026-01-10', Approved_Date__c: '2026-01-12', Approver_Comment__c: 'アドバイザリーボードの結果をPMDA申請資料に活用すること。' },
    { Id: AR[6], Name: '佐藤MR 2月経費精算', Request_Type__c: '経費精算', Amount__c: 48500, Description__c: '2月分経費精算: 交通費、名刺印刷、資料印刷等', Status__c: '承認待ち', Priority__c: '低', Requested_By__c: USR[2], Approver__c: USR[1], Submitted_Date__c: '2026-02-22' }
  ],

  Expense_Report__c: [
    { Id: EX[1], Name: 'EX-0001', Report_Date__c: '2026-02-22', Expense_Type__c: '交通費', Amount__c: 3200, Description__c: '2/7 東大病院訪問 タクシー代（六本木→本郷）', Related_Visit__c: V[4], Receipt_Attached__c: true, Status__c: '申請中', OwnerId: USR[3] },
    { Id: EX[2], Name: 'EX-0002', Report_Date__c: '2026-02-22', Expense_Type__c: '交通費', Amount__c: 1580, Description__c: '2/10 がん研有明訪問 電車代往復', Related_Visit__c: V[7], Receipt_Attached__c: true, Status__c: '申請中', OwnerId: USR[2] },
    { Id: EX[3], Name: 'EX-0003', Report_Date__c: '2026-02-22', Expense_Type__c: '勉強会経費', Amount__c: 31500, Description__c: 'SM002 配布資料印刷（A4カラー 42部×15ページ）', Related_Seminar__c: S[2], Receipt_Attached__c: true, Status__c: '申請中', OwnerId: USR[2] },
    { Id: EX[4], Name: 'EX-0004', Report_Date__c: '2026-02-15', Expense_Type__c: '学会参加費', Amount__c: 35000, Description__c: 'JSMO 2026 参加登録費', Receipt_Attached__c: true, Status__c: '承認済', OwnerId: USR[2] },
    { Id: EX[5], Name: 'EX-0005', Report_Date__c: '2026-01-25', Expense_Type__c: '会議費', Amount__c: 150000, Description__c: 'MA002 アドバイザリーボード 会場費（ホテルオークラ）', Receipt_Attached__c: true, Status__c: '支払済', OwnerId: USR[4] },
    { Id: EX[6], Name: 'EX-0006', Report_Date__c: '2026-02-18', Expense_Type__c: '消耗品', Amount__c: 8800, Description__c: 'JSMO 2026用 名刺200枚追加印刷', Receipt_Attached__c: true, Status__c: '申請中', OwnerId: USR[2] }
  ],

  Competitive_Intel__c: [
    { Id: CI[1], Name: 'F1CDx 大腸がん新適応取得', Competitor__c: 'FoundationOne CDx（中外製薬）', Intel_Type__c: '規制動向', Source__c: 'PMDA新規承認情報', Date__c: '2026-02-15', Impact__c: '高', Action_Required__c: '営業チームに情報共有、大腸がん領域の差別化ポイント資料を緊急作成', OwnerId: USR[4] },
    { Id: CI[2], Name: 'Guardant360 リキッドバイオプシー日本展開情報', Competitor__c: 'Guardant360', Intel_Type__c: '採用動向', Source__c: 'Guardant Health IR資料', Date__c: '2026-02-10', Impact__c: '中', Action_Required__c: 'リキッドバイオプシーの比較優位性データをまとめる', OwnerId: USR[3] },
    { Id: CI[3], Name: 'NCC オンコパネル 価格改定情報', Competitor__c: 'NCC オンコパネル', Intel_Type__c: '価格情報', Source__c: 'がんセンター内部情報（田村先生経由）', Date__c: '2026-02-05', Impact__c: '高', Action_Required__c: '価格改定への対応戦略を経営会議で議論', OwnerId: USR[2] },
    { Id: CI[4], Name: 'ASCO 2026 Tempus xT 大規模データ発表予定', Competitor__c: 'Tempus xT（米国版）', Intel_Type__c: '学会発表', Source__c: 'ASCO Abstract Database', Date__c: '2026-01-30', Impact__c: '中', Action_Required__c: 'ASCO発表内容を注視し、営業トークに活用できるポイントを整理', OwnerId: USR[4] },
    { Id: CI[5], Name: '中外製薬 F1CDx営業体制強化', Competitor__c: 'FoundationOne CDx（中外製薬）', Intel_Type__c: '人事異動', Source__c: '業界関係者情報', Date__c: '2026-02-18', Impact__c: '高', Action_Required__c: 'ターゲット施設の優先順位を再評価、重点施設での関係構築を加速', OwnerId: USR[1] }
  ],

  Visit_Target__c: [
    { Id: VT[1], Name: '2月 東大病院 山田先生 定期訪問', Target_Month__c: '2026-02', OwnerId: USR[2], Doctor__c: D[1], Institution__c: MI[1], Target_Visits__c: 4, Actual_Visits__c: 3, Visit_Purpose__c: '定期訪問', Priority__c: 'A（最優先）', Status__c: '進行中', Achievement_Rate__c: 75, Last_Visit_Date__c: '2026-02-18', Next_Visit_Date__c: '2026-02-25', Note__c: 'genmine TOP導入に向けた関係構築' },
    { Id: VT[2], Name: '2月 がんセンター 佐々木先生 新規開拓', Target_Month__c: '2026-02', OwnerId: USR[2], Doctor__c: D[2], Institution__c: MI[2], Target_Visits__c: 3, Actual_Visits__c: 2, Visit_Purpose__c: '新規開拓', Priority__c: 'A（最優先）', Status__c: '進行中', Achievement_Rate__c: 67, Last_Visit_Date__c: '2026-02-14', Next_Visit_Date__c: '2026-02-27', Note__c: 'CGP検査の有用性について関心高い' },
    { Id: VT[3], Name: '2月 慶応病院 小林先生 フォロー', Target_Month__c: '2026-02', OwnerId: USR[2], Doctor__c: D[3], Institution__c: MI[3], Target_Visits__c: 2, Actual_Visits__c: 2, Visit_Purpose__c: 'フォローアップ', Priority__c: 'B（重要）', Status__c: '達成', Achievement_Rate__c: 100, Last_Visit_Date__c: '2026-02-20', Note__c: '検体提出フロー確認済み' },
    { Id: VT[4], Name: '2月 阪大病院 田中先生 情報提供', Target_Month__c: '2026-02', OwnerId: USR[2], Doctor__c: D[4], Institution__c: MI[4], Target_Visits__c: 2, Actual_Visits__c: 0, Visit_Purpose__c: '情報提供', Priority__c: 'C（通常）', Status__c: '未着手', Achievement_Rate__c: 0, Next_Visit_Date__c: '2026-02-26', Note__c: 'JSMO学会後にフォロー予定' },
    { Id: VT[5], Name: '2月 九大病院 松本先生 定期訪問', Target_Month__c: '2026-02', OwnerId: USR[3], Doctor__c: D[5], Institution__c: MI[5], Target_Visits__c: 3, Actual_Visits__c: 3, Visit_Purpose__c: '定期訪問', Priority__c: 'A（最優先）', Status__c: '達成', Achievement_Rate__c: 100, Last_Visit_Date__c: '2026-02-21', Note__c: 'genmine TOP受託解析の契約更新交渉完了' },
    { Id: VT[6], Name: '2月 北大病院 中村先生 説明会', Target_Month__c: '2026-02', OwnerId: USR[3], Doctor__c: D[6], Institution__c: MI[6], Target_Visits__c: 2, Actual_Visits__c: 1, Visit_Purpose__c: '説明会', Priority__c: 'B（重要）', Status__c: '進行中', Achievement_Rate__c: 50, Last_Visit_Date__c: '2026-02-10', Next_Visit_Date__c: '2026-02-28', Note__c: '病理部向けgenmine TOP説明会を企画中' },
    { Id: VT[7], Name: '2月 名大病院 伊藤先生 検体回収', Target_Month__c: '2026-02', OwnerId: USR[3], Doctor__c: D[7], Institution__c: MI[7], Target_Visits__c: 4, Actual_Visits__c: 2, Visit_Purpose__c: '検体回収', Priority__c: 'A（最優先）', Status__c: '進行中', Achievement_Rate__c: 50, Last_Visit_Date__c: '2026-02-15', Next_Visit_Date__c: '2026-02-24', Note__c: 'TAT短縮のため週1回ペースを維持' },
    { Id: VT[8], Name: '2月 東大 油谷先生 アカデミック面談', Target_Month__c: '2026-02', OwnerId: USR[4], Doctor__c: D[8], Institution__c: MI[1], Target_Visits__c: 2, Actual_Visits__c: 1, Visit_Purpose__c: '情報提供', Priority__c: 'A（最優先）', Status__c: '進行中', Achievement_Rate__c: 50, Last_Visit_Date__c: '2026-02-12', Next_Visit_Date__c: '2026-02-26', Note__c: '共同研究データの中間報告' },
    { Id: VT[9], Name: '2月 がんセンター KOL面談', Target_Month__c: '2026-02', OwnerId: USR[4], Doctor__c: D[9], Institution__c: MI[2], Target_Visits__c: 2, Actual_Visits__c: 2, Visit_Purpose__c: '情報提供', Priority__c: 'B（重要）', Status__c: '達成', Achievement_Rate__c: 100, Last_Visit_Date__c: '2026-02-19', Note__c: 'アドバイザリーボード参加のお礼と次回テーマ相談完了' },
    { Id: VT[10], Name: '2月 京大病院 学会フォロー', Target_Month__c: '2026-02', OwnerId: USR[3], Doctor__c: D[10], Institution__c: MI[8], Target_Visits__c: 3, Actual_Visits__c: 1, Visit_Purpose__c: 'フォローアップ', Priority__c: 'B（重要）', Status__c: '進行中', Achievement_Rate__c: 33, Last_Visit_Date__c: '2026-02-08', Next_Visit_Date__c: '2026-02-25', Note__c: 'ASCO Abstract準備支援' },
    { Id: VT[11], Name: '2月 筑波大 共同研究打合せ', Target_Month__c: '2026-02', OwnerId: USR[3], Doctor__c: D[11], Institution__c: MI[1], Target_Visits__c: 2, Actual_Visits__c: 1, Visit_Purpose__c: 'その他', Priority__c: 'A（最優先）', Status__c: '進行中', Achievement_Rate__c: 50, Last_Visit_Date__c: '2026-02-13', Next_Visit_Date__c: '2026-02-27', Note__c: 'リキッドバイオプシー共同研究のプロトコル最終確認' },
    { Id: VT[12], Name: '2月 広島大 新規KOL開拓', Target_Month__c: '2026-02', OwnerId: USR[3], Doctor__c: D[12], Institution__c: MI[2], Target_Visits__c: 1, Actual_Visits__c: 0, Visit_Purpose__c: '新規開拓', Priority__c: 'C（通常）', Status__c: '未着手', Achievement_Rate__c: 0, Next_Visit_Date__c: '2026-02-28', Note__c: '肺がんゲノム研究の第一人者。初回面談のアポイント調整中' }
  ],

  Workflow_Instance__c: [
    { Id: WF[1], Name: '佐藤花子 → 新任MR 引き継ぎ', Workflow_Type__c: '引き継ぎ', Status__c: '進行中', Current_Step__c: 3, Total_Steps__c: 6, Priority__c: '高', Requested_By__c: USR[1], Current_Assignee__c: USR[2], OwnerId: USR[1], Start_Date__c: '2026-02-10', Due_Date__c: '2026-03-15', Related_Record__c: 'U002', Description__c: '佐藤花子の異動に伴う担当ドクター・商談の引き継ぎ' },
    { Id: WF[2], Name: 'TO-0025 遺伝子パネル検査フロー', Workflow_Type__c: '検査オーダー', Status__c: '進行中', Current_Step__c: 4, Total_Steps__c: 7, Priority__c: '高', Requested_By__c: USR[4], Current_Assignee__c: USR[7], OwnerId: USR[4], Start_Date__c: '2026-02-05', Due_Date__c: '2026-02-28', Related_Record__c: 'TO-0025', Description__c: '東大病院 山田先生 肺腺癌検体のgenmine TOP検査' },
    { Id: WF[3], Name: '佐藤花子 2月交通費精算', Workflow_Type__c: '経費承認', Status__c: '承認待ち', Current_Step__c: 2, Total_Steps__c: 4, Priority__c: '中', Requested_By__c: USR[2], Current_Assignee__c: USR[1], OwnerId: USR[2], Start_Date__c: '2026-02-18', Due_Date__c: '2026-02-25', Related_Record__c: 'EX-0003', Description__c: '2月前半の訪問交通費・タクシー代 合計¥45,800' },
    { Id: WF[4], Name: 'CGP勉強会@東大 3月開催準備', Workflow_Type__c: '勉強会開催', Status__c: '進行中', Current_Step__c: 4, Total_Steps__c: 8, Priority__c: '高', Requested_By__c: USR[4], Current_Assignee__c: USR[4], OwnerId: USR[4], Start_Date__c: '2026-01-20', Due_Date__c: '2026-03-10', Related_Record__c: S[3], Description__c: '東京大学医学部にてCGP最新動向勉強会を開催' },
    { Id: WF[5], Name: '第一三共 genmine TOP導入 商談承認', Workflow_Type__c: '商談承認', Status__c: '完了', Current_Step__c: 5, Total_Steps__c: 5, Priority__c: '高', Requested_By__c: USR[2], Current_Assignee__c: USR[2], OwnerId: USR[2], Start_Date__c: '2026-01-15', Due_Date__c: '2026-02-15', Completed_Date__c: '2026-02-12', Related_Record__c: O[1], Description__c: '第一三共向けgenmine TOP導入商談の社内承認' },
    { Id: WF[6], Name: 'genmine TOP 適応追加申請', Workflow_Type__c: 'PMDA申請', Status__c: '進行中', Current_Step__c: 4, Total_Steps__c: 7, Priority__c: '緊急', Requested_By__c: USR[7], Current_Assignee__c: USR[4], OwnerId: USR[7], Start_Date__c: '2025-10-01', Due_Date__c: '2026-06-30', Related_Record__c: 'PMDA001', Description__c: 'genmine TOP 固形がん適応追加のPMDA一変申請' },
    { Id: WF[7], Name: '鈴木一郎 テリトリー追加引き継ぎ', Workflow_Type__c: '引き継ぎ', Status__c: '完了', Current_Step__c: 6, Total_Steps__c: 6, Priority__c: '中', Requested_By__c: USR[1], Current_Assignee__c: USR[3], OwnerId: USR[1], Start_Date__c: '2026-01-05', Due_Date__c: '2026-01-31', Completed_Date__c: '2026-01-28', Related_Record__c: 'U003', Description__c: '大阪エリア担当追加に伴うドクター引き継ぎ' },
    { Id: WF[8], Name: 'TO-0018 検査完了フロー', Workflow_Type__c: '検査オーダー', Status__c: '完了', Current_Step__c: 7, Total_Steps__c: 7, Priority__c: '中', Requested_By__c: USR[4], Current_Assignee__c: USR[4], OwnerId: USR[4], Start_Date__c: '2026-01-10', Due_Date__c: '2026-02-07', Completed_Date__c: '2026-02-05', Related_Record__c: 'TO-0018', Description__c: 'がんセンター 佐々木先生 大腸癌検体' }
  ],

};

async function seedIfEmpty() {
  console.log('[INFO] Checking seed data status...');

  let totalCount = 0;
  let seededCollections = 0;

  for (const [collectionName, records] of Object.entries(demoData)) {
    const exists = await collectionExists(collectionName);
    if (exists) {
      continue;
    }

    // Seed this collection
    const batch = db.batch();
    let count = 0;
    for (const record of records) {
      const id = record.Id;
      const docData = { ...record };
      delete docData.Id;
      batch.set(db.collection(collectionName).doc(id), docData);
      count++;
    }
    await batch.commit();
    totalCount += count;
    seededCollections++;
    console.log(`[INFO] Seeded ${collectionName}: ${count} records`);
  }

  if (totalCount === 0) {
    console.log('[INFO] All collections already have data, skipping seed');
  } else {
    console.log(`[INFO] Seeded ${totalCount} records across ${seededCollections} collections (all IDs are 18-char SF-compatible)`);
  }
}

module.exports = { seedIfEmpty, demoData };

# Pforce

Salesforce 互換の CRM プラットフォーム。Salesforce REST API / SOQL / SOSL をネイティブ実装し、PostgreSQL (JSONB) をバックエンドに持つ軽量な OSS CRM です。

## 特徴

- **Salesforce REST API 互換** — `/services/data/v62.0/` エンドポイント群をそのまま実装
- **SOQL / SOSL エンジン** — 再帰下降パーサによるフル実装（サブクエリ・集約関数・日付リテラル対応）
- **SOQL → PostgreSQL SQL 変換** — JSONB フィールドへのネイティブ変換
- **YAML 駆動スキーマ** — Standard / Custom オブジェクトを YAML で定義、コードレスで拡張可能
- **アクセス制御** — ロール階層・プロファイル・権限セット・項目レベルセキュリティ (FLS)
- **Google OAuth 2.0** — ドメイン/メールベースのプロファイル自動割り当て
- **Bulk API 2.0** — CSV 一括インポート対応
- **マルチインスタンス** — Sales Cloud / NPSP / Dreamhouse など複数テナントを同時稼働
- **Metadata API** — デプロイ/リトリーブ（SFDX 互換 XML 出力）
- **AI レポート生成** — OpenAI / Google AI 連携による自然言語レポート
- **18 桁 Salesforce ID** — チェックサム付き ID をネイティブ生成

## 標準オブジェクト (22)

Account, Contact, Lead, Opportunity, OpportunityLineItem, OpportunityContactRole, Campaign, CampaignMember, Task, Event, Case, Contract, Note, ContentDocument, User, Product2, Pricebook2, PricebookEntry, Quote, QuoteLineItem, Order, OrderItem

## カスタムオブジェクト (19)

| モジュール | オブジェクト |
|-----------|------------|
| CRM | Doctor__c, Medical_Institution__c, Pharma_Opportunity__c, Visit_Record__c, Visit_Target__c, Competitive_Intel__c |
| Lab | Lab__c, Specimen__c, Testing_Order__c, Genomic_Project__c |
| Medical | Seminar__c, Seminar_Attendee__c, MA_Activity__c, Bento_Order__c |
| Operations | Daily_Report__c, Expense_Report__c, Approval_Request__c, Workflow_Instance__c |
| Research | Joint_Research__c |

## ディレクトリ構成

```
pforce/
├── server.js                # Express エントリポイント
├── pg-service.js            # PostgreSQL CRUD (JSONB)
├── auth.js                  # OAuth2 トークン / Google OAuth
├── soql-parser.js           # SOQL トークナイザ & パーサ
├── soql-to-sql.js           # SOQL → PostgreSQL SQL
├── salesforce-id.js         # 18 桁 Salesforce ID 生成
├── search.js                # SOSL 検索エンジン
├── bulk-api.js              # Bulk API 2.0
├── seed-data.js             # デモデータ
├── src/
│   ├── config/              # 設定ローダ・スキーマインデクサ
│   ├── middleware/           # Helmet, CORS, Rate Limit, Session
│   ├── services/            # アクセス制御, バリデーション, メタデータ XML
│   └── routes/              # 全 API ルート (22 ファイル)
├── config/
│   ├── access-control.yaml  # ロール・プロファイル・権限
│   └── schema/
│       ├── standard/        # 22 標準オブジェクト YAML
│       ├── custom/          # 19 カスタムオブジェクト YAML
│       ├── dashboard.yaml
│       └── permission-sets.yaml
├── public/                  # メイン SPA フロントエンド
├── public-standalone/       # スタンドアロン CRM UI (モジュラー)
└── instances/               # マルチインスタンス (Sales Cloud, NPSP, Dreamhouse)
```

## セットアップ

### 前提条件

- Node.js >= 18
- PostgreSQL >= 14

### インストール

```bash
git clone https://github.com/pengin0906/pforce.git
cd pforce
npm install
```

### 環境変数

```bash
cp .env.example .env
# .env を編集して DATABASE_URL を設定
```

| 変数 | 必須 | 説明 |
|------|------|------|
| `DATABASE_URL` | Yes | PostgreSQL 接続文字列 |
| `GOOGLE_CLIENT_ID` | No | Google OAuth クライアント ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth クライアントシークレット |
| `OPENAI_API_KEY` | No | AI レポート生成 (OpenAI) |
| `GOOGLE_AI_KEY` | No | AI レポート生成 (Gemini) |

### 起動

```bash
# 開発モード (DEV_AUTO_LOGIN=true でログイン不要)
npm run dev

# 本番モード
npm start
```

デフォルトで `http://localhost:3000` で起動します。

## API エンドポイント

### Salesforce 互換 API

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/services/data/v62.0/sobjects/` | Describe Global |
| GET | `/services/data/v62.0/sobjects/:obj/describe/` | Describe Object |
| POST | `/services/data/v62.0/sobjects/:obj` | Create Record |
| PATCH | `/services/data/v62.0/sobjects/:obj/:id` | Update Record |
| DELETE | `/services/data/v62.0/sobjects/:obj/:id` | Delete Record |
| GET/POST | `/services/data/v62.0/query/` | SOQL Query |
| POST | `/services/data/v62.0/composite/` | Composite API |
| POST | `/services/data/v62.0/jobs/ingest` | Bulk API 2.0 |
| POST | `/services/oauth2/token` | OAuth Token |

### 内部 API

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/data/:objectName` | レコード一覧 |
| POST | `/api/data/:objectName` | レコード作成 |
| GET | `/api/data/:objectName/:id` | レコード取得 |
| PUT | `/api/data/:objectName/:id` | レコード更新 |
| DELETE | `/api/data/:objectName/:id` | レコード削除 |
| GET | `/api/schema` | スキーマ取得 |
| GET | `/api/reports/pipeline` | パイプラインレポート |
| GET | `/api/reports/kpi` | KPI レポート |

## デプロイ

Google Cloud Run へのデプロイに対応しています。

```bash
gcloud run deploy pforce \
  --source . \
  --region asia-northeast1 \
  --set-env-vars DATABASE_URL=your_connection_string
```

## ライセンス

MIT

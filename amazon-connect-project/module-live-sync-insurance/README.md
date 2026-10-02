# 医療保険 給付金請求デモ（Live Sync / 日本語）

AnyCompany Insurance の会員サイト（日本語）と、その中の「給付金請求」サブページで
Amazon Connect **In-app** チャネル + **Agentic CX Designer（ACXD）の Live Sync**
が動作するデモです。顧客（AWS 太郎）が音声アシスタントと対話すると、画面が連動して
遷移し、フォーム項目が自動で埋まります。

- 契約データ・請求受付は**フロントのモック**（`src/api.ts`）で完結。バックエンド不要。
- **`npm install` 不要**で配布できます。ビルド済みの `public/`（`index.html` + `.js` +
  `.css`）を S3 に置くだけで動作します（開発者のみビルドが必要）。
- 既存の配布物（別の `index.html`）と、1 つの CloudFront URL で**共存**できます
  （サブパス `/live-sync-insurance/` に配置）。

## 画面の流れ

```
#/home                  マイページ（トップ）
#/policies              契約内容の照会（医療保険・生命保険）＝請求の開始点
#/claim/<policyId>      給付金請求フォーム ← ここで Live Sync が画面連動
#/confirmation          受付完了
```

- **医療保険**（`MED-1001`）: 入院・手術・通院の給付を備え、請求可能。
- **生命保険**（`LIFE-2001`）: 表示のみ（ハリボテ）。請求ボタンはグレーアウト。

給付金請求フォームの 4 項目（`fill_claim_details` で反映）:

1. 給付種類（入院給付金 / 手術給付金 / 通院給付金）
2. 入院日・手術日など
3. 請求金額の見込み（円）
4. 状況の説明

`customerId` と `policyId` は選択した契約から入るため、フォームは 4 項目だけ尋ねます。

## 開発（ローカル起動）

```bash
npm install
copy static\acxd_config.example.json static\acxd_config.json   # 値を記入（下記参照）
npm run dev             # http://localhost:5175（localhost 必須：音声は secure context）
```

`@amazon-connect-touchpoint/web` は npm の依存としてインストールされ、次のように
インポートします。

```ts
import { create } from "@amazon-connect-touchpoint/web";
```

## 設定は `acxd_config.json` の 1 つだけ

設定源は **`acxd_config.json` の唯一 1 つ**です（`.env` は廃止）。ローカル開発も
S3 配布も、この同じ JSON を編集するだけで動きます。ビルド時に接続情報を JS に
焼き込まないため、配布物（`public/`）に実キーが埋め込まれることはありません。

| ファイル | 役割 | Git |
|---|---|---|
| `static/acxd_config.example.json` | 空テンプレート | コミットする |
| `static/acxd_config.json` | ローカル開発用の実設定（源） | **除外**（実キーを含む） |
| `public/acxd_config.json` | ビルドでコピーされる実設定（配布・S3 差し替え用） | **除外** |

キーは camelCase。契約データはモックのため、必要なのは Amazon Connect と Live Sync
の接続情報だけです。

```json
{
  "connectInstanceId": "Amazon Connect インスタンス ID",
  "connectContactFlowId": "コンタクトフロー ID（UUID のみ。contact-flow/ 接頭辞は付けない）",
  "connectRegion": "ap-northeast-1",
  "connectVoiceEndpoint": "https://xxxx.execute-api.ap-northeast-1.amazonaws.com/voice",
  "liveSyncDeploymentKey": "公開済み ACXD アプリの Deployment key",
  "liveSyncApiKey": "同上 API key",
  "customerId": "CUST-001",
  "customerName": "AWS 太郎",
  "customerOtherInfo": ""
}
```

| キー | 説明 |
|---|---|
| `connectInstanceId` | Amazon Connect インスタンス ID |
| `connectContactFlowId` | コンタクトフロー ID（**UUID のみ**。`contact-flow/` 接頭辞は付けない） |
| `connectRegion` | リージョン（例 `ap-northeast-1`） |
| `connectVoiceEndpoint` | StartWebRTCContact のエンドポイント（音声のため必須） |
| `liveSyncDeploymentKey` | 公開済み ACXD アプリの Deployment key |
| `liveSyncApiKey` | 同上 API key |
| `customerId` | 表示・請求用／コンタクト属性 `customerId`（任意。既定 `CUST-001`） |
| `customerName` | 顧客表示名／コンタクト属性 `customerName`（任意。既定 `AWS 太郎`） |
| `customerOtherInfo` | 汎用コンタクト属性 `customerOtherInfo`（任意。空なら送らない） |

- 必須項目（`connect*` と `liveSync*`）が空だと、請求フローの代わりに Setup 画面が
  出て、不足項目を表示します。
- fetch は `cache: "no-store"`。差し替え後は CloudFront で
  `/live-sync-insurance/acxd_config.json` を Invalidation すれば即反映されます。
- これらの値はクライアントに露出する前提のもの（ブラウザから使う）です。エンドポイント
  側のスコープ制限・WAF などで保護してください。

## ビルドと S3 配布（`npm install` 不要の配布物）

```bash
npm run build           # public/ に index.html + assets/*.js + *.css + acxd_config.json を出力
```

`public/` の中身が配布物です（既存の amazon-connect-project と同じく public/ に出力）。
S3 のサブフォルダに置くだけで動きます。静的アセットの源は `static/`、出力先は `public/`。

### 既存の CloudFront/S3 と共存させる場合

既存配布物（`amazon-connect-project`）の CloudFront オリジンパスが
`/amazon-connect-project/public` のとき、そのサブフォルダに同居させます。

```bash
# public/ の中身を既存 public/ 配下の live-sync-insurance/ に置く（末尾スラッシュ必須）
aws s3 sync public/ s3://<your-bucket>/amazon-connect-project/public/live-sync-insurance/ --delete
```

- アクセス URL: `https://<cloudfront-domain>/live-sync-insurance/`
- `vite.config.ts` の `base` が `/live-sync-insurance/` なので、`index.html` は
  `/live-sync-insurance/assets/...` を参照します。オリジンパスが `amazon-connect-project/public`
  を隠すため、URL には出ません。
- 既存の `index.html` には触れません（`--delete` はこのサブフォルダ内だけに効く）。
- SPA ルーティングはハッシュ（`#/...`）方式なので、CloudFront の 403/404 → index.html
  リライトは不要です。

### 接続先を後から変更する（再ビルド不要）

S3 上の `acxd_config.json` を書き換えるだけです。

```bash
# 例: config だけ差し替え
aws s3 cp acxd_config.json s3://<your-bucket>/amazon-connect-project/public/live-sync-insurance/acxd_config.json
# CloudFront で即時反映させる
aws cloudfront create-invalidation --distribution-id <ID> --paths "/live-sync-insurance/acxd_config.json"
```

### ルート直下に置く場合

ビルド時に `VITE_BASE_PATH=/` を指定してください。この場合 `acxd_config.json` は
配信ルート直下（`/acxd_config.json`）から読まれます。

## ACXD 側（音声ボット）の設定

Live Sync が本物として動くには、フロントのアクション定義と ACXD 側の設定を一致
させる必要があります。フロントが定義するアクション名・scope は次の通りです。

| 画面 | scope | アクション |
|---|---|---|
| マイページ | `benefit_claim` / `member_home` | （なし） |
| 契約選択 | `benefit_claim` / `policy_selection` | `select_policy` |
| 請求フォーム | `benefit_claim` / `claim_details` | `fill_claim_details`, `submit_claim`, `change_policy` |
| 受付完了 | `benefit_claim` / `claim_submitted` | `file_another_claim` |

- アクション名・scope・`fill_claim_details` の `claimType` enum 値
  （`hospitalization` / `surgery` / `outpatient`）は**英語のまま**、ACXD 側と厳密一致。
- ACXD 側のプロンプト・設定変更後は **Build → Deploy** が必要（保存だけでは反映されない）。

## 構成（src/）

- `main.tsx` — アプリ本体。設定読み込み → 注入 → ルーティング・状態・Touchpoint マウント。
- `config.ts` — 実行時設定の解決（`acxd_config.json` が唯一の設定源）。
- `touchpoint.ts` — SDK 設定 / `sendContext` / scope（設定は注入で受け取る）。
- `actions.ts` — Live Sync アクション定義（`start_claim` ＋ 既存 5 つ）。
- `claim.ts` — 型・給付種類・バリデーション・表示整形。
- `api.ts` — 契約・請求のモック（バックエンド不要）。設定は `initApi()` で注入。
- `router.ts` — ハッシュルーティング（`home` / `policies` / `claim` / `confirmation`）。
- `screens/` — `Home` / `PolicyPicker` / `ClaimForm` / `Confirmation` / `Setup`。
- `static/acxd_config.example.json` — 設定の空テンプレート（コミット）。
- `static/acxd_config.json` — 実行時設定の源（実キー入り。gitignore。ビルドで `public/` にコピーされる）。
- `public/` — ビルド成果物の出力先（S3 に上げるもの）。`acxd_config.json` は gitignore。

## 注意（Live Sync のハマりどころ）

- `useLiveSyncContext` に渡すアクション配列は必ず `useMemo` でメモ化する
  （毎レンダリングで新参照になると `undefined action` で静かに失敗する）。
- ローカルは `localhost` 必須（音声は secure context）。本番は CloudFront の HTTPS でOK。

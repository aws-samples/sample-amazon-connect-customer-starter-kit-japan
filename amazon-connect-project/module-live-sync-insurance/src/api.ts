import type { ClaimRequest, ClaimResponse, Policy } from "./claim";
import type { AppConfig } from "./config";

/**
 * モック API。このデモは「S3 に静的ファイルを置くだけで動く」ことを最優先する
 * ため、バックエンド（API Gateway / Lambda / DB）を持たない。契約データと請求
 * 受付結果はすべてフロントで完結させる。
 *
 * 重要: これはあくまで「画面が表示するデータの器」をモックにしているだけで、
 * Live Sync の連動（Amazon Connect + ACXD が sendContext で広告されたアクション
 * を呼び、画面遷移・項目反映を起こす）は本物として動作する。
 *
 * 顧客情報（customerId / customerName）は実行時設定（config.ts）から注入する。
 * 起動時に一度 `initApi(config)` を呼ぶこと。契約内容はモック固定なので、
 * customerId を変えても契約は変わらない（複数顧客の切替が必要なら実 API が要る）。
 */

/* 実行時設定の注入 --------------------------------------------------------- */

let currentCustomerId = "CUST-001";
let currentCustomerName = "AWS 太郎";

/** 起動時に解決済み設定を注入する（main.tsx から呼ぶ）。 */
export const initApi = (config: AppConfig): void => {
  if (config.customerId.trim() !== "") {
    currentCustomerId = config.customerId.trim();
  }
  if (config.customerName.trim() !== "") {
    currentCustomerName = config.customerName.trim();
  }
};

/** 表示・請求に使う顧客 ID。 */
export const getCustomerId = (): string => currentCustomerId;

/** 顧客表示名。 */
export const getCustomerName = (): string => currentCustomerName;

/* モックデータ ------------------------------------------------------------- */

/**
 * AWS 太郎の契約（モック）。
 * - 医療保険: 入院・手術・通院の給付を備え、請求可能（claimable: true）。
 * - 生命保険: 給付は備えず（benefitDetails 空）、請求不可（claimable: false）。
 *   一覧には表示するが、請求ボタンはグレーアウトされる（ハリボテ）。
 *
 * customerId は取得時に現在の設定値で埋める（fetchPolicies 内）。
 */
const mockPolicies: Array<Omit<Policy, "customerId">> = [
  {
    policyId: "MED-1001",
    policyType: "医療保険（入院・手術・通院）",
    benefitDetails: {
      hospitalization: 10_000, // 入院給付金（1 日あたり）
      surgery: 100_000, // 手術給付金（1 回あたり）
      outpatient: 5_000, // 通院給付金（1 日あたり）
    },
    claimable: true,
    effectiveDate: "2022-04-01",
    expirationDate: "2032-03-31",
    insuredItems: [{ itemId: "INS-1", description: "被保険者（本人）" }],
    premium: 4_800,
    premiumFrequency: "MONTHLY",
    status: "active",
  },
  {
    policyId: "LIFE-2001",
    policyType: "定期生命保険",
    benefitDetails: {}, // 給付なし＝請求不可（ハリボテ）
    claimable: false,
    effectiveDate: "2020-06-01",
    expirationDate: "2040-05-31",
    insuredItems: [{ itemId: "INS-2", description: "被保険者（本人）" }],
    premium: 6_200,
    premiumFrequency: "MONTHLY",
    status: "active",
  },
];

/** ネットワークっぽい体感のための小さな遅延。 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** 契約一覧を返す（モック）。実 API の `GET /policies` 相当。 */
export const fetchPolicies = async (): Promise<Policy[]> => {
  await delay(300);
  return mockPolicies.map((policy) => ({
    ...policy,
    customerId: currentCustomerId,
  }));
};

/**
 * 請求を受け付ける（モック）。実 API の `POST /claims` 相当。擬似的な受付番号を
 * 生成して返す。
 */
export const submitClaim = async (
  claim: ClaimRequest,
): Promise<ClaimResponse> => {
  await delay(600);
  const stamp = new Date();
  const yyyymmdd = stamp.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return {
    claimId: `CLM-${yyyymmdd}-${rand}`,
    status: "受付完了",
    message: "給付金請求を受け付けました。担当者より順次ご連絡いたします。",
    submittedPolicyId: claim.policyId,
  };
};

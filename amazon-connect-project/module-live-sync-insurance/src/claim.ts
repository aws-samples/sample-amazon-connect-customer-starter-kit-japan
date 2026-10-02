/**
 * 給付金請求のデータモデル: API（今回はモック）が使う型、フォームのルール
 * （何を請求できるか / 入力が揃ったと見なす条件 / 4 つの入力値を請求ボディに
 * 変換する処理）をまとめる。
 *
 * 元の自動車保険 FNOL デモの構造をそのまま活かし、医療保険の給付金請求向けに
 * 中身（給付種類・表示）を差し替えている。フロントで完結するモック構成のため、
 * バックエンド API は不要。
 */

/* API 契約（モックが返す形） --------------------------------------------- */

/**
 * 契約が請求可能な給付種類。医療保険は給付種類ごとに 1 回あたりの給付金額を
 * 持つ。生命保険（ハリボテ）は空で「請求不可」を表す。
 */
export type BenefitType = "hospitalization" | "surgery" | "outpatient";

/** 1 契約が備える給付（給付種類 → 1 回/1 日あたりの給付金額）。 */
export type BenefitDetails = Partial<Record<BenefitType, number>>;

/** 被保険者・保障対象（医療保険なら被保険者本人など）。 */
export interface InsuredItem {
  description: string;
  itemId: string;
}

/** 1 契約。医療保険・生命保険を同じ型で表現する。 */
export interface Policy {
  /** その契約で請求可能な給付種類と給付金額。空なら請求不可（生命保険）。 */
  benefitDetails: BenefitDetails;
  customerId: string;
  effectiveDate: string;
  expirationDate: string;
  insuredItems: InsuredItem[];
  policyId: string;
  /** 表示用の商品名。例: 「医療保険（入院・手術）」 */
  policyType: string;
  premium: number;
  premiumFrequency: string;
  status: string;
  /**
   * 給付金請求フローに乗せられるか。医療保険は true、生命保険（ハリボテ）は
   * false。false の契約は一覧で請求ボタンをグレーアウトする。
   */
  claimable: boolean;
}

/** 「契約一覧」呼び出しのレスポンス。 */
export interface PolicyListResponse {
  count: number;
  policies: Policy[];
}

/**
 * 給付金請求のペイロード。6 項目のうち入力するのは 4 項目のみ。`customerId` と
 * `policyId` は選択した契約から入るため、フォームは 4 項目だけ尋ねる。
 */
export interface ClaimRequest {
  amount: number;
  claimType: string;
  customerId: string;
  description: string;
  incidentDate: string;
  policyId: string;
}

/** 請求受付のレスポンス。UI が読むのは `claimId` と `status` のみ。 */
export interface ClaimResponse {
  claimId?: string;
  status?: string;
  [key: string]: unknown;
}

/* フォーム ---------------------------------------------------------------- */

/**
 * フォームが入力中に保持する値。input は文字列を返すため、すべて string。
 * 変換は {@link toClaimRequest} で 1 回だけ行う。
 */
export interface ClaimDraft {
  claimType: string;
  incidentDate: string;
  amount: string;
  description: string;
}

export const emptyDraft: ClaimDraft = {
  claimType: "",
  incidentDate: "",
  amount: "",
  description: "",
};

/**
 * このアプリが扱う給付種類の一覧。`value`（英語）が `claimType` として送られ、
 * ACXD 側のアクション enum と一致する。`label`・`description` は日本語で表示する。
 *
 * `benefit` は {@link BenefitDetails} のキーに対応し、契約がその給付を備えて
 * いるかどうかの判定に使う。
 */
export const claimTypes: Array<{
  value: string;
  label: string;
  description: string;
  benefit: BenefitType;
}> = [
  {
    value: "hospitalization",
    label: "入院給付金",
    description: "病気やケガによる入院",
    benefit: "hospitalization",
  },
  {
    value: "surgery",
    label: "手術給付金",
    description: "入院中または外来での手術",
    benefit: "surgery",
  },
  {
    value: "outpatient",
    label: "通院給付金",
    description: "退院後などの通院治療",
    benefit: "outpatient",
  },
];

/**
 * その契約で請求できる給付種類（契約データ駆動）。契約が
 * {@link BenefitDetails} に持つ給付種類だけを選択肢として返す。医療保険は
 * 入院・手術・通院を備え、生命保険は何も備えないため空になる（＝請求不可）。
 */
export const availableClaimTypes = (policy: Policy): typeof claimTypes =>
  claimTypes.filter((type) => (policy.benefitDetails[type.benefit] ?? 0) > 0);

/** 今日を `YYYY-MM-DD` で返す（ブラウザのタイムゾーン）。事由日の上限。 */
export const today = (): string => {
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  return new Date(now.getTime() - offsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10);
};

/** フィールドごとのエラーメッセージ。空オブジェクトなら妥当。 */
export type ClaimErrors = Partial<Record<keyof ClaimDraft, string>>;

/** フォームが集める 4 項目を検証する（日本語メッセージ）。 */
export const validate = (draft: ClaimDraft): ClaimErrors => {
  const errors: ClaimErrors = {};

  if (draft.claimType === "") {
    errors.claimType = "給付種類を選択してください。";
  }

  if (draft.incidentDate === "") {
    errors.incidentDate = "入院日・手術日などの日付を入力してください。";
  } else if (draft.incidentDate > today()) {
    errors.incidentDate = "日付を未来の日付にすることはできません。";
  }

  const amount = Number(draft.amount);
  if (draft.amount === "") {
    errors.amount = "請求金額の見込みを入力してください（概算で可）。";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "0 より大きい金額を入力してください。";
  }

  if (draft.description.trim().length < 10) {
    errors.description = "状況を 1〜2 文で入力してください。";
  }

  return errors;
};

/**
 * 請求ボディを組み立てる。`customerId` はセッションではなく契約から取るため、
 * 常に契約の名義人で請求される。
 */
export const toClaimRequest = (
  draft: ClaimDraft,
  policy: Policy,
): ClaimRequest => ({
  amount: Number(draft.amount),
  claimType: draft.claimType,
  customerId: policy.customerId,
  description: draft.description.trim(),
  incidentDate: draft.incidentDate,
  policyId: policy.policyId,
});

/** 日本円表記。例: `500,000 円`。 */
export const formatCurrency = (value: number): string =>
  `${new Intl.NumberFormat("ja-JP").format(value)} 円`;

/** `YYYY-MM-DD` を `2025年3月1日` に。解釈できなければそのまま返す。 */
export const formatDate = (value: string): string => {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/** 支払頻度・ステータスなどの表示用ラベル（英語キー → 日本語）。 */
export const humanize = (value: string): string => {
  const map: Record<string, string> = {
    MONTHLY: "月払",
    monthly: "月払",
    YEARLY: "年払",
    yearly: "年払",
    ANNUAL: "年払",
    annual: "年払",
    active: "有効",
    ACTIVE: "有効",
    inactive: "失効",
    INACTIVE: "失効",
  };
  return map[value] ?? value;
};

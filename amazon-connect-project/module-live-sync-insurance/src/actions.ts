import type { LiveSyncCustomAction } from "@amazon-connect-touchpoint/web";
import { availableClaimTypes, type ClaimDraft, type Policy } from "./claim";

/**
 * アシスタント（ACXD の Live Sync ノード）が呼べる操作を 1 ファイルにまとめる。
 *
 * 各アクションは name / description / schema / handler の 4 点で構成される。
 * アシスタントは顧客の発話を schema に合う引数へ解決し、handler がそれをページに
 * 適用する。これはリンクやボタンが呼ぶのと同じ処理なので、発話とクリックはアプリ
 * から見て区別できない。
 *
 * 各アクションは「必要なもの（読み込んだ契約・選択中の契約・実行するコールバック）」
 * を引数に取る関数になっている。そのため、アクションを honour できるページ＝それを
 * 宣言するページ、という対応が保てる。各画面コンポーネント冒頭の
 * `useLiveSyncContext` 呼び出しで、そのステップの scope とともにアクションを広告
 * する。どのページがマウントされているかがアシスタントの scope を決める。
 *
 * 注意（ACXD との整合）: `action` 名と schema の `enum` 値（英語）は、ACXD 側の
 * Live Sync ノードの設定と大文字小文字まで厳密に一致させること。label は日本語
 * 表示用でここには出てこない。
 */

const describePolicy = (policy: Policy): string => {
  const product = policy.policyType || policy.policyId;
  const benefits = Object.keys(policy.benefitDetails).length > 0 ? "給付金請求可" : "請求対象外";
  // ボットが「医療保険」「入院」等の発話から ID を引けるよう、商品名・別称・
  // 給付内容を description に厚めに入れる。
  return `${policy.policyId}（${product}、${benefits}）`;
};

/**
 * マイページ（トップ）から給付金請求を開始する＝契約一覧へ遷移する。
 * home では請求フォームのアクションは広告しないが、フローを開始するこの 1 つは
 * 広告して、ボットが「給付金の請求」を押した状態に画面を進められるようにする。
 */
export const startClaimAction = (
  startClaim: () => void,
): LiveSyncCustomAction => ({
  action: "start_claim",
  description:
    "Open the benefit claim flow — move from the member home page to the list of policies. Call this when the customer wants to file a benefit claim (給付金の請求). 顧客が給付金請求を希望したら、契約一覧へ進める。",
  schema: { type: "object", properties: {} },
  handler: () => {
    startClaim();
  },
});

/**
 * どの契約に対して請求するかを選ぶ。`enum` は顧客自身の契約 ID。`description`
 * には契約の一覧（ID と商品名）を入れ、アシスタントが「医療保険＝MED-1001」と
 * 対応づけられるようにする。
 */
export const selectPolicyAction = (
  policies: Policy[],
  selectPolicy: (policyId: string) => void,
): LiveSyncCustomAction => ({
  action: "select_policy",
  description:
    "Choose which policy the benefit claim is being filed against. Use this once the customer identifies the policy or product involved. The customer will usually refer to the product by name (例:「医療保険」「入院の保険」), NOT by policy ID — map their words to the matching policyId from the enum below and call this immediately. 顧客は証券番号ではなく商品名（「医療保険」など）で言うことが多い。その言葉を下記の policyId に対応づけてすぐ呼ぶこと。",
  schema: {
    type: "object",
    properties: {
      policyId: {
        type: "string",
        description: `The policy ID to file against. Match the customer's spoken product name to one of these. Available policies: ${policies
          .map(describePolicy)
          .join("; ")}`,
        enum: policies.map((policy) => policy.policyId),
      },
    },
    required: ["policyId"],
  },
  handler: ({ policyId }: { policyId: string }) => {
    const match = policies.find((policy) => policy.policyId === policyId);
    if (match == null) {
      return;
    }
    selectPolicy(match.policyId);
  },
});

/**
 * 顧客が話した内容を給付金請求フォームに書き込む。給付種類の `enum` は選択中の
 * 契約が備える給付（{@link availableClaimTypes}）。
 */
export const fillClaimAction = (
  policy: Policy,
  updateDraft: (patch: Partial<ClaimDraft>) => void,
): LiveSyncCustomAction => ({
  action: "fill_claim_details",
  description:
    "Write what the customer has told you into the benefit claim form. Call this the moment you have any single value — do not wait for the rest, and do not hold a value back to send with the next one. One field per call is normal; call again for each new piece, and again to correct one the customer restates. The customer is watching the form fill in as they talk, so a late call reads as not having been heard. 顧客が話した値を給付金請求フォームに反映する。値が 1 つ分かった時点で都度呼ぶ。",
  schema: {
    type: "object",
    properties: {
      claimType: {
        type: "string",
        description:
          "The kind of benefit being claimed (入院給付金 / 手術給付金 / 通院給付金). Send as soon as what happened makes it clear, without asking the customer to pick from these.",
        enum: availableClaimTypes(policy).map((type) => type.value),
      },
      incidentDate: {
        type: "string",
        description:
          "The date of the hospitalization, surgery, or outpatient visit, as YYYY-MM-DD. Resolve relative dates such as '先週の火曜日' before sending. Send on its own as soon as it is known.",
      },
      amount: {
        type: "number",
        description:
          "The customer's estimate of the claim amount, in Japanese yen (JPY). A rough figure counts — send it on its own as soon as they give one.",
        exclusiveMinimum: 0,
      },
      description: {
        type: "string",
        description:
          "A short account of what happened, in the customer's own words (Japanese is fine). Send it as soon as they have described the situation, before you have the other fields.",
      },
    },
  },
  handler: (value: Partial<Record<keyof ClaimDraft, string | number>>) => {
    const patch: Partial<ClaimDraft> = {};
    if (typeof value.claimType === "string") {
      patch.claimType = value.claimType;
    }
    if (typeof value.incidentDate === "string") {
      patch.incidentDate = value.incidentDate.slice(0, 10);
    }
    if (value.amount != null && value.amount !== "") {
      patch.amount = String(value.amount);
    }
    if (typeof value.description === "string") {
      patch.description = value.description;
    }
    updateDraft(patch);
  },
});

/** 請求を確定する（送信ボタンと同じ経路。バリデーションも同じ）。 */
export const submitClaimAction = (
  submit: () => void,
): LiveSyncCustomAction => ({
  action: "submit_claim",
  description:
    "Submit the benefit claim. Only do this after reading the details back to the customer and getting their confirmation. 確認を取ってから呼ぶこと。",
  schema: { type: "object", properties: {} },
  handler: () => {
    submit();
  },
});

/** 契約一覧に戻る（別の契約を選び直したいとき）。 */
export const changePolicyAction = (
  changePolicy: () => void,
): LiveSyncCustomAction => ({
  action: "change_policy",
  description:
    "Go back to the list of policies, for when the customer picked the wrong one. 契約を選び直すとき。",
  schema: { type: "object", properties: {} },
  handler: () => {
    changePolicy();
  },
});

/** 契約一覧から次の請求を始める。 */
export const startOverAction = (
  startOver: () => void,
): LiveSyncCustomAction => ({
  action: "file_another_claim",
  description: "Start a new benefit claim from the policy list. 新しい請求を始める。",
  schema: { type: "object", properties: {} },
  handler: () => {
    startOver();
  },
});

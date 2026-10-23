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
    "給付金請求のフローを開始する。会員のマイページ（トップ）から契約一覧の画面へ進める。顧客が給付金の請求を希望したときに呼ぶこと。",
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
    "どの契約に対して給付金を請求するかを選ぶ。顧客が対象の契約・商品を特定できたら呼ぶこと。顧客は証券番号ではなく商品名（例:「医療保険」「入院の保険」）で言うことが多い。その言葉を下記 enum の policyId に対応づけ、特定できた時点でただちに呼ぶこと。",
  schema: {
    type: "object",
    properties: {
      policyId: {
        type: "string",
        description: `請求対象の契約 ID。顧客が話した商品名を次のいずれかに対応づけること。選択可能な契約: ${policies
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
    "顧客が話した内容を給付金請求フォームに書き込む。値が 1 つでも分かった瞬間に呼ぶこと。残りがそろうのを待たず、次の値とまとめて送ろうとせず、分かった値だけをその都度送る。1 回の呼び出しで 1 項目が基本で、新しい情報が出るたびに呼び、顧客が言い直したら訂正のために再度呼ぶ。顧客は話しながらフォームが埋まっていく様子を見ているため、呼び出しが遅れると「聞いてもらえていない」と受け取られる。",
  schema: {
    type: "object",
    properties: {
      claimType: {
        type: "string",
        description:
          "請求する給付の種類（入院給付金 / 手術給付金 / 通院給付金）。何が起きたかで種類が判断できた時点で送ること。顧客にこの中から選ばせる必要はない。",
        enum: availableClaimTypes(policy).map((type) => type.value),
      },
      incidentDate: {
        type: "string",
        description:
          "入院・手術・通院があった日付。YYYY-MM-DD 形式。「先週の火曜日」のような相対的な表現は具体的な日付に変換してから送ること。分かった時点でこの項目だけで送ってよい。",
      },
      amount: {
        type: "number",
        description:
          "顧客が見積もる請求金額（日本円 / JPY）。おおよその金額でよい。金額が出た時点でこの項目だけで送ること。",
        exclusiveMinimum: 0,
      },
      description: {
        type: "string",
        description:
          "何が起きたかの簡単な説明。顧客自身の言葉（日本語でよい）。状況を話してくれた時点で、他の項目がそろう前でも送ること。",
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
    "給付金請求を確定（送信）する。入力内容を顧客に読み上げて確認を取ってからのみ呼ぶこと。",
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
    "契約一覧の画面に戻る。顧客が誤った契約を選んでしまい、選び直したいときに呼ぶこと。",
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
  description: "契約一覧の画面から、新しい給付金請求を始める。",
  schema: { type: "object", properties: {} },
  handler: () => {
    startOver();
  },
});

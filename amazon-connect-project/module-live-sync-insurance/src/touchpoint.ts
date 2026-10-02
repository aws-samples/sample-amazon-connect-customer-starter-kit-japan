import { useEffect } from "react";
import { create } from "@amazon-connect-touchpoint/web";
import type {
  LiveSyncCustomAction,
  TouchpointConfiguration,
  TouchpointInstance,
} from "@amazon-connect-touchpoint/web";
import type { AppConfig } from "./config";
// Vite resolves an asset import to its URL, which is what `brandIcon` wants.
// Committed under `src/` rather than `public/` so it gets hashed and fingerprinted
// with the rest of the bundle.
import brandIcon from "./CustomerAI_Icon_Primary_Cropped.png";
import launchIcon from "./CustomerAI_Icon_Primary_Cropped.png";

/**
 * Touchpoint まわり一式: 設定オブジェクトの組み立て、マウント、そして 1 ステップ
 * ごとの `sendContext()`（scope とアクションの双方向コントラクト）。アクション本体は
 * `actions.ts`。
 *
 * 設定値は、起動時に解決した実行時設定（`AppConfig`、`config.ts` 参照。設定源は
 * `acxd_config.json` の唯一 1 つ）を `mount(config)` で受け取る。これにより、
 * ビルドし直さずに `acxd_config.json` を差し替えるだけで接続先を変更できる。
 *
 * SDK の使用面は小さい: `create()` / `sendContext()` / `teardown()`。
 */

/* Configuration ------------------------------------------------------------- */

/**
 * StartWebRTCContact に渡すユーザー定義コンタクト属性を実行時設定から組み立てる。
 * 値が未指定（空）の属性は送らない（Connect 側で NULL 相当）。
 *
 * 受け取り側（コンタクトフロー / ACXD の Agentic CX ブロック）:
 *   - customerId        → $.Attributes.customerId
 *   - customerName      → $.Attributes.customerName
 *   - customerOtherInfo → $.Attributes.customerOtherInfo（汎用。任意）
 */
const buildContactAttributes = (config: AppConfig): Record<string, string> => {
  const raw: Record<string, string> = {
    customerId: config.customerId,
    customerName: config.customerName,
    customerOtherInfo: config.customerOtherInfo,
  };
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const trimmed = value?.trim();
    if (trimmed != null && trimmed !== "") {
      attributes[key] = trimmed;
    }
  }
  return attributes;
};

/** 実行時設定から Touchpoint の設定オブジェクトを組み立てる。 */
const buildTouchpointConfiguration = (
  config: AppConfig,
): TouchpointConfiguration => ({
  // Amazon Connect: どのインスタンス／フローでコンタクトを開始するか、その
  // エンドポイント。音声体験なので StartWebRTCContact エンドポイントは必須。
  config: {
    instanceId: config.connectInstanceId,
    contactFlowId: config.connectContactFlowId,
    region: config.connectRegion,
    participantDisplayName: config.customerName.trim() || "お客様",
    voiceEndpoint: config.connectVoiceEndpoint,
    contactAttributes: buildContactAttributes(config),
  },

  // Live Sync: 公開済み ACXD アプリの 2 つのキー。これがアシスタントにページを
  // 見せ・操作させる。
  liveSync: {
    deploymentKey: config.liveSyncDeploymentKey,
    apiKey: config.liveSyncApiKey,
  },

  // Presentation.
  input: "voiceMini",
  windowSize: "floating",
  colorMode: "light",
  animate: true,
  brandIcon,
  launchIcon,
  theme: {
    accent: "#1c63da",
    fontFamily: "'Amazon Ember', system-ui, sans-serif",
  },
});

/* Mounting ------------------------------------------------------------------ */

let instance: TouchpointInstance | null = null;

/** What the mounted screen last declared, replayed once there is an instance. */
let declared: { scopes: string[]; actions: LiveSyncCustomAction[] } | null =
  null;

/**
 * Touchpoint をマウントする。Connect / Live Sync が設定を拒否したら throw し、
 * アプリはその旨を表示する（アシスタント無しで進めない）。解決済みの実行時設定を
 * 受け取る。
 */
export const mount = async (config: AppConfig): Promise<void> => {
  teardown();
  instance = await create(buildTouchpointConfiguration(config));
  if (declared != null) {
    await instance.sendContext(declared);
  }
};

/** Removes the mounted instance, if there is one. */
export const teardown = (): void => {
  try {
    instance?.teardown();
  } catch {
    // Already detached.
  }
  instance = null;
};

/* Where the customer is ----------------------------------------------------- */

/** 顧客が今どのステップにいるか。`home` は会員サイトのトップ。 */
export type Step = "home" | "policies" | "claim" | "submitted";

/**
 * 各ステップの scope タグ。そのステップのアクションと一緒に送られ、ACXD の
 * Live Sync ノードのツールをそのステップに絞る。
 *
 * scope の第 1 タグは体験全体を表す `benefit_claim`（旧デモの `fnol` に相当）。
 * ACXD 側の scope 設定とこの値を一致させること。
 */
const scopesForStep = (step: Step): string[] => {
  if (step === "home") {
    return ["benefit_claim", "member_home"];
  }
  if (step === "policies") {
    return ["benefit_claim", "policy_selection"];
  }
  if (step === "claim") {
    return ["benefit_claim", "claim_details"];
  }
  return ["benefit_claim", "claim_submitted"];
};

/* What the assistant knows and may do --------------------------------------- */

/**
 * Declares the whole bidirectional contract for the page that calls this, in one
 * `sendContext` call: the scope tags that narrow the Live Sync node's tools to
 * this step, and the actions the assistant may invoke while this page is mounted.
 * Every page of the claim flow calls this once, at the top of its component.
 * `Setup.tsx` is the exception: Touchpoint is never mounted in that state, so
 * there is nothing to declare to.
 *
 * Sending them together is the point. The SDK merges each call into one context
 * and holds a single set at a time, so a page that sent only its actions would
 * leave the previous step's scopes in place until something else corrected them —
 * a window where the assistant sees this page's actions under the last page's
 * scopes. One call per step closes it, and makes the mounted page the single
 * definition of both what the assistant can see and what it can do.
 *
 * `actions` must be stable between renders (`useMemo`), since a new array is a
 * new declaration.
 */
export const useLiveSyncContext = (
  step: Step,
  actions: LiveSyncCustomAction[],
): void => {
  useEffect(() => {
    declared = { scopes: scopesForStep(step), actions };
    // A no-op before `mount()` resolves; `mount` replays what was declared.
    void instance?.sendContext(declared);
  }, [step, actions]);
};

/**
 * 実行時設定（Runtime configuration）。
 *
 * 設定源は `acxd_config.json` の**唯一 1 つ**。`.env` は廃止した。ローカル開発
 * （npm run dev）も本番（S3）も、同じ `acxd_config.json` を編集するだけで動く。
 *
 *   - ローカル: `static/acxd_config.json`（publicDir なので dev でも配信される）
 *   - 本番:     配布先 `live-sync-insurance/acxd_config.json`（S3 上で差し替え可）
 *
 * ビルド時に接続情報を JS に焼き込まないため、配布物（public/）に実キーが埋め込ま
 * れることはない。実キーは常に実行時の JSON からのみ読む。
 *
 * 必須項目が空なら Setup 画面でその旨を表示する（判定は main.tsx 側）。
 *
 * 使い方: アプリ起動時に一度だけ `loadConfig()` を呼び、解決済みの設定を
 * touchpoint.ts / api.ts へ渡す。
 */

/** アプリが必要とする設定の形。すべて文字列（未設定は ""）。 */
export interface AppConfig {
  connectInstanceId: string;
  connectContactFlowId: string;
  connectRegion: string;
  connectVoiceEndpoint: string;
  liveSyncDeploymentKey: string;
  liveSyncApiKey: string;
  customerId: string;
  customerName: string;
  customerOtherInfo: string;
}

/** AppConfig のキー一覧（acxd_config.json のキーと同名・camelCase）。 */
const CONFIG_KEYS: Array<keyof AppConfig> = [
  "connectInstanceId",
  "connectContactFlowId",
  "connectRegion",
  "connectVoiceEndpoint",
  "liveSyncDeploymentKey",
  "liveSyncApiKey",
  "customerId",
  "customerName",
  "customerOtherInfo",
];

/** 全項目空の AppConfig。JSON が読めなかったときの初期値。 */
const emptyConfig = (): AppConfig => ({
  connectInstanceId: "",
  connectContactFlowId: "",
  connectRegion: "",
  connectVoiceEndpoint: "",
  liveSyncDeploymentKey: "",
  liveSyncApiKey: "",
  customerId: "",
  customerName: "",
  customerOtherInfo: "",
});

/**
 * `acxd_config.json` を fetch する。`base`（Vite の BASE_URL）基準で取りに行くので、
 * 配布先が /live-sync-insurance/ でもルート直下でも同じ 1 行で済む。
 */
const fetchRuntimeConfig = async (): Promise<Partial<AppConfig> | null> => {
  const url = `${import.meta.env.BASE_URL}acxd_config.json`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null) {
      return null;
    }
    return data as Partial<AppConfig>;
  } catch {
    return null;
  }
};

const isFilled = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

/**
 * 実行時設定を解決する。設定源は `acxd_config.json` のみ。読めなければ全項目空
 * （＝ Setup 画面が出る）。アプリ起動時に一度だけ呼ぶ。
 */
export const loadConfig = async (): Promise<AppConfig> => {
  const config = emptyConfig();
  const runtime = await fetchRuntimeConfig();
  if (runtime == null) {
    return config;
  }
  for (const key of CONFIG_KEYS) {
    const value = runtime[key];
    if (isFilled(value)) {
      config[key] = value.trim();
    }
  }
  return config;
};

/**
 * アプリが動くために「空であってはならない」設定。customer 系は任意なので
 * 含めない。main.tsx がこれを使って Setup 画面の要否を判定する。
 */
export const requiredConfigKeys: Array<{
  key: keyof AppConfig;
  name: string;
  what: string;
}> = [
  {
    key: "connectInstanceId",
    name: "connectInstanceId",
    what: "Amazon Connect インスタンス ID。",
  },
  {
    key: "connectContactFlowId",
    name: "connectContactFlowId",
    what: "Touchpoint が開始するコンタクトフローの ID（UUID のみ）。",
  },
  {
    key: "connectRegion",
    name: "connectRegion",
    what: "インスタンスのリージョン。例: ap-northeast-1。",
  },
  {
    key: "connectVoiceEndpoint",
    name: "connectVoiceEndpoint",
    what: "StartWebRTCContact のエンドポイント。音声のため必須。",
  },
  {
    key: "liveSyncDeploymentKey",
    name: "liveSyncDeploymentKey",
    what: "公開済み ACXD アプリの Deployment key。",
  },
  {
    key: "liveSyncApiKey",
    name: "liveSyncApiKey",
    what: "同じ設定ページの API key。",
  },
];

/** 必須設定のうち未設定のものを返す。 */
export const missingRequired = (
  config: AppConfig,
): Array<{ name: string; what: string }> =>
  requiredConfigKeys
    .filter((entry) => !isFilled(config[entry.key]))
    .map(({ name, what }) => ({ name, what }));

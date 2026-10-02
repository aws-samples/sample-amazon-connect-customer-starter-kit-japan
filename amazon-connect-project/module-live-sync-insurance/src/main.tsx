import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  fetchPolicies,
  getCustomerId,
  getCustomerName,
  initApi,
  submitClaim,
} from "./api";
import {
  emptyDraft,
  toClaimRequest,
  validate,
  type ClaimDraft,
  type ClaimErrors,
  type ClaimRequest,
  type ClaimResponse,
  type Policy,
} from "./claim";
import { loadConfig, missingRequired, type AppConfig } from "./config";
import { AlertIcon, CheckIcon, ShieldIcon } from "./icons";
import { focusFragment, navigate, paths, redirect, useRoute } from "./router";
import { ClaimForm } from "./screens/ClaimForm";
import { Confirmation } from "./screens/Confirmation";
import { Home } from "./screens/Home";
import { PolicyPicker } from "./screens/PolicyPicker";
import { Setup } from "./screens/Setup";
import { mount, teardown, type Step } from "./touchpoint";
import "./styles.css";

/**
 * アプリ全体: マイページ → 契約一覧 → 給付金請求 → 受付完了 と、その 3 ステップを
 * アシスタントが操作できる Touchpoint インスタンス。
 *
 * どのステップを表示するかは URL（`router.ts`）から決まる。読み込んだ契約・入力中の
 * 控え・受け付けた請求は、この main が唯一の真実として持ち、リンク/ボタンと
 * アシスタントのアクションは同じハンドラに集約される。
 *
 * 契約データと請求受付は `api.ts` のモックで完結する（バックエンド不要）。ただし
 * Live Sync の連動そのものは本物（Amazon Connect + ACXD）で動作する。
 */

const companyName = "AnyCompany Insurance";

/* ページ枠 ------------------------------------------------------------------ */

/** 上部メインナビのタブ。給付金請求関連のみ機能し、他はハリボテ（無効）。 */
const navTabs: Array<{ label: string; href?: string }> = [
  { label: "病気の予防" },
  { label: "治療と介護" },
  { label: "暮らしが変わるとき" },
  { label: "保険・年金・ローン" },
  { label: "手続きのご案内", href: paths.home },
  { label: "契約内容の照会", href: paths.policies },
  { label: "ライフプランナー" },
];

/** パンくずの文言（ステップごと）。 */
const breadcrumbForStep = (step: Step): string => {
  if (step === "home") {
    return "トップページ";
  }
  if (step === "policies") {
    return "トップページ ＞ 契約内容の照会";
  }
  if (step === "claim") {
    return "トップページ ＞ 契約内容の照会 ＞ 給付金請求";
  }
  return "トップページ ＞ 契約内容の照会 ＞ 給付金請求 ＞ 受付完了";
};

const Shell: FC<{
  step?: Step;
  nav?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}> = ({ step = "home", nav, footer, children }) => (
  <div className="min-h-dvh bg-canvas antialiased">
    <a
      className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      href="#main"
      onClick={focusFragment}
    >
      本文へスキップ
    </a>

    {/* 上部ユーティリティ帯 */}
    <div className="bg-[#eef1f4] text-ink-soft">
      <div className="mx-auto flex max-w-6xl justify-end gap-5 px-4 py-1.5 text-xs sm:px-6">
        <span className="cursor-default hover:text-ink">用語集</span>
        <span className="cursor-default hover:text-ink">操作ヘルプ</span>
        <span className="cursor-default hover:text-ink">よくあるご質問</span>
      </div>
    </div>

    {/* 白ヘッダー: ロゴ + ユーザー */}
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <a
          href={paths.home}
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-accent no-underline"
        >
          <ShieldIcon className="size-6 shrink-0" />
          {companyName}
        </a>
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span className="hidden sm:inline">{getCustomerName()} 様</span>
          <span className="btn btn-quiet cursor-default px-3 py-1.5 text-xs">
            ログアウト
          </span>
        </div>
      </div>
    </header>

    {/* 青いメインナビタブ */}
    <nav className="bg-accent" aria-label="メインメニュー">
      <div className="mx-auto flex max-w-6xl flex-wrap px-1 sm:px-4">
        {navTabs.map((tab) => {
          const isCurrent =
            (tab.href === paths.home && step === "home") ||
            (tab.href === paths.policies && step !== "home");
          const cls =
            "px-3 py-2.5 text-sm text-white/95 no-underline transition-colors hover:bg-accent-hover sm:px-4";
          return tab.href != null ? (
            <a
              key={tab.label}
              href={tab.href}
              className={`${cls} ${isCurrent ? "bg-accent-hover font-semibold" : ""}`}
              aria-current={isCurrent ? "page" : undefined}
            >
              {tab.label}
            </a>
          ) : (
            <span
              key={tab.label}
              className={`${cls} cursor-default opacity-90`}
            >
              {tab.label}
            </span>
          );
        })}
      </div>
    </nav>

    {/* パンくず */}
    <div className="border-b border-line bg-accent-soft">
      <div className="mx-auto max-w-6xl px-4 py-2 text-xs text-ink-soft sm:px-6">
        {breadcrumbForStep(step)}
      </div>
    </div>

    {/* コンテンツ */}
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-32 sm:px-6 sm:pt-8 sm:pb-24">
      {nav != null ? <div className="mb-5 flex justify-end">{nav}</div> : null}
      <main
        className="rounded-panel border border-line bg-surface p-5 shadow-xs focus-visible:outline-offset-4 sm:p-7"
        id="main"
        tabIndex={-1}
      >
        {children}
      </main>

      <footer className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-center text-[0.8125rem] text-ink-soft sm:justify-start sm:text-left">
        {footer}
      </footer>
    </div>
  </div>
);

/* アプリ本体 ---------------------------------------------------------------- */

const describe = (value: unknown): string =>
  value instanceof Error ? value.message : String(value);

/** 進捗ナビに出す請求フローのステップ。 */
const steps: Array<{ id: Step; label: string }> = [
  { id: "policies", label: "契約選択" },
  { id: "claim", label: "内容入力" },
  { id: "submitted", label: "受付完了" },
];

const App: FC<{ config: AppConfig }> = ({ config }) => {
  const route = useRoute();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [policiesError, setPoliciesError] = useState<string | null>(null);

  const [draft, setDraft] = useState<ClaimDraft>(emptyDraft);
  const [showErrors, setShowErrors] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    claim: ClaimRequest;
    response: ClaimResponse;
  } | null>(null);

  const [assistantReady, setAssistantReady] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [mountAttempt, setMountAttempt] = useState(0);

  const step: Step =
    route.name === "confirmation"
      ? "submitted"
      : route.name === "home"
        ? "home"
        : route.name;

  const selectedPolicyId = route.name === "claim" ? route.policyId : null;

  const selectedPolicy = useMemo(
    () =>
      policies.find((policy) => policy.policyId === selectedPolicyId) ?? null,
    [policies, selectedPolicyId],
  );

  const errors: ClaimErrors = useMemo(
    () => (selectedPolicy == null ? {} : validate(draft)),
    [draft, selectedPolicy],
  );

  const latest = useRef({ selectedPolicy, draft });
  latest.current = { selectedPolicy, draft };

  const loadPolicies = useCallback(async (): Promise<void> => {
    setLoadingPolicies(true);
    setPoliciesError(null);
    try {
      setPolicies(await fetchPolicies());
    } catch (error) {
      setPoliciesError(describe(error));
    } finally {
      setLoadingPolicies(false);
    }
  }, []);

  const updateDraft = useCallback((patch: Partial<ClaimDraft>): void => {
    setDraft((previous) => ({ ...previous, ...patch }));
  }, []);

  const runSubmit = useCallback(async (): Promise<void> => {
    const { draft: current, selectedPolicy: policy } = latest.current;
    if (policy == null) {
      return;
    }
    if (Object.keys(validate(current)).length > 0) {
      setShowErrors(true);
      return;
    }

    const claim = toClaimRequest(current, policy);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await submitClaim(claim);
      setResult({ claim, response });
    } catch (error) {
      setSubmitError(describe(error));
    } finally {
      setSubmitting(false);
    }
  }, []);

  const submit = useCallback((): void => {
    void runSubmit();
  }, [runSubmit]);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  // ハッシュが空の初回訪問には、マイページのアドレスを与える。
  useEffect(() => {
    if (window.location.hash === "") {
      redirect(paths.home);
    }
  }, []);

  // 請求が確定したら受付完了へ。コミット後に遷移する。
  useEffect(() => {
    if (result != null) {
      navigate(paths.confirmation);
    }
  }, [result]);

  // 手入力/古い URL のガード: 請求フォームには存在する契約が要り、受付完了には
  // 実際に受け付けた請求が要る。
  useEffect(() => {
    if (
      route.name === "claim" &&
      !loadingPolicies &&
      policiesError == null &&
      selectedPolicy == null
    ) {
      redirect(paths.policies);
    }
    if (route.name === "confirmation" && result == null) {
      redirect(paths.policies);
    }
  }, [route, loadingPolicies, policiesError, selectedPolicy, result]);

  // 受付完了後に契約一覧へ戻ったら、次の請求のためにクリアする。
  useEffect(() => {
    if (route.name === "policies" && result != null) {
      setDraft(emptyDraft);
      setShowErrors(false);
      setSubmitError(null);
      setResult(null);
    }
  }, [route, result]);

  // 契約を切り替えたら検証をやり直す。
  useEffect(() => {
    setShowErrors(false);
    setSubmitError(null);
  }, [selectedPolicyId]);

  // ページの生存期間中は Touchpoint インスタンスを 1 つ保つ。
  useEffect(() => {
    let cancelled = false;
    setAssistantError(null);
    void mount(config)
      .then(() => {
        if (!cancelled) {
          setAssistantReady(true);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAssistantReady(false);
          setAssistantError(describe(error));
        }
      });
    return () => {
      cancelled = true;
      teardown();
    };
  }, [mountAttempt]);

  const showProgress = step !== "home";
  const activeStep = steps.findIndex((entry) => entry.id === step);

  const hrefForStep = (entry: { id: Step }): string | null => {
    if (entry.id === "policies") {
      return paths.policies;
    }
    if (entry.id === "claim") {
      return selectedPolicyId != null ? paths.claim(selectedPolicyId) : null;
    }
    return result != null ? paths.confirmation : null;
  };

  return (
    <Shell
      step={step}
      nav={
        showProgress ? (
          <nav aria-label="進捗">
            <ol className="flex items-center gap-1.5 text-[0.8125rem] text-ink-soft sm:gap-2.5">
              {steps.map((entry, index) => {
                const href = hrefForStep(entry);
                const current = index === activeStep;
                const reached = index <= activeStep;
                const done = index < activeStep;
                const label = (
                  <>
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full border text-[0.6875rem] font-semibold transition-colors ${
                        reached
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-line bg-surface"
                      }`}
                      aria-hidden="true"
                    >
                      {done ? <CheckIcon className="size-3" /> : index + 1}
                    </span>
                    <span className="whitespace-nowrap">{entry.label}</span>
                  </>
                );
                const inner = "flex items-center gap-1.5";

                return (
                  <li
                    key={entry.id}
                    className={`flex items-center gap-1.5 sm:gap-2.5 ${
                      current ? "font-semibold text-ink" : ""
                    } ${reached && !current ? "text-ink" : ""}`}
                  >
                    {index > 0 ? (
                      <span
                        className={`h-px w-3 shrink-0 sm:w-5 ${
                          reached ? "bg-accent/40" : "bg-line"
                        }`}
                        aria-hidden="true"
                      />
                    ) : null}

                    {current || href == null ? (
                      <span
                        className={inner}
                        aria-current={current ? "step" : undefined}
                      >
                        {label}
                      </span>
                    ) : (
                      <a
                        className={`${inner} rounded no-underline transition-colors hover:text-accent hover:underline hover:underline-offset-4`}
                        href={href}
                      >
                        {label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null
      }
      footer={
        assistantReady ? (
          <span>
            Live Sync 接続済み・お客様番号 <code>{getCustomerId()}</code>
          </span>
        ) : assistantError != null ? (
          <span>Live Sync 未接続。</span>
        ) : (
          <span>アシスタントを起動しています…</span>
        )
      }
    >
      {assistantError != null ? (
        <div
          className="mb-6 flex gap-2.5 rounded-lg border border-danger-line bg-danger-soft px-4 py-3.5 text-danger"
          role="alert"
        >
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">
            <p>
              <strong className="font-semibold">
                アシスタントを起動できませんでした。
              </strong>{" "}
              {assistantError}
            </p>
            <p className="mt-1">
              <code>acxd_config.json</code> の Connect / Live Sync の値を確認してください。
            </p>
            <button
              type="button"
              className="btn btn-quiet mt-3 w-full sm:w-auto"
              onClick={() => setMountAttempt((attempt) => attempt + 1)}
            >
              再試行
            </button>
          </div>
        </div>
      ) : null}

      {step === "home" ? <Home /> : null}

      {step === "policies" ? (
        <PolicyPicker
          policies={policies}
          loading={loadingPolicies}
          error={policiesError}
          onRetry={() => void loadPolicies()}
        />
      ) : null}

      {step === "claim" && selectedPolicy != null ? (
        <ClaimForm
          policy={selectedPolicy}
          draft={draft}
          errors={showErrors ? errors : {}}
          submitting={submitting}
          submitError={submitError}
          onChange={updateDraft}
          onSubmit={submit}
        />
      ) : null}

      {step === "submitted" && result != null ? (
        <Confirmation claim={result.claim} response={result.response} />
      ) : null}
    </Shell>
  );
};

/* マウント ------------------------------------------------------------------ */

const host = document.getElementById("root");
if (host == null) {
  throw new Error("Root element (#root) is missing from index.html");
}

const root = createRoot(host);

// 実行時設定（acxd_config.json）を解決してからレンダリングする。設定 API に
// 注入してから、必須設定の充足を判定してアプリ本体か Setup 画面かを出し分ける。
void loadConfig().then((config) => {
  initApi(config);
  const missing = missingRequired(config);

  root.render(
    missing.length === 0 ? (
      <App config={config} />
    ) : (
      <Shell
        footer={
          <span>
            設定が {missing.length} 件不足しています（
            <code>acxd_config.json</code>）。
          </span>
        }
      >
        <Setup missing={missing} />
      </Shell>
    ),
  );
});

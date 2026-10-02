import { useMemo, type FC } from "react";
import { selectPolicyAction } from "../actions";
import {
  availableClaimTypes,
  formatCurrency,
  formatDate,
  humanize,
  type Policy,
} from "../claim";
import { AlertIcon, ArrowRightIcon } from "../icons";
import { navigate, paths } from "../router";
import { useLiveSyncContext } from "../touchpoint";
import {
  alertBox,
  blockOnMobile,
  factsGrid,
  heading2,
  lead,
  panelBox,
} from "./shared";

/**
 * ステップ 1: どの契約か。契約ごとにカードを表示する。医療保険は請求フォームへの
 * リンク、生命保険（請求不可）はグレーアウトしたボタンにする。
 *
 * Live Sync context: scope は `benefit_claim` / `policy_selection`、アクションは
 * `select_policy` の 1 つ。アクション配列は `useMemo` でメモ化し、毎レンダリングで
 * 新しい参照にならないようにする（steering 3.3 の `undefined action` 対策）。
 */

interface PolicyPickerProps {
  policies: Policy[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** 給付内容の要約（例: 「入院・手術・通院」）。 */
const benefitSummary = (policy: Policy): string => {
  const labels = availableClaimTypes(policy).map((type) =>
    type.label.replace("給付金", ""),
  );
  return labels.length > 0 ? labels.join("・") : "—";
};

const PolicyCard: FC<{ policy: Policy }> = ({ policy }) => {
  const headingId = `policy-${policy.policyId}`;
  const active = policy.status.toLowerCase() === "active";
  const claimable = policy.claimable;

  return (
    <li
      className={`group relative rounded-panel border bg-surface p-4 transition duration-150 sm:p-5 ${
        claimable
          ? "border-line hover:border-accent/60 hover:shadow-md focus-within:border-accent focus-within:shadow-md"
          : "border-line"
      }`}
    >
      <article aria-labelledby={headingId}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              id={headingId}
              className="text-[1.0625rem] font-semibold text-ink"
            >
              {policy.policyType}
            </h3>
            <p className="mt-0.5 text-sm text-ink-soft">
              証券番号 <span className="font-mono">{policy.policyId}</span>
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              active ? "bg-ok-soft text-ok" : "bg-canvas text-ink-soft"
            }`}
          >
            {humanize(policy.status)}
          </span>
        </div>

        <dl className={`${factsGrid} my-4`}>
          <div>
            <dt>保障期間満了</dt>
            <dd>
              <time dateTime={policy.expirationDate}>
                {formatDate(policy.expirationDate)}
              </time>
            </dd>
          </div>
          <div>
            <dt>保険料</dt>
            <dd>
              {formatCurrency(policy.premium)}{" "}
              <span className="font-normal text-ink-soft">
                {humanize(policy.premiumFrequency)}
              </span>
            </dd>
          </div>
          <div>
            <dt>請求可能な給付</dt>
            <dd>{benefitSummary(policy)}</dd>
          </div>
        </dl>

        {claimable ? (
          <a
            className={`btn btn-primary ${blockOnMobile} after:absolute after:inset-0 after:rounded-panel after:content-[''] sm:self-start`}
            href={paths.claim(policy.policyId)}
          >
            給付金を請求する
            <span className="sr-only"> （{policy.policyType}）</span>
            <ArrowRightIcon className="size-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </a>
        ) : (
          <div>
            <button
              type="button"
              className={`btn btn-primary ${blockOnMobile} sm:self-start cursor-not-allowed opacity-50`}
              disabled
              aria-disabled="true"
              title="この契約はオンラインでの給付金請求に対応していません"
            >
              給付金を請求する
            </button>
            <p className="mt-2 text-xs text-ink-soft">
              この契約はオンラインでの給付金請求に対応していません。
            </p>
          </div>
        )}
      </article>
    </li>
  );
};

/** カード形状のプレースホルダ（読み込み中）。 */
const PolicyCardSkeleton: FC = () => (
  <li aria-hidden="true" className={panelBox}>
    <div className="animate-pulse space-y-4 motion-reduce:animate-none">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2">
          <div className="h-4 w-2/5 rounded bg-line" />
          <div className="h-3 w-3/5 rounded bg-line/70" />
        </div>
        <div className="h-5 w-16 shrink-0 rounded-full bg-line/70" />
      </div>
      <div className={factsGrid}>
        <div className="h-8 rounded bg-line/50" />
        <div className="h-8 rounded bg-line/50" />
        <div className="h-8 rounded bg-line/50" />
      </div>
      <div className="h-11 w-full rounded-lg bg-line/60 sm:w-36" />
    </div>
  </li>
);

export const PolicyPicker: FC<PolicyPickerProps> = ({
  policies,
  loading,
  error,
  onRetry,
}) => {
  // 契約選択は「ナビゲーション」なので、アシスタントもカードと同じリンクをたどる。
  // enum に渡すのは請求可能な契約のみ（生命保険は選ばせない）。
  const actions = useMemo(
    () => [
      selectPolicyAction(
        policies.filter((policy) => policy.claimable),
        (policyId) => navigate(paths.claim(policyId)),
      ),
    ],
    [policies],
  );
  useLiveSyncContext("policies", actions);

  return (
    <section aria-labelledby="policies-heading">
      <h2 id="policies-heading" className={heading2}>
        どのご契約に関するお手続きですか？
      </h2>
      <p className={lead}>
        給付金を請求するご契約をお選びください。
      </p>

      <p className="sr-only" role="status">
        {loading ? "ご契約を読み込んでいます…" : ""}
      </p>

      {error != null ? (
        <div
          className={`${alertBox} mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
          role="alert"
        >
          <p className="flex items-start gap-2 text-sm font-medium">
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
          <button
            type="button"
            className={`btn btn-quiet shrink-0 ${blockOnMobile}`}
            onClick={onRetry}
          >
            再試行
          </button>
        </div>
      ) : null}

      {!loading && error == null && policies.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-line-strong bg-canvas p-5 text-center text-sm text-ink-soft">
          ご契約が見つかりませんでした。
        </p>
      ) : null}

      <ul className="mt-5 grid gap-3 sm:gap-4">
        {loading && policies.length === 0 ? (
          <>
            <PolicyCardSkeleton />
            <PolicyCardSkeleton />
          </>
        ) : (
          policies.map((policy) => (
            <PolicyCard key={policy.policyId} policy={policy} />
          ))
        )}
      </ul>
    </section>
  );
};

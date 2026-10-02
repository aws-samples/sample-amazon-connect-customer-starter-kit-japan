import {
  useEffect,
  useMemo,
  useRef,
  type ChangeEvent,
  type FC,
  type FormEvent,
} from "react";
import {
  changePolicyAction,
  fillClaimAction,
  submitClaimAction,
} from "../actions";
import {
  availableClaimTypes,
  formatCurrency,
  formatDate,
  today,
  type ClaimDraft,
  type ClaimErrors,
  type Policy,
} from "../claim";
import { AlertIcon, ArrowLeftIcon, SpinnerIcon } from "../icons";
import { focusFragment, navigate, paths } from "../router";
import { useLiveSyncContext } from "../touchpoint";
import {
  actionRow,
  alertBox,
  blockOnMobile,
  factsGrid,
  heading2,
  lead,
  panelBox,
} from "./shared";

/**
 * ステップ 2: 給付金請求の内容。4 項目と送信。
 *
 * Live Sync context: scope は `benefit_claim` / `claim_details`、アクションは
 * `fill_claim_details` / `submit_claim` / `change_policy` の 3 つ。アクション配列は
 * `useMemo` でメモ化する（steering 3.3）。状態は持たず、`main.tsx` が draft を所有
 * するため、キー入力と発話は同じ経路を通る。
 */

interface ClaimFormProps {
  policy: Policy;
  draft: ClaimDraft;
  errors: ClaimErrors;
  submitting: boolean;
  submitError: string | null;
  onChange: (patch: Partial<ClaimDraft>) => void;
  onSubmit: () => void;
}

/** エラーサマリの並び順と、各エラーのリンク先。 */
const fieldOrder: Array<{ field: keyof ClaimDraft; anchor: string }> = [
  { field: "claimType", anchor: "claimType" },
  { field: "incidentDate", anchor: "incidentDate" },
  { field: "amount", anchor: "amount" },
  { field: "description", anchor: "description" },
];

const FieldError: FC<{ id: string; children: string }> = ({ id, children }) => (
  <p className="field-error" id={id}>
    <AlertIcon className="mt-px size-3.5 shrink-0" />
    {children}
  </p>
);

export const ClaimForm: FC<ClaimFormProps> = ({
  policy,
  draft,
  errors,
  submitting,
  submitError,
  onChange,
  onSubmit,
}) => {
  const summary = useRef<HTMLDivElement>(null);
  const listed = fieldOrder.filter(({ field }) => errors[field] != null);

  // 入力・送信は控えと同じ `onChange` / `onSubmit` を通り、契約変更は上部のリンク。
  // scope と一緒に 1 回の呼び出しで送る。配列は useMemo でメモ化（steering 3.3）。
  const actions = useMemo(
    () => [
      fillClaimAction(policy, onChange),
      submitClaimAction(onSubmit),
      changePolicyAction(() => navigate(paths.policies)),
    ],
    [policy, onChange, onSubmit],
  );
  useLiveSyncContext("claim", actions);

  useEffect(() => {
    if (listed.length > 0) {
      summary.current?.focus();
    }
  }, [listed.length]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit();
  };

  const setField =
    (field: keyof ClaimDraft) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ): void => {
      onChange({ [field]: event.target.value });
    };

  const describedBy = (
    field: keyof ClaimDraft,
    hintId?: string,
  ): string | undefined => (errors[field] != null ? `${field}-error` : hintId);

  return (
    <section aria-labelledby="claim-heading">
      <p className="mb-2">
        <a
          className="-ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-sm text-ink-soft no-underline transition-colors hover:text-ink"
          href={paths.policies}
        >
          <ArrowLeftIcon className="size-4 shrink-0" />
          別の契約を選ぶ
        </a>
      </p>

      <h2 id="claim-heading" className={heading2}>
        給付金請求の内容を教えてください
      </h2>
      <p className={lead}>
        4 つの項目にご回答ください。概算で構いません。詳細は担当者が確認いたします。
      </p>

      <dl className={`${factsGrid} mt-4 bg-canvas ${panelBox}`}>
        <div>
          <dt>証券番号</dt>
          <dd className="font-mono break-all">{policy.policyId}</dd>
        </div>
        <div>
          <dt>商品名</dt>
          <dd>{policy.policyType}</dd>
        </div>
        <div>
          <dt>保障期間</dt>
          <dd>
            <time dateTime={policy.effectiveDate}>
              {formatDate(policy.effectiveDate)}
            </time>{" "}
            〜{" "}
            <time dateTime={policy.expirationDate}>
              {formatDate(policy.expirationDate)}
            </time>
          </dd>
        </div>
      </dl>

      <form className="mt-6 grid gap-6" onSubmit={handleSubmit} noValidate>
        {listed.length > 0 ? (
          <div
            className={`${alertBox} focus-visible:outline-danger`}
            role="alert"
            tabIndex={-1}
            ref={summary}
            aria-labelledby="error-summary-heading"
          >
            <h3
              id="error-summary-heading"
              className="flex items-center gap-2 text-[0.9375rem] font-semibold"
            >
              <AlertIcon className="size-4 shrink-0" />
              {listed.length} 件の入力を確認してください
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-9 text-sm">
              {listed.map(({ field, anchor }) => (
                <li key={field}>
                  <a
                    href={`#${anchor}`}
                    onClick={focusFragment}
                    className="underline decoration-danger/40 underline-offset-4 hover:decoration-danger"
                  >
                    {errors[field]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <fieldset
          className="min-w-0"
          aria-describedby={describedBy("claimType")}
          aria-invalid={errors.claimType != null}
        >
          <legend className="field-label mb-2">給付種類</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {availableClaimTypes(policy).map((type, index) => (
              <label
                key={type.value}
                htmlFor={index === 0 ? "claimType" : `claimType-${type.value}`}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-surface p-3.5 transition-colors duration-150 hover:border-line-strong hover:bg-canvas has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:ring-1 has-[:checked]:ring-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
              >
                <input
                  id={index === 0 ? "claimType" : `claimType-${type.value}`}
                  type="radio"
                  name="claimType"
                  value={type.value}
                  required
                  checked={draft.claimType === type.value}
                  onChange={setField("claimType")}
                  className="mt-1 size-4 shrink-0 accent-accent"
                />
                <span className="min-w-0">
                  <strong className="block text-[0.9375rem] font-semibold text-ink">
                    {type.label}
                  </strong>
                  <span className="block text-sm text-ink-soft">
                    {type.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {errors.claimType != null ? (
            <div className="mt-2">
              <FieldError id="claimType-error">{errors.claimType}</FieldError>
            </div>
          ) : null}
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid min-w-0 gap-1.5">
            <label className="field-label" htmlFor="incidentDate">
              入院日・手術日など
            </label>
            <input
              className="input"
              id="incidentDate"
              name="incidentDate"
              type="date"
              required
              max={today()}
              value={draft.incidentDate}
              onChange={setField("incidentDate")}
              aria-invalid={errors.incidentDate != null}
              aria-describedby={describedBy(
                "incidentDate",
                "incidentDate-hint",
              )}
            />
            {errors.incidentDate != null ? (
              <FieldError id="incidentDate-error">
                {errors.incidentDate}
              </FieldError>
            ) : (
              <p className="field-hint" id="incidentDate-hint">
                治療を受けた日。
              </p>
            )}
          </div>

          <div className="grid min-w-0 gap-1.5">
            <label className="field-label" htmlFor="amount">
              請求金額の見込み
            </label>
            <div className="relative">
              <input
                className="input pr-10"
                id="amount"
                name="amount"
                type="number"
                inputMode="numeric"
                required
                min="1"
                step="1"
                placeholder="0"
                autoComplete="off"
                value={draft.amount}
                onChange={setField("amount")}
                aria-invalid={errors.amount != null}
                aria-describedby={describedBy("amount", "amount-hint")}
              />
              <span
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-soft"
                aria-hidden="true"
              >
                円
              </span>
            </div>
            {errors.amount != null ? (
              <FieldError id="amount-error">{errors.amount}</FieldError>
            ) : (
              <p className="field-hint" id="amount-hint">
                日本円。概算で構いません。
              </p>
            )}
          </div>
        </div>

        <div className="grid min-w-0 gap-1.5">
          <label className="field-label" htmlFor="description">
            状況の説明
          </label>
          <textarea
            className="input resize-y leading-relaxed"
            id="description"
            name="description"
            rows={5}
            required
            minLength={10}
            placeholder="いつ・どこで・どのような治療を受けたか など"
            value={draft.description}
            onChange={setField("description")}
            aria-invalid={errors.description != null}
            aria-describedby={describedBy("description", "description-hint")}
          />
          {errors.description != null ? (
            <FieldError id="description-error">{errors.description}</FieldError>
          ) : (
            <p className="field-hint" id="description-hint">
              1〜2 文で構いません。
            </p>
          )}
        </div>

        {submitError != null ? (
          <div
            className={`${alertBox} flex items-start gap-2 text-sm font-medium`}
            role="alert"
          >
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            <p>{submitError}</p>
          </div>
        ) : null}

        <div className={actionRow}>
          <button
            type="submit"
            className={`btn btn-primary ${blockOnMobile}`}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <SpinnerIcon className="size-4 shrink-0" />
                送信中…
              </>
            ) : (
              "給付金を請求する"
            )}
          </button>
          <a className={`btn btn-quiet ${blockOnMobile}`} href={paths.policies}>
            キャンセル
          </a>
        </div>

        <p className="sr-only" role="status">
          {submitting ? "給付金請求を送信しています…" : ""}
        </p>
      </form>
    </section>
  );
};

import { useMemo, type FC } from "react";
import { startOverAction } from "../actions";
import {
  claimTypes,
  formatCurrency,
  formatDate,
  type ClaimRequest,
  type ClaimResponse,
} from "../claim";
import { CheckIcon } from "../icons";
import { navigate, paths } from "../router";
import { useLiveSyncContext } from "../touchpoint";
import {
  actionRow,
  blockOnMobile,
  factsGrid,
  heading2,
  lead,
  panelBox,
} from "./shared";

/**
 * ステップ 3: 受付完了。受付番号と、請求内容の控え。
 *
 * Live Sync context: scope は `benefit_claim` / `claim_submitted`、アクションは
 * `file_another_claim` の 1 つ。ここでは編集できないので他は提供しない。配列は
 * `useMemo` でメモ化（steering 3.3）。
 */

interface ConfirmationProps {
  claim: ClaimRequest;
  response: ClaimResponse;
}

const labelFor = (value: string): string =>
  claimTypes.find((type) => type.value === value)?.label ?? value;

export const Confirmation: FC<ConfirmationProps> = ({ claim, response }) => {
  const actions = useMemo(
    () => [startOverAction(() => navigate(paths.policies))],
    [],
  );
  useLiveSyncContext("submitted", actions);

  return (
    <section aria-labelledby="confirmation-heading">
      <div className="flex items-center gap-3 sm:gap-4">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full bg-ok-soft text-ok"
          aria-hidden="true"
        >
          <CheckIcon className="size-6" />
        </span>
        <h2 id="confirmation-heading" className={heading2}>
          給付金請求を受け付けました
        </h2>
      </div>

      <p className={lead}>
        {response.claimId != null
          ? "受付番号を控えてください。担当者よりご連絡の際に使用します。"
          : "この請求について、担当者よりご連絡いたします。"}
      </p>

      {response.claimId != null ? (
        <p className="mt-4 flex flex-col gap-1 rounded-lg border border-accent/25 bg-accent-soft px-4 py-3.5 sm:flex-row sm:items-baseline sm:gap-3">
          <span className="text-[0.6875rem] font-semibold tracking-wide text-ink-soft uppercase">
            受付番号
          </span>
          <strong className="font-mono text-lg font-bold break-all text-ink select-all">
            {response.claimId}
          </strong>
        </p>
      ) : null}

      <dl className={`${factsGrid} mt-5 ${panelBox}`}>
        <div>
          <dt>証券番号</dt>
          <dd className="font-mono break-all">{claim.policyId}</dd>
        </div>
        <div>
          <dt>給付種類</dt>
          <dd>{labelFor(claim.claimType)}</dd>
        </div>
        <div>
          <dt>治療日</dt>
          <dd>
            <time dateTime={claim.incidentDate}>
              {formatDate(claim.incidentDate)}
            </time>
          </dd>
        </div>
        <div>
          <dt>請求金額の見込み</dt>
          <dd>{formatCurrency(claim.amount)}</dd>
        </div>
        <div>
          <dt>お客様番号</dt>
          <dd className="font-mono break-all">{claim.customerId}</dd>
        </div>
        {response.status != null ? (
          <div>
            <dt>ステータス</dt>
            <dd>{response.status}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6">
        <h3 className="text-[0.6875rem] font-semibold tracking-wide text-ink-soft uppercase">
          ご説明いただいた内容
        </h3>
        <blockquote className="mt-2 rounded-r-lg border-l-[3px] border-line bg-canvas px-4 py-3">
          <p className="leading-relaxed break-words">{claim.description}</p>
        </blockquote>
      </div>

      <div className={`${actionRow} mt-6`}>
        <a className={`btn btn-quiet ${blockOnMobile}`} href={paths.policies}>
          別の給付金を請求する
        </a>
        <a className={`btn btn-quiet ${blockOnMobile}`} href={paths.home}>
          マイページに戻る
        </a>
      </div>
    </section>
  );
};

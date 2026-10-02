import { useMemo, type FC } from "react";
import { startClaimAction } from "../actions";
import { getCustomerName } from "../api";
import { ArrowRightIcon, DocumentIcon, HeartPulseIcon } from "../icons";
import { navigate, paths } from "../router";
import { useLiveSyncContext } from "../touchpoint";
import { heading2, lead, panelBox } from "./shared";

/**
 * 会員サイトのマイページ（トップ）。AnyCompany Insurance の会員ポータル風。
 *
 * このデモの主役は「給付金請求」なので、そこへの導線を目立たせ、それ以外の
 * お手続き（住所変更・各種照会など）は見た目だけのハリボテ（無効）にする。
 *
 * Live Sync context: scope は `benefit_claim` / `member_home`。トップでは
 * `start_claim`（給付金請求フローを開始＝契約一覧へ遷移）を広告し、ボットが
 * 「給付金の請求」を押した状態に画面を進められるようにする。
 */

/** その他のお手続き一覧（表示のみ）。 */
const dummyProcedures: Array<{ group: string; items: string[] }> = [
  { group: "住所・口座変更", items: ["住所・電話番号の変更", "口座変更", "クレジットカード変更"] },
  { group: "契約内容の変更", items: ["保険金額の減額", "特約の中途付加", "払込方法の変更"] },
  { group: "各種お手続き", items: ["保険証券再発行", "控除証明書再発行", "契約者変更"] },
];

export const Home: FC = () => {
  // 給付金請求フローの開始（契約一覧へ遷移）を広告。配列は useMemo でメモ化。
  const actions = useMemo(
    () => [startClaimAction(() => navigate(paths.policies))],
    [],
  );
  useLiveSyncContext("home", actions);

  return (
    <section aria-labelledby="home-heading">
      <h2 id="home-heading" className={heading2}>
        {getCustomerName()} 様のマイページ
      </h2>
      <p className={lead}>
        ご契約に関するお手続きは、こちらからお進みください。
      </p>

      {/* 主役: 給付金請求への導線 */}
      <a
        href={paths.policies}
        className="group mt-6 flex items-start gap-4 rounded-panel border border-accent/30 bg-accent-soft p-5 no-underline transition-colors duration-150 hover:border-accent hover:shadow-md sm:p-6"
      >
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink"
          aria-hidden="true"
        >
          <HeartPulseIcon className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="flex items-center gap-1.5 text-[1.0625rem] font-semibold text-ink">
            給付金の請求
            <ArrowRightIcon className="size-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </strong>
          <span className="mt-1 block text-sm text-ink-soft">
            入院・手術・通院の給付金をオンラインで請求できます。音声アシスタントが
            画面と連動してご案内します。
          </span>
        </span>
      </a>

      {/* サブ導線: 契約内容の照会（給付金請求と同じ一覧へ） */}
      <a
        href={paths.policies}
        className="group mt-3 flex items-start gap-4 rounded-panel border border-line bg-surface p-5 no-underline transition-colors duration-150 hover:border-line-strong hover:bg-canvas sm:p-6"
      >
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full bg-canvas text-ink-soft"
          aria-hidden="true"
        >
          <DocumentIcon className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="flex items-center gap-1.5 text-[1.0625rem] font-semibold text-ink">
            契約内容の照会
            <ArrowRightIcon className="size-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </strong>
          <span className="mt-1 block text-sm text-ink-soft">
            現在ご契約中の保険（医療保険・生命保険）をご確認いただけます。
          </span>
        </span>
      </a>

      {/* その他のお手続き（表示のみ。クリックは無反応） */}
      <h3 className="mt-8 mb-3 border-l-4 border-accent pl-3 text-[0.9375rem] font-semibold text-ink">
        その他のお手続き
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {dummyProcedures.map((section) => (
          <div key={section.group} className={`${panelBox} bg-canvas`}>
            <p className="mb-2 text-sm font-semibold text-ink">{section.group}</p>
            <ul className="space-y-1.5">
              {section.items.map((item) => (
                <li key={item}>
                  <span className="text-sm text-ink-soft">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

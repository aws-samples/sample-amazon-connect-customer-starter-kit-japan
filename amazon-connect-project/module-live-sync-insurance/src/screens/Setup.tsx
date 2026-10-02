import { type FC } from "react";
import { heading2, lead, panelBox } from "./shared";

/**
 * 設定（`acxd_config.json`）が不足しているときに、請求フローの代わりに表示する
 * セットアップ画面。これは Live Sync 前提のデモなので、アシスタントに接続でき
 * なければ、ただの Web フォームとして黙って動くのではなく、何が足りないかを表示
 * する。
 *
 * ここでは Live Sync context は宣言しない（この状態では Touchpoint をマウント
 * しないため）。
 */
export const Setup: FC<{ missing: Array<{ name: string; what: string }> }> = ({
  missing,
}) => (
  <section aria-labelledby="setup-heading">
    <h2 id="setup-heading" className={heading2}>
      セットアップを完了してください
    </h2>
    <p className={lead}>
      次の {missing.length} 件の値を設定してください。設定源は{" "}
      <code>acxd_config.json</code> の 1 つだけです（ローカル開発は{" "}
      <code>static/acxd_config.json</code>、S3 配布は配信先の{" "}
      <code>live-sync-insurance/acxd_config.json</code>）。
    </p>

    <dl className={`mt-5 grid gap-4 ${panelBox}`}>
      {missing.map((setting) => (
        <div key={setting.name}>
          <dt className="font-mono text-[0.9375rem] font-semibold break-all text-ink">
            {setting.name}
          </dt>
          <dd className="mt-0.5 text-sm text-ink-soft">{setting.what}</dd>
        </div>
      ))}
    </dl>

    <p className="field-hint mt-4">
      ローカルでは <code>static/acxd_config.json</code>（無ければ{" "}
      <code>acxd_config.example.json</code> をコピーして作成）を編集し、
      <code>npm run dev</code> を再起動します。S3 配布では、配信先の{" "}
      <code>live-sync-insurance/acxd_config.json</code> を書き換えるだけで反映され
      ます（再ビルド不要）。
    </p>
  </section>
);

import { useEffect, useState, type MouseEvent } from "react";

/**
 * 会員サイト＋給付金請求のルート。URL（ハッシュ）でアドレスする。
 *
 * ナビゲーションは実際の `<a href>` リンクで行うため、各ステップにリンクが指せる
 * アドレスが要る。ハッシュルートならサーバー側のリライト不要・ルーターライブラリ
 * 不要で成立する（S3 の静的配信と相性が良い）。
 *
 *   #/home                  会員サイトのマイページ（トップ）
 *   #/policies              契約内容の照会（契約一覧）＝給付金請求の開始点
 *   #/claim/<policyId>      1 契約の給付金請求フォーム
 *   #/confirmation          受付完了
 *
 * 選択中の契約は component state ではなく URL に持つ。これが「この契約で請求する」
 * をボタンではなくリンクにできる理由。
 */

export type Route =
  | { name: "home" }
  | { name: "policies" }
  | { name: "claim"; policyId: string }
  | { name: "confirmation" };

/** 各ステップの正規 href。リンクを描く場所ではこれを使う。 */
export const paths = {
  home: "#/home",
  policies: "#/policies",
  claim: (policyId: string): string =>
    `#/claim/${encodeURIComponent(policyId)}`,
  confirmation: "#/confirmation",
} as const;

/**
 * `window.location.hash` からルートを読む。
 *
 * ルートは必ず `#/` で始まる。それ以外はページ内フラグメント（`#main` など）と
 * みなして `null` を返す（＝ルート変更ではない）。
 */
const parseRoute = (hash: string): Route | null => {
  if (hash !== "" && !hash.startsWith("#/")) {
    return null;
  }

  const segments = hash
    .replace(/^#\/?/, "")
    .split("/")
    .filter((segment) => segment !== "");

  const [first, second] = segments;

  if (first === "claim" && second != null) {
    return { name: "claim", policyId: decodeURIComponent(second) };
  }

  if (first === "confirmation") {
    return { name: "confirmation" };
  }

  if (first === "policies") {
    return { name: "policies" };
  }

  // 既定はマイページ（トップ）。
  return { name: "home" };
};

/**
 * コードからリンクをたどる（Live Sync のアクション用。リンクと同じ遷移先へ）。
 * クリックと同様に履歴エントリを追加する。
 */
export const navigate = (href: string): void => {
  if (window.location.hash === href) {
    return;
  }
  window.location.hash = href;
};

/**
 * 履歴を残さずに別の場所へ送る（現在の URL が不正なとき用）。戻るボタンで顧客が
 * 実際に来た場所に戻れるようにする。
 */
export const redirect = (href: string): void => {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}${href}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
};

/** 現在のルート。アドレスバー・戻るボタンと同期する。 */
export const useRoute = (): Route => {
  const [route, setRoute] = useState<Route>(
    () => parseRoute(window.location.hash) ?? { name: "home" },
  );

  useEffect(() => {
    const sync = (): void => {
      const next = parseRoute(window.location.hash);
      if (next != null) {
        setRoute(next);
      }
    };
    window.addEventListener("hashchange", sync);
    sync();
    return () => {
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  return route;
};

/**
 * 現在のページ内の要素を指すリンク（別ステップではない）用のクリックハンドラ。
 * 対象要素にフォーカスを移し、ルートのハッシュはそのままにする。
 */
export const focusFragment = (event: MouseEvent<HTMLAnchorElement>): void => {
  const href = event.currentTarget.getAttribute("href");
  if (href == null || !href.startsWith("#") || href.startsWith("#/")) {
    return;
  }

  const target = document.getElementById(href.slice(1));
  if (target == null) {
    return;
  }

  event.preventDefault();
  target.focus();
  target.scrollIntoView({ block: "center" });
};

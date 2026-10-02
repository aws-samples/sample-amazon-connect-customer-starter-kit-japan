import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));

// This app imports Touchpoint exactly the way the documentation does:
//
//   import { create } from "@amazon-connect-touchpoint/web";
//
// That resolves to the published package in `dependencies` — no alias, no
// vendored copy, nothing to fetch or generate before `npm run dev`. The package
// ships its own compiled Tailwind CSS and renders into a closed shadow root, so
// the widget's styles arrive with the bundle and are never scanned for or built
// here.
export default defineConfig({
  // S3 + CloudFront のサブパス配下（例: https://xxxx.cloudfront.net/live-sync-insurance/）
  // で配信するため、アセット参照をこのサブパス基準の絶対パスにする。
  // 既存の配布物（トップの index.html）と 1 つの CloudFront URL で共存できる。
  // ルート直下に置く場合は "/" に変更する。
  // 環境変数 VITE_BASE_PATH で上書き可能（未指定なら /live-sync-insurance/）。
  base: process.env.VITE_BASE_PATH ?? "/live-sync-insurance/",
  // 既存配布物（amazon-connect-project）に合わせ、ビルド出力先を dist ではなく
  // public にする。そのため静的アセットの「源」フォルダは public ではなく static に
  // 分ける（publicDir と outDir が同じだと衝突するため）。
  //   - static/  … そのままコピーされる静的ファイルの源（acxd_config.json など）
  //   - public/  … ビルド成果物の出力先（S3 に上げるもの。index.html + assets + config）
  publicDir: "static",
  build: {
    outDir: "public",
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss()],
  // Still required, and not obviously so: the published Touchpoint bundle inlines
  // amazon-chime-sdk-js and its protobuf dependency, which reach for the Node
  // `global` (`global.csm`, `global.Buffer`, `typeof global`). Without this the
  // app typechecks and builds clean, then dies at runtime on `global is not
  // defined` the moment Touchpoint mounts.
  define: { global: "globalThis" },
  server: {
    port: 5175,
    // Voice inputs need a secure context; localhost counts as one.
    host: "localhost",
  },
  root: here,
});

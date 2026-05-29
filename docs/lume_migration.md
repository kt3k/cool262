# Nextra → Lume 移行のフィーチャー棚卸し

現状 `packages/site-*/` は Next.js + Nextra (`nextra-theme-docs`)
で組まれており、 **Nextra が暗黙にやってくれていた仕事** を Lume
移行後にどう実現するかを項目化したもの。 順序は ROI
順ではなく**「無いとサイトが成立しない / 無くてもいい /
捨てた方が楽」**で分けてある。

## 必須（無いとサイトとして成り立たない）

| 機能                                 | 現状 (Nextra)                                | Lume での移植先                                                |
| ------------------------------------ | -------------------------------------------- | -------------------------------------------------------------- |
| MDX/JSX レンダ                       | `next-mdx-remote` + `@mdx-js/loader`         | `lume/plugins/mdx` + `jsx_preact` (or `jsx` for React)         |
| ファイル → ルーティング              | `app/[[...mdxPath]]/page.jsx` キャッチオール | Lume 標準: `content/foo.mdx` → `/foo/`                         |
| 静的書き出し                         | `next build --output export → out/`          | Lume の標準 (`_site/`)                                         |
| 左サイドバー (ページツリー)          | `_meta.js` から Nextra が自動構築            | 自作: `_meta.js` 相当を読んで Lume コンポーネントで描画        |
| 右 TOC (on-this-page)                | Nextra の MDX プラグインが h2/h3 抽出        | `lume_plugin_toc` (h2/h3 自動抽出) or 自作 remark plugin       |
| 見出しに anchor リンク自動付与       | `<a class="subheading-anchor">`              | `lume/plugins/slugify_urls` + 簡易 rehype plugin               |
| ダーク/ライト切替 (html.dark)        | Nextra テーマ + Tailwind の `.dark` クラス   | 自作 (JS 数十行 + CSS `prefers-color-scheme` + `localStorage`) |
| Pagefind 統合                        | `pagefind --site out` を `next build` 後に   | 同じく `_site/` に対して走らせるだけ — Lume プラグインも有り   |
| 画像/静的アセット配信                | `public/` → 配信                             | Lume の `static_files` プラグイン                              |
| CSS バンドル                         | Next の自動 CSS import                       | Lume の `css` プラグイン or 単純コピー                         |
| build-chapters.mjs (spec → MDX 生成) | 独自スクリプト、Next と独立                  | そのまま再利用可能 (出力先パスを Lume 規約に揃えるだけ)        |

## あると嬉しい（無くてもいい）

- ナビゲーション中の active page ハイライト — サイドバーで現ページ強調
- モバイル用ハンバーガーメニュー — Lume には標準では無いので自作
- VersionSwitcher — 既に独自 React コンポーネント、Preact 等に書き換えるだけ
- 多バージョン同時ビルド (draft/es2024-26) — Lume だと別ビルドを 4
  回回すのが素直
- Edit-on-GitHub リンク — Nextra が出してくれてるけど自作可
- highlight.js 統合 — Lume の `prism` か `code_highlight` プラグイン (現状
  build-chapters 側でやってるので不要)

## 捨ててもよさそう（むしろ無い方が楽）

- Nextra のタイポグラフィ Tailwind 群 (`x:text-4xl` 等) — 私たちの CSS
  で上書きが必要だった原因。pure CSS にすればこの摩擦が消える
- `.subheading-anchor` ボタン — 残してもいいけど、シンプルに `<h1 id="…">`
  だけにすれば十分
- breadcrumb — 今すでに CSS で消してる
- Nextra patch (`patch-nextra-theme.mjs`) — Lume なら不要
- Tailwind 依存全般 — 持ち込まないなら CSS ファイルだけで完結

## 主なトレードオフ

Lume は **「ライブラリの薄さ＝自作量の多さ」と引き換えに自由度が高い**。 今
Nextra と戦って CSS
を上書きしている部分（ヘディングサイズ、レイアウト、anchor）は
最初から思い通り書けるが、ダーク切替・サイドバー active 状態・モバイルナビなど
**Nextra がくれていた UI を自前で 200-300 行ほど書く覚悟は要る**。

最低限の MVP としては「左サイドバー + 右 TOC + ダーク切替 + Pagefind + MDX」の
5点が揃えば見え方は現行と同等にできる。これらから着手するのが順当。

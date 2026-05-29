# Lume PoC のデザインを Nextra 版に揃える作業計画

対象: `lume-poc/` の見た目を、Nextra でビルドされている
`https://kt3k.github.io/ecma262/draft/notational-conventions` に近づける。

レイアウト構造（header / sidebar / main / TOC / footer、theme toggle が sidebar
footer にある等）はすでに Nextra 寄りに作ってあるので、ここでは
**残っている具体的な差分** を 4 つに分けて潰す。

## 現状の差分

| 領域            | Nextra (kt3k.github.io)                                 | Lume PoC                             |
| --------------- | ------------------------------------------------------- | ------------------------------------ |
| Header タイトル | `ECMA-262, 18th, ES2027` + `draft` バッジ + VS dropdown | `ECMA-262 lume-poc` のみ             |
| Search          | `CTRL K` ショートカット表示                             | プレースホルダのみ                   |
| Sidebar         | Intro / 全章 / Annex / Bibliography                     | 平坦な章リストのみ                   |
| Right TOC       | "On this page" + サブセクション階層                     | `<ol>` 空のまま (post-render 未実装) |
| Footer          | 版リスト / About / How it's built / copyright           | 構造はほぼ同じ (リンク先のみ違い)    |
| Theme toggle    | sidebar footer                                          | sidebar footer ✅                    |
| Feedback ボタン | "Question? Give us feedback" → GitHub issues            | なし                                 |

## 着手順

### A. Header を揃える

- タイトルを `ECMA-262, 18th, ES2027` + `draft` バッジ形式に
- VersionSwitcher を ssx JSX に port して header 右側に置く
  (`packages/site-draft/app/version-switcher.jsx` から)
- Search 入力に `CTRL K` キーバインド + バッジ表示
- ロゴ画像 (もしあれば) を `<img>` で先頭に

### B. Sidebar をフル章リストに

- `_includes/chapters.ts` の配列を Intro / 全章 / Annex / Bibliography 込みに
  拡張 (`packages/site-draft/content/_meta.js` を参考にする)
- できれば章番号も自動付与し、Nextra 風の階層表示にする
- current ハイライトのスタイルを Nextra に寄せる

### C. Right TOC をビルド時に埋める

- `_config.ts` の post-render で `<emu-clause id="…">` を走査し、
  `<aside class="toc">` の `<ol>` を組み立てる
- depth は emu-clause のネスト数から導出 (`data-level` 属性へ)
- 現状の CSS (`aside.toc li[data-level="2"]` 等) と接続

### D. Feedback ボタン追加 + footer 微調整

- Header または footer に "Question? Give us feedback" リンク
  (https://github.com/kt3k/ecma262/issues 等) を追加
- Footer のリンク (`/ecma262/about/` 等) が Nextra 側と等価かを確認

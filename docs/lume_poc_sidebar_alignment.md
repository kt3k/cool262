# Lume PoC の左サイドバーを Nextra に寄せた調査

対象: `lume-poc/` の左サイドバーを Nextra 版
(`https://kt3k.github.io/ecma262/draft/notational-conventions`) と 一致させる。

調査ソース:

- Nextra 側の DOM/CSS:
  `node_modules/.pnpm/nextra-theme-docs@4.6.1*/node_modules/nextra-theme-docs/dist/`
  と `/tmp/nextra.html` (デプロイ済み HTML を `curl` 取得したもの)
- Lume PoC 側: `lume-poc/styles.css` の `aside.sidebar` 周辺 (commit `f60507c`
  時点)

## Nextra のサイドバー仕様

DOM:

```html
<aside
  class="
    nextra-sidebar x:sticky x:top-(--nextra-navbar-height)
    x:h-[calc(100dvh-var(--nextra-navbar-height))]
    x:w-64 x:shrink-0 x:flex x:flex-col
  "
>
  <div class="x:p-4 x:overflow-y-auto nextra-scrollbar x:grow">
    <ul class="x:grid x:gap-1">
      <li>
        <a
          class="
            x:flex x:rounded x:px-2 x:py-1.5 x:text-sm
            x:text-gray-600 x:hover:bg-gray-100
            x:hover:text-gray-900 x:dark:text-neutral-400
            x:dark:hover:bg-primary-100/5
            x:dark:hover:text-gray-50 ...
          "
        >Introduction</a>
      </li>
      <li class="active">
        <a
          class="
            ... x:bg-primary-100 x:font-semibold
            x:text-primary-800
            x:dark:bg-primary-400/10
            x:dark:text-primary-600 ...
          "
        >5 Notational Conventions</a>
      </li>
      ...
    </ul>
  </div>
  <div
    class="
      nextra-sidebar-footer x:border-t nextra-border
      x:flex x:items-center x:gap-2 x:py-4 x:mx-4
    "
  >
    ...
  </div>
</aside>
```

主要トークン:

| 用途                | Tailwind class                                          | 値                                       |
| ------------------- | ------------------------------------------------------- | ---------------------------------------- |
| sidebar 幅          | `x:w-64`                                                | 256px                                    |
| sidebar bg          | (なし)                                                  | 透明 (page bg = 白)                      |
| sidebar 罫線        | (なし)                                                  | なし (article との境界は余白のみ)        |
| ul padding          | `x:p-4`                                                 | 16px 全方位                              |
| 項目間隔            | `x:grid x:gap-1`                                        | 4px (grid gap で実現)                    |
| link 表示           | `x:flex x:rounded x:px-2 x:py-1.5 x:text-sm`            | block + 4px radius + 6/8px padding, 14px |
| link 色 (default)   | `x:text-gray-600` / `x:dark:text-neutral-400`           | muted gray                               |
| link 色 (hover)     | `x:hover:text-gray-900` / `x:dark:hover:text-gray-50`   | 濃く                                     |
| link bg (hover)     | `x:hover:bg-gray-100` / `x:dark:hover:bg-primary-100/5` | 薄いグレー fill                          |
| active bg (light)   | `x:bg-primary-100`                                      | `hsl(212 100% 94%)` (淡青)               |
| active text (light) | `x:text-primary-800`                                    | `hsl(212 100% 32%)` (濃青)               |
| active bg (dark)    | `x:dark:bg-primary-400/10`                              | `hsl(204 100% 76% / 0.1)`                |
| active text (dark)  | `x:dark:text-primary-600`                               | `hsl(204 100% 50%)` 域                   |
| active font-weight  | `x:font-semibold`                                       | 600                                      |
| footer 罫線         | `x:border-t nextra-border`                              | 1px gray-200 上罫                        |
| footer padding      | `x:py-4 x:mx-4`                                         | 上下 16px / 左右 16px インセット         |

`--nextra-primary-{hue,saturation,lightness}` の値はデプロイ HTML から取得:

- Light: `hue=212deg saturation=100% lightness=45%`
- Dark: `hue=204deg saturation=100% lightness=55%`
- `primary-100` = `lightness + 49%`
- `primary-400` = `lightness + 21%`
- `primary-800` = `lightness − 13%`

## 修正前後の差分

| 項目                 | Before (lume-poc)          | After / Nextra 相当                                 |
| -------------------- | -------------------------- | --------------------------------------------------- |
| `aside.sidebar` bg   | `var(--chrome-bg)`         | 透明                                                |
| sidebar 右罫線       | `border-right: 1px ...`    | なし                                                |
| ul padding           | `1rem 0.75rem`             | `1rem` (均一)                                       |
| 項目間隔             | `li { margin: 0.05rem 0 }` | `ul { display: grid; gap: 0.25rem }`                |
| link 色              | `var(--fg)` (濃)           | `var(--muted)` (`text-gray-600`)                    |
| link size            | `0.86rem`                  | `0.875rem` (`text-sm`)                              |
| link padding         | `0.3em 0.6em`              | `0.375rem 0.5rem` (`py-1.5 px-2`)                   |
| link hover           | bg のみ                    | bg + color を `var(--fg)` に持ち上げ                |
| active bg light      | `rgba(37, 99, 235, 0.1)`   | `hsl(212 100% 94%)`                                 |
| active text light    | `var(--accent)`            | `hsl(212 100% 35%)`                                 |
| active bg dark       | (light と同じ)             | `hsl(204 100% 76% / 0.1)`                           |
| active text dark     | (light と同じ)             | `hsl(204 100% 65%)`                                 |
| `.sidebar-footer` bg | `var(--chrome-bg)`         | (削除)                                              |
| モバイル overlay bg  | (sidebar から継承)         | `var(--bg)` を明示 (sidebar が透明になった分の補填) |

## トレードオフと未対応

- **`primary-*` トークンの inline 化**: lume-poc は Nextra の
  `--nextra-primary-*` トークンを共有していないので、リテラル HSL
  をそのまま書いている。将来 `--accent-bg` / `--accent-fg`
  のような独自トークンに集約し直すなら差し替えポイントが集中する。
- **`li.group-start` のセクション区切り**: Nextra は Annex
  の区切り罫線を持たない平坦リストだが、lume-poc は読みやすさの判断で
  `group-start` の上罫線を残してある。Nextra
  に完全一致させたい場合はこのルールも削除する。
- **モバイル off-canvas の border-right / box-shadow**: Nextra のモバイル UI
  とは別実装 (Nextra は `nextra-mobile-nav` という別 aside)。lume-poc は同じ
  `aside.sidebar` を流用しているため、デスクトップで `border-right`
  を消した分はモバイル overlay 側で個別に補ってある。

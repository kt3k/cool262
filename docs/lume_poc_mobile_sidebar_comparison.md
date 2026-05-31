# lume-poc vs Nextra: モバイルサイドバー挙動の差分

対象: `≤767px` の幅で、ハンバーガーから出現する全画面オーバーレイのサイドバー。

参照コード:

- lume-poc:
  `lume-poc/_includes/{header,sidebar,page}.tsx`、`lume-poc/styles.css`
- Nextra: `packages/site-draft-nextra/node_modules/nextra-theme-docs/dist/`
  - `components/sidebar.js`
  - `components/navbar/index.client.js`
  - `stores/menu.js`
  - `style.css`

## 1. 状態管理の方式

- **Nextra**: Zustand store (`stores/menu.js:3`
  `useMenuStore({hasMenu})`)。React
  コンポーネントが購読し、`setMenu(true/false)` で開閉。
- **lume-poc**: ストアなし。`document.body.classList.toggle("menu-open")` +
  `document.documentElement.classList.toggle("menu-open")` を直接書き換える
  (`page.tsx:147-153`)。

## 2. メニューを閉じるトリガー

| トリガー                     | Nextra                                                    | lume-poc               |
| ---------------------------- | --------------------------------------------------------- | ---------------------- |
| ハンバーガー再クリック       | ○ (`navbar/index.client.js:235`)                          | ○ (`page.tsx:163-165`) |
| Esc キー                     | ×                                                         | ○ (`page.tsx:166-168`) |
| サイドバー内リンクをクリック | ○ (`sidebar.js:184` `handleClick = () => setMenu(false)`) | × (※下記)              |
| pathname / hash 変化         | ○ (`sidebar.js:343, 603` `useEffect → setMenu(false)`)    | ×                      |

lume-poc
は静的サイトでフルページ遷移なので、章リンク押下時はメニューごと次のページに置き換わって結果的に閉じる。ただし
**同章内アンカーへのジャンプではメニューが開いたまま** になる
(現状は問題顕在化せず、将来 SPA 化したら効く)。

## 3. DOM 構造

- **Nextra**: モバイル専用に **別の `<aside class="nextra-mobile-nav">`**
  をレンダー (`sidebar.js:333-442` `MobileNav`)。デスクトップの
  `<aside class="nextra-sidebar">` (`sidebar.js:447 Sidebar`) とは別
  DOM・別スクロール状態。
- **lume-poc**: **同じ `<aside class="sidebar">` を CSS だけで切り替え**
  (`styles.css:920` の `@media (max-width:767px)` 内で
  `position: fixed; inset: 0; transform: translate3d(0,-100%,0)`)。DOM は 1 つ。

含意: Nextra ではモバイル ↔
デスクトップを跨ぐとサイドバーのスクロール位置がリセットされる (別
DOM)。lume-poc は同じ要素なので保持される。

## 4. パネル内のフッター

- **Nextra MobileNav** (`sidebar.js:417-420`):
  `<ThemeSwitch className="x:grow"/>` +
  `<LocaleSwitch className="x:grow x:justify-end"/>` を `x:mt-auto`
  で下端固定。collapse トグルは出さない。
- **lume-poc**: フッター (テーマトグル + collapse) は DOM に残るが、collapse は
  `.sidebar-collapse-btn { display:none }` (`styles.css:953`)
  で消える。`.sidebar-footer` は `<aside>` の grid `auto 1fr auto` 3
  行目に残るが、**全画面の下端まで見えない**
  のでテーマトグルは実質非可視。Locale switch は元から無い。

**挙動差**: モバイルでは Nextra ならテーマと言語が切り替えられる。lume-poc
では事実上不可能。

## 5. アクティブ章を中央へスクロール

- **Nextra** (`sidebar.js:361-385`): `scroll-into-view-if-needed` パッケージで
  `block:"center", scrollMode:"always", boundary: sidebar.parentNode`。`menu`
  ステートが true になるたびに発火する `useEffect`。
- **lume-poc** (`page.tsx:158-161`): ネイティブ
  `Element.scrollIntoView({block:"center", inline:"center"})`。`scrollMode:"always"`
  相当 (既に画面内でも強制再スクロール) はブラウザ実装依存。

ほぼ同等。boundary
指定の有無で「親をはみ出るまで再帰スクロールしない」境界制御に差が出るが、現状の
DOM では問題なし。

## 6. 検索ボックス

- **Nextra** (`sidebar.js:400`): `themeConfig.search` というプロップを
  **MobileNav 側でも再レンダー**。React コンポーネントなのでナビバー側と同じ
  store / state を共有 (入力値が両者で同期)。
- **lume-poc** (`sidebar.tsx:29-40`): `<div class="site-search sidebar-search">`
  を **独立してマウント**。`search.js` が `querySelectorAll(".site-search")`
  を回して **個別に初期化**。

**挙動差**:
ユーザーがデスクトップ幅でナビバー検索に文字を打ち、画面を縮めてモバイルになると、サイドバー検索の
input は空。Nextra ではテキスト・結果ともに引き継がれる。

## 7. 背景スクロールロック

- **Nextra**: `<html>.x:max-md:overflow-hidden` をトグル
  (`stores/menu.js:10`)。`max-md` Tailwind ユーティリティの中で
  `overflow:hidden` を当てる (`style.css:1837`)。
- **lume-poc**: `html.menu-open { overflow: hidden }` を
  `@media (max-width:767px)` 内に置く (`styles.css:947`)。

効果は同じ。記述箇所が違うだけ。

## 8. パネルのスライドイン

両者完全一致:
`transform: translate3d(0,-100%,0) ↔ (0,0,0)`、**トランジションなし**
(スナップ)。`overscroll-behavior: contain` と `contain: layout style` も
lume-poc にコピー済み (`styles.css:933, 937`)。

バナー対応: Nextra は `.nextra-banner ~ &` セレクタで `padding-top` を
banner+navbar 高に増やすルールあり (`style.css:2482-2484`)。lume-poc
はバナーがないので未対応 (将来出すなら追加要)。

## 9. ハンバーガーアイコン

- **Nextra** (`navbar/index.client.js:186`):
  `<MenuIcon className={cn({open: menu})}>` → `.nextra-hamburger.open` で X
  に変形 (`style.css:3070-3108`)。
- **lume-poc** (`header.tsx:105-122` + `styles.css:837-887`): 同じ 3-piece SVG
  (2 つの `<g>` + 真ん中の `<path>`)、同じ cubic-bezier、同じ transition
  タイミング、同じ rotation +45/-45 deg + translate ±6px。差は
  **クラスのトリガーが `body.menu-open .menu-toggle svg` か
  `.nextra-hamburger.open svg` か** だけ。

## 10. a11y 属性

- **Nextra**: ハンバーガーは `<Button aria-label="Menu">`。`aria-expanded` /
  `aria-controls` は **付かない** (`navbar/index.client.js:186`)。
- **lume-poc** (`header.tsx:90-97`, `page.tsx:154`):
  `aria-label="Open navigation menu"` + `aria-controls="sidebar"` +
  `aria-expanded` を状態連動で更新。

lume-poc のほうが仕様準拠。

## 11. z-index

両者完全一致:

| 要素                       | 値                    |
| -------------------------- | --------------------- |
| navbar                     | 30                    |
| モバイルパネル             | 20                    |
| ハンバーガー (navbar の子) | 30 経由でパネルより上 |

## 実害が出る差 (要対応候補)

1. **検索入力が画面幅切り替えで失われる** (lume-poc) — `search.js`
   を改修してインスタンス間で値を同期させれば解消。
2. **モバイルでテーマトグルにアクセス不可** (lume-poc) —
   フッターの位置が下端のため。`.sidebar-footer` を
   `position: sticky; bottom: 0` でモバイル時のみ常時可視にすれば解決。
3. **同章内アンカークリックでメニューが閉じない** (lume-poc) —
   現在は同章リンクが基本ないので顕在化していないが、`#content`
   内のアンカークリックや prev/next ボタンなどに `setMenu(false)`
   相当を入れておくと安全。

それ以外
(パネル構造・スライドイン・スクロールロック・アクティブ章スクロール・ハンバーガーアニメ)
は実装方式が違うだけで挙動はほぼ同等。

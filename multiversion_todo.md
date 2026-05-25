- [ ] 1. `spec-versions/<id>/spec.html` ディレクトリ構造で過去版を vendored 配置 (`curl -o spec-versions/<id>/spec.html https://raw.githubusercontent.com/tc39/ecma262/refs/tags/<id>/spec.html` でワンライナー fetch)
- [ ] 2. `build-chapters.mjs` を引数化: `--version <id>` / `--input <path>` / `--output-content <dir>` / `--output-lib <dir>` / `--route-prefix </id>`
- [ ] 3. `scripts/build-all.mjs` driver スクリプトを追加し、draft + 過去版を順次ビルド
- [ ] 4. `content/<version>/` 階層構造に対応、トップレベル `content/_meta.js` で version 一覧を定義、navbar に version switcher を追加
- [ ] 5. xref の生成 path に version prefix を含める (`pathFor(slug)` を `pathFor(slug, version)` に拡張、Sec component の basePath prefix ロジックも version 込みに調整)

## 詳細・補足

### 1. ソース管理
- ハイブリッド方針: `ecma262/` submodule は draft (master) 専用、過去版は `spec-versions/<id>/spec.html` の plain vendored ファイル
- 過去版は immutable なので submodule の旨味なし。3MB × N は許容範囲
- バージョン追加手順: `mkdir -p spec-versions/es2024 && curl -o spec-versions/es2024/spec.html https://raw.githubusercontent.com/tc39/ecma262/refs/tags/es2024/spec.html`
- 対応する `<id>` 名は ecma262 リポジトリの release tag (`es2015` 〜 `es2026`)
- `refs/tags/<id>` プレフィックスを必ず付けること: tc39/ecma262 は同名の branch (post-release で動く可能性) と tag (frozen) を両方持っており、bare ref だと GitHub はブランチを優先しがち。`refs/tags/...` で曖昧性を排除する

### 2. build-chapters.mjs の引数化
現状ハードコードされている定数:
```js
const SPEC_FILE = path.join(ROOT, 'ecma262/spec.html')
const SPEC_IMG_DIR = path.join(ROOT, 'ecma262/img')
const CONTENT_DIR = path.join(ROOT, 'content')
const LIB_DIR = path.join(ROOT, 'lib/spec')
const PUBLIC_IMG_DIR = path.join(ROOT, 'public/img')
```
を CLI args / defaults で上書きできる形に。`process.argv` パースは `node:util` の `parseArgs` で十分。

### 3. driver スクリプト
```js
// scripts/build-all.mjs
const versions = [
  { id: 'draft',  input: 'ecma262/spec.html' },
  { id: 'es2026', input: 'spec-versions/es2026/spec.html' },
  { id: 'es2025', input: 'spec-versions/es2025/spec.html' },
  { id: 'es2024', input: 'spec-versions/es2024/spec.html' },
]
for (const v of versions) {
  execSync(`node scripts/build-chapters.mjs --version ${v.id} --input ${v.input}`, { stdio: 'inherit' })
}
```

### 4. Nextra ディレクトリ構造
```
content/
  _meta.js                    ← { draft: 'Draft', es2026: 'ES2026', ... }
  draft/
    _meta.js                  ← { scope, conformance, ... }
    scope.mdx
    ...
  es2024/
    _meta.js
    scope.mdx
    ...
```
navbar の version switcher は Nextra の Navbar component に `<select>` 等を追加。

### 5. xref の version 対応
- `idToSection` を version スコープ単位で構築 (xref はバージョン内で完結)
- 生成される `<a href>` を `/draft/scope#sec-foo` / `/es2024/scope#sec-foo` の形に
- `pathFor(slug, version)` ヘルパ。Sec component の `_basePath` prefix ロジックは version path より外側で動くので変更不要のはず (要検証)

## サイズ感

- 過去版 5 つ (ES2022〜ES2026) vendored source: ~15MB
- 生成 JSX (`lib/spec/<version>/`): 1 版 ~3MB × 5 = 15MB (gitignore 推奨)
- 静的 export (`out/`): 1 版 ~50MB × 5 = 250MB (GitHub Pages 1GB 上限内)

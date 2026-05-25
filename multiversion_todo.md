- [ ] 1. monorepo に再編成: `packages/shared/` (build スクリプト + ecma-spec.css + catch-all テンプレ), `packages/site-<id>/` (Next.js app, version 毎), `spec-sources/<id>/spec.html` (vendored spec). 現在の root にある `app/`, `content/`, `lib/`, `scripts/`, `next.config.mjs` などは `packages/site-draft/` 配下へ移設し、`ecma262/` submodule もそこへ
- [ ] 2. `packages/shared/scripts/build-chapters.mjs` を引数化: `--input <spec.html>` / `--content-dir <dir>` / `--lib-dir <dir>` / `--public-img-dir <dir>` / `--base-path </id>`。各 site の `package.json` の `build:chapters` で自前のパスを渡して呼ぶ
- [ ] 3. 過去版を `spec-sources/<id>/spec.html` に vendored 配置 (`mkdir -p spec-sources/es2024 && curl -o spec-sources/es2024/spec.html https://raw.githubusercontent.com/tc39/ecma262/refs/tags/es2024/spec.html`)。`refs/tags/` プレフィックスで frozen な tag を確実に取得。draft は引き続き `ecma262/` submodule (`packages/site-draft/ecma262/` の位置に)
- [ ] 4. 各 site の `next.config.mjs` で `basePath: '/<id>'` を固定 (e.g. site-es2025 → `/es2025`)。`NEXT_PUBLIC_BASE_PATH` も合わせて mirror。Sec component の prefix ロジックはそのまま動く
- [ ] 5. ルート `package.json` の scripts に `build:all` を追加 (`pnpm -r build`)、CI で全 site を順次ビルドし、各 site の `out/` を `dist/<id>/` にコピーして合体させ、`dist/index.html` (landing page) に version 一覧と各 site への link を吐く。GitHub Pages にはこの `dist/` をアップロード

## 詳細・補足

### 1. monorepo レイアウト

```
cool262/
  pnpm-workspace.yaml          # packages/* + spec-sources/ は除外
  package.json                  # root: build-all, lint-all, deploy
  spec-sources/
    es2024/spec.html            # vendored
    es2025/spec.html
    es2026/spec.html
  packages/
    shared/
      package.json
      scripts/
        build-chapters.mjs
        patch-nextra-theme.mjs
      templates/
        ecma-spec.css
        catch-all-route.jsx
    site-draft/
      package.json              # name: "site-draft"
      next.config.mjs           # basePath: '/draft'
      app/
      content/                  # build:chapters の出力 (gitignored)
      lib/spec/                 # 同上
      public/img/               # 同上
      mdx-components.jsx
      ecma262/                  # submodule
    site-es2026/
      package.json              # name: "site-es2026", basePath: '/es2026'
      ... (site-draft と同構造、ecma262/ submodule の代わりに spec-sources/es2026/spec.html を参照)
    site-es2025/
      ...
    site-es2024/
      ...
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
onlyBuiltDependencies:
  - sharp
```

各 site の `package.json` は shared に依存:
```json
{
  "name": "site-es2025",
  "private": true,
  "scripts": {
    "build:chapters": "node ../shared/scripts/build-chapters.mjs --input ../../spec-sources/es2025/spec.html --base-path /es2025",
    "build": "pnpm build:chapters && next build",
    "dev": "pnpm build:chapters && next dev",
    "postinstall": "node ../shared/scripts/patch-nextra-theme.mjs"
  },
  "dependencies": {
    "next": "^16.2.6",
    "nextra": "^4.6.1",
    "nextra-theme-docs": "^4.6.1",
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  }
}
```

### 2. build-chapters.mjs 引数化

`node:util` の `parseArgs` を使うのが標準的:

```js
import { parseArgs } from 'node:util'
const { values } = parseArgs({
  options: {
    input:          { type: 'string' },
    'content-dir':  { type: 'string', default: 'content' },
    'lib-dir':      { type: 'string', default: 'lib/spec' },
    'public-img-dir': { type: 'string', default: 'public/img' },
    'base-path':    { type: 'string', default: '' },
  },
})
const SPEC_FILE = path.resolve(values.input)
const CONTENT_DIR = path.resolve(values['content-dir'])
const LIB_DIR = path.resolve(values['lib-dir'])
const PUBLIC_IMG_DIR = path.resolve(values['public-img-dir'])
const SPEC_IMG_DIR = path.join(path.dirname(SPEC_FILE), 'img')
```

実行は site dir から相対パスで:
```bash
cd packages/site-es2025
node ../shared/scripts/build-chapters.mjs --input ../../spec-sources/es2025/spec.html --base-path /es2025
```

### 3. spec source layout

- `spec-sources/` を repo root に
- 過去版は plain file vendored (`refs/tags/<id>` から fetch)
- draft は `packages/site-draft/ecma262/` の submodule (現状の `ecma262/` を移設)
- spec.html と一緒の `img/` ディレクトリも持つ必要あり: vendored 版でも `spec-sources/<id>/img/` に必要画像を置く (ecma262 release tag の img/ ディレクトリも一緒に取得)

vendored 版の取得は完全に:
```bash
git clone --depth 1 --branch refs/tags/es2024 https://github.com/tc39/ecma262 /tmp/ecma262-es2024
mkdir -p spec-sources/es2024
cp /tmp/ecma262-es2024/spec.html spec-sources/es2024/
cp -r /tmp/ecma262-es2024/img spec-sources/es2024/
```

### 4. basePath 設定

各 site の `next.config.mjs`:
```js
import nextra from 'nextra'
const withNextra = nextra({})
const basePath = process.env.GITHUB_ACTIONS === 'true' ? '/cool262/es2025' : ''
// ↑ ローカル dev では basePath なし (site 単独で localhost:3000 で動く)
// CI では GitHub Pages の repo path + version id
export default withNextra({
  output: 'export',
  basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
})
```

site-draft の basePath: `/cool262/draft`、site-es2025 は `/cool262/es2025`、…

xref の resolve 自体は変更不要 — 既存の `pathFor(slug)` が site 内で完結する root-relative path を出し、Sec component が `_basePath` を prefix する仕組みがそのまま使える

### 5. CI: 統合ビルド

`.github/workflows/nextjs.yml` の build step を以下に置き換え:

```yaml
- name: Build all sites
  run: pnpm -r build

- name: Assemble combined dist/
  run: |
    mkdir -p dist
    for site in packages/site-*; do
      id="${site#packages/site-}"
      cp -r "$site/out" "dist/$id"
    done
    # landing page: 各 version への link を出す
    cat > dist/index.html <<'EOF'
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>ECMA-262 versions</title></head>
    <body>
      <h1>ECMA-262</h1>
      <ul>
        <li><a href="draft/">Draft (ES2027 editor's draft)</a></li>
        <li><a href="es2026/">ES2026</a></li>
        <li><a href="es2025/">ES2025</a></li>
        <li><a href="es2024/">ES2024</a></li>
      </ul>
    </body></html>
    EOF

- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: ./dist
```

GitHub Pages にデプロイされたあとの URL:
- `kt3k.github.io/cool262/` → landing
- `kt3k.github.io/cool262/draft/` → site-draft
- `kt3k.github.io/cool262/es2025/` → site-es2025

ローカル開発: `cd packages/site-es2025 && pnpm dev` で `localhost:3000` (basePath 無し) でその site だけ立ち上げる

## サイズ感

- 過去版 5 つ (ES2022〜ES2026) vendored source (spec.html + img/): ~20MB
- 各 site の `out/`: ~50MB × 5 = ~250MB (combined `dist/`)
- 各 site の `lib/spec/` / `content/` は gitignore (build-chapters.mjs が再生成)
- 各 site の `node_modules` は pnpm の symlink で共有されるので実サイズは少ない

## マイルストーン順序の提案

1. **タスク 1 着手** — まずディレクトリ移動だけ。`packages/site-draft/` を作って現在のファイルを丸ごと移し、CI が引き続き通ることを確認 (basePath は `/cool262/draft` に更新)
2. **タスク 2** — build-chapters.mjs 引数化、site-draft で動作確認
3. **タスク 3** — `spec-sources/es2025/spec.html` を 1 個だけ持ってきて、`packages/site-es2025/` を site-draft から複製して作成
4. **タスク 4** — site-es2025 が build できることを確認
5. **タスク 5** — CI 統合、過去版を更に追加

3〜5 はループで残りの version を増やしていく

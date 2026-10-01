# 開発環境のセットアップ（Claude Code に渡す前に人がやること）

ゴール: React の画面と Hono の API がローカルの workerd で動き、D1 がつながり、scheduler のテストが通る状態にしてから Claude Code に渡す。アカウントやシークレットが絡む作業はここで済ませておく。

## 構成の要点

| 層 | 選択 |
|---|---|
| フロント | React + Vite + React Router + TanStack Query |
| API | Hono（`/api/*`）+ zod + Hono RPC |
| 配信 | 1つの Worker。SPA は静的アセットとして配信し、`/api/*` だけ Worker を通す |
| 開発 | `@cloudflare/vite-plugin`（開発中も workerd で動く） |
| DB | Cloudflare D1 |

SPA の画面遷移（`/session` など）は静的アセットの SPA フォールバックで `index.html` が返るので、Worker は動かない。Worker が動くのは `/api/*` だけになる。

## 0. 前提

- Node.js 22 以上（`node -v`）
- Cloudflare アカウント
- GitHub のリポジトリ（公開。Actions で問題データを同期するため）

## 1. プロジェクトを作る

Cloudflare 公式の「Hono + React + Vite」テンプレートを使う。

```sh
npm create cloudflare@latest -- atcoder-drill --template=cloudflare/templates/vite-react-template
cd atcoder-drill
npm i react-router @tanstack/react-query zod @hono/zod-validator jose
npm i -D vitest tsx
npx wrangler login
```

テンプレートには、`src/react-app/`（React）、`src/worker/index.ts`（Hono。`/api` が1つだけある）、`vite.config.ts`（`react()` と `cloudflare()`）、`wrangler.json(c)` が入っている。`npm run dev` で画面が出て、画面から `/api` を呼べることを確認しておく。テンプレートの見本のコード（カウンターやロゴ）は、Claude Code に消させてよい。

## 2. D1 を作る

```sh
npx wrangler d1 create atcoder-drill
```

表示された `database_id` を wrangler の設定に書く（wrangler が追記を提案したら任せてよい）。

## 3. 設定ファイル

### `wrangler.jsonc`

テンプレートの設定に、次の項目を足す・直す。テンプレートが `wrangler.json` なら、コメントを書けるように `wrangler.jsonc` に改名してよい。

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "atcoder-drill",
  "main": "./src/worker/index.ts",
  "compatibility_date": "2026-09-29",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },

  "assets": {
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },

  // Phase A（トークン認証）の間は true。Access に切り替えたら両方 false（docs/CLOUDFLARE.md §4）
  "workers_dev": true,
  "preview_urls": false,

  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "atcoder-drill",
      "database_id": "<ここに database_id>",
      "migrations_dir": "migrations"
    }
  ],

  "vars": {
    "AUTH_MODE": "token"
  }

  // Phase B で追加:
  // "routes": [{ "pattern": "drill.suyasuyaty.com", "custom_domain": true }],
  // vars に "ACCESS_TEAM_DOMAIN" と "ACCESS_AUD"
}
```

`run_worker_first` を忘れると、ブラウザで直接 `/api/...` を開いたときに SPA の `index.html` が返ってしまう。

### `.dev.vars`（git 管理外）

```
AUTH_MODE=none
DEBUG_TOOLS=1
```

### `.gitignore` に追記

```
.dev.vars
.wrangler/
backups/
```

### `package.json` の scripts

テンプレートの `dev` / `build` / `preview` / `deploy` / `cf-typegen` は残し、次を足す。

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b",
    "db:migrate:local": "wrangler d1 migrations apply DB --local",
    "db:migrate:remote": "wrangler d1 migrations apply DB --remote",
    "sync:problems": "tsx scripts/sync-problems.ts",
    "backup": "mkdir -p backups && wrangler d1 export atcoder-drill --remote --output backups/drill-$(date +%Y%m%d).sql"
  }
}
```

テンプレートの tsconfig は、アプリ用（`tsconfig.app.json`）と Worker 用（`tsconfig.worker.json`）などに分かれている。`typecheck` がその全部を見るように、参照（references）の設定を確認しておく。`npm run cf-typegen` は、wrangler の設定や `.dev.vars` を変えるたびに実行する。

### tsconfig の追加設定

アプリ用と Worker 用の両方に、次を足す。

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

`src/lib/` と `src/shared/` は、アプリと Worker の両方の `include` に入れる。

## 4. このパッケージのファイルを置く

```
AGENTS.md
CLAUDE.md
docs/SPEC.md  docs/DESIGN.md  docs/CLOUDFLARE.md  docs/SETUP.md
src/lib/scheduler.ts
tests/scheduler.test.ts
```

画面案（キャンバス）を PNG か PDF で書き出して、`docs/design/` に置いておくと、エージェントが見た目を確認できる。

```sh
npm test       # 36件通ればよい
```

## 5. 動作確認

```sh
npm run dev
```

D1 の疎通を確かめたければ、`src/worker/index.ts` に一時的に次を足して `/api/ping` を開く（確認したら消す）。

```ts
app.get('/api/ping', async (c) => c.json(await c.env.DB.prepare('SELECT 1 AS ok').first()))
```

## 6. トークンの登録と初回デプロイ（任意だがおすすめ）

```sh
npx wrangler secret put AUTH_TOKEN   # openssl rand -base64 32 などで作った値
npm run deploy
```

この時点では認証がまだないので、データは載せない。データを入れるのは、SPEC §19 のステップ1（認証）が済んでからにする。

## 7. GitHub Actions の secrets と variables

リポジトリの Settings › Secrets and variables › Actions に登録する。

- `CLOUDFLARE_API_TOKEN`: Cloudflare のダッシュボードで作る。権限は「Account › D1 › Edit」だけ
- `CLOUDFLARE_ACCOUNT_ID`
- （Variables タブ）`ATCODER_USER_ID`: 自分の AtCoder ID。AC 済みの問題を初見から外すのに使う

ワークフローのファイル（`.github/workflows/sync.yml`。問題データの同期）は、SPEC §19 のステップ5で Claude Code に作らせる。

## 8. コミットして Claude Code に渡す

```sh
git add -A && git commit -m "chore: scaffold react + hono on workers, add scheduler and docs"
```

最初の依頼の例:

> AGENTS.md と docs/ を読んで、SPEC §19 のステップ1（土台）を実装して。テンプレートの見本のコードは消してよい。マイグレーション 0001 はローカルにだけ適用して。終わったら、テスト・型チェック・ビルドの結果と、判断した点を報告して。

1ステップ終わるごとに差分を確認してコミットし、それから次のステップを依頼する。

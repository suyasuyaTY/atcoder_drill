# Cloudflare 設計書

## 1. 全体構成

```
ブラウザ（ブックマーク）
   │  https://drill.suyasuyaty.com   ※ドメイン準備前は https://atcoder-drill.<account>.workers.dev
   ▼
Cloudflare Access（Zero Trust Free）── 許可したメールアドレスだけ通す   ※Phase B から
   ▼
Worker: atcoder-drill
   ├─ 静的アセット: React の SPA（HTML・JS・CSS）
   │     画面のパス（/session など）は SPA フォールバックで index.html。Worker は動かない
   └─ /api/*（run_worker_first）: Hono の JSON API
         └─ D1 binding: DB ──▶ D1: atcoder-drill

GitHub Actions（週1回）
   └─ scripts/sync-problems.ts ─ kenkoooo から取得 → SQL 生成 → wrangler d1 execute --remote
```

## 2. リソース一覧

| 種類 | 名前 | 用途 | 備考 |
|---|---|---|---|
| Worker | `atcoder-drill` | アプリ本体 | エントリポイントは `src/worker/index.ts`（Hono の `app`）。静的アセットは `assets`（`not_found_handling: "single-page-application"`、`run_worker_first: ["/api/*"]`） |
| D1 | `atcoder-drill`（binding `DB`） | cards / attempts / sessions / session_items / reg_sessions / profile / contests / problems / user_ac / app_meta | マイグレーションは `migrations/` |
| DNS ゾーン | `suyasuyaty.com` | 独自ドメイン | Porkbun で取得し、ネームサーバーを Cloudflare に向ける |
| Custom Domain | `drill.suyasuyaty.com` | Worker の公開先 | サブドメイン名は仮 |
| Access アプリ | `AtCoder 復習ドリル` | 認証 | Self-hosted、1ユーザー |
| Cron Trigger | なし | | 理由は §5 |

## 3. 環境変数・シークレット

| 名前 | 種類 | ローカル（`.dev.vars`） | 本番 Phase A | 本番 Phase B |
|---|---|---|---|---|
| `AUTH_MODE` | var | `none` | `token` | `access` |
| `AUTH_TOKEN` | secret | 不要 | `wrangler secret put AUTH_TOKEN` | 不要（削除してよい） |
| `ACCESS_TEAM_DOMAIN` | var | — | — | `<team>.cloudflareaccess.com` |
| `ACCESS_AUD` | var | — | — | Access アプリの AUD タグ |
| `DEBUG_TOOLS` | var | `1` | 設定しない | 設定しない |

- `wrangler.jsonc` の `vars` には本番の値を書き、ローカルでは `.dev.vars` で上書きする。
- `wrangler.jsonc` や `.dev.vars` を変えたら `npm run cf-typegen` で `Env` 型（`worker-configuration.d.ts`）を作り直す。
- `.dev.vars` にない値（secret の `AUTH_TOKEN`、Phase B の `ACCESS_*`）は `Env` に入らないので、`src/worker/env.d.ts` に省略可能として足してある。
- コードからは `new Hono<{ Bindings: Env }>()`（`src/worker/types.ts` の `AppEnv`）として、`c.env.DB` などで読む。

## 4. 認証のフェーズ

### Phase A: ドメイン準備前（workers.dev + トークン）

1. `openssl rand -base64 32` などでトークンを作り、`npx wrangler secret put AUTH_TOKEN` で登録する。
2. `AUTH_MODE=token` でデプロイする。
3. `https://atcoder-drill.<account>.workers.dev/` を開くと、ログイン画面（`/login`）が出る。トークンを入力すると cookie が入る（400日有効）。
4. この段階では、静的アセット（アプリのコード）は誰でも取得できる。データは `/api/*` からしか返さないので、トークンがなければ何も見えない。

### Phase B: 独自ドメイン + Access

1. Porkbun で `suyasuyaty.com` を取得する。
2. Cloudflare ダッシュボードで「Add a domain」→ Free プランを選ぶ。表示された2つのネームサーバーを Porkbun に設定する。Porkbun 側で DNSSEC を有効にしていたら、切り替える前に無効にする。ゾーンが Active になるまで待つ。
3. `wrangler.jsonc` に `"routes": [{ "pattern": "drill.suyasuyaty.com", "custom_domain": true }]` を追加してデプロイする。DNS レコードと証明書は自動で作られる。
4. Zero Trust ダッシュボードで初期設定をする（チーム名 = `<team>.cloudflareaccess.com`、Free プラン。支払い方法の登録を求められることがある）。
5. Access → Applications → Add → Self-hosted を選ぶ。
   - Application domain: `drill.suyasuyaty.com`
   - Session duration: 1 month（ブックマークから毎回ログインしなくて済むように）
   - Policy: Allow / Include: Emails = 自分のアドレス
   - ログイン方法: One-time PIN（既定）で十分。GitHub などを足してもよい
6. 作成したアプリの「Application Audience (AUD) Tag」をコピーし、`ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` を `vars` に書く。`AUTH_MODE` を `access` にする。
7. `"workers_dev": false` と `"preview_urls": false` にしてデプロイする。
8. 確認: workers.dev の URL が開けないこと。`drill.suyasuyaty.com` が Access のログイン画面になること。ログインしたらアプリが表示されること。

Worker 側でも JWT を検証する（SPEC §17）。Access の設定ミスや経路の抜けがあっても、Worker の手前で素通りしないようにする二重の守り。

## 5. 問題データの同期を Worker でやらない理由

- Workers Free の CPU 時間は、HTTP リクエストも Cron Trigger も1回 10ms まで。
- `contests.json`・`problems.json`・`problem-models.json`・`contest-problem.json` は合わせて数 MB あり、`JSON.parse` だけで 10ms を超える可能性が高い。
- 例外として、登録画面での提出 API の呼び出し（1ユーザー・1コンテスト分、数百件まで）はリクエスト内で行ってよい。この程度なら 10ms に収まる。
- 方法は2つ考えられる。
  - 採用: GitHub Actions + Node スクリプトで同期する（無料、CPU 制限なし）
  - 不採用: Workers Paid（$5/月）にして、Cron Trigger + 独自エントリポイント（`src/worker.ts` で `handle()` と `scheduled()` を export）で同期する
- 将来 Paid に移るなら、`src/index.tsx` で `export default { fetch: app.fetch, scheduled }` とし、`wrangler.jsonc` に `triggers.crons` を足すだけで移行できる。スクリプトの SQL 生成部分はそのまま使い回せる。

### GitHub Actions の設定

- secrets
  - `CLOUDFLARE_API_TOKEN`: 権限は「Account › D1 › Edit」だけ
  - `CLOUDFLARE_ACCOUNT_ID`
- variables
  - `ATCODER_USER_ID`: 自分の AC を `user_ac` に同期するとき（SPEC §14.2）。なければその処理を飛ばす
- スケジュール: `cron: '0 18 * * 0'`（月曜 03:00 JST）と `workflow_dispatch`（手動実行）
- 手順: `npm ci` → `npm run sync:problems -- --remote`

## 6. 無料枠の見積もり

| 制限（Free） | 値 | この用途での見込み |
|---|---|---|
| Worker リクエスト | 100,000 / 日 | `/api/*` だけ数える。静的アセットの配信は数えない。1日数百程度 |
| Worker CPU | 10ms / リクエスト | API は JSON を返すだけで、HTML の描画はしない。重い集計はしない |
| D1 ストレージ | 5 GB | problems 1万行程度 + ログ。数 MB |
| D1 読み取り | 500万行 / 日 | 一覧の全件読みでも余裕 |
| D1 書き込み | 10万行 / 日 | 同期は差分だけ更新するので、多くても数千行 |
| Cron Trigger | 5 / アカウント | 使わない |

超えた場合は、日次の上限に達した時点でエラーになる（その日の残りの操作が失敗する）。

## 7. デプロイ手順（人が実行する）

```sh
npm test && npm run typecheck
npx wrangler d1 migrations apply DB --remote   # 新しいマイグレーションがあるときだけ。デプロイより先に実行する
npm run deploy                                 # vite build → wrangler deploy
```

- `--local` と `--remote` は別の DB。ローカルでマイグレーションを当てても本番には反映されない。
- マイグレーションは「後方互換な変更を先に当て → デプロイ」の順にする。列の削除や改名は2回のリリースに分ける。
- ロールバック: `npx wrangler rollback`（コードだけ戻る。D1 のデータは戻らない）
- ログ: `observability.enabled = true`。ダッシュボードの Workers Logs か `npx wrangler tail` で見る。

## 8. バックアップ

バックアップは取らない（SPEC §16）。手元にも GitHub Actions にも DB を書き出さない。リポジトリは公開するため（公開リポジトリのワークフローの成果物は、GitHub にログインした人なら誰でもダウンロードできる）。

- D1 Time Travel: D1 の標準機能で、直近の任意の時点に巻き戻せる（無料プランは7日分）。誤操作の直後の救済用で、長期保管には使えない。
- 戻し方: `npx wrangler d1 time-travel restore atcoder-drill --timestamp=<UTC の ISO 時刻>`（本番に影響するので、実行するのは人だけ）

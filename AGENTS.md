# AGENTS.md

AtCoder の問題を間隔をあけて解き直すための、個人用の復習ドリル。利用者は1人。React の SPA と Hono の JSON API を、1つの Cloudflare Worker から配信する。データは D1 に置く。

## まず読むもの

| ファイル | 内容 | いつ読むか |
|---|---|---|
| `docs/SPEC.md` | 挙動の正本（復習と初見、スケジュール、抽選、登録、問題表、グラフ、DB、画面と API、認証）。§19 に実装順と進み具合 | 作業を始める前に必ず |
| `docs/DESIGN.md` | トークン、コンポーネント、画面ごとの状態 | UI を触るとき |
| `docs/design/` | 画面案の画像 | UI を作るとき |
| `docs/CLOUDFLARE.md` | インフラの構成、環境変数、デプロイ手順 | 設定・認証・同期を触るとき |

仕様が曖昧なときや、仕様にないことを決める必要があるときは、実装を進める前に質問する。小さな判断なら自分で決めてよいが、決めた内容を報告に書き、SPEC にも反映する。

## 技術スタック

- フロント: React + Vite + React Router（画面遷移）+ TanStack Query（API のデータ取得・キャッシュ・更新）
- API: Hono（`/api/*`）+ zod（`@hono/zod-validator`）。クライアントは Hono RPC（`hc<AppType>`）で型付きで呼ぶ
- 配信: 1つの Worker。SPA は静的アセット（`not_found_handling: "single-page-application"`）、`/api/*` だけ Worker を先に通す（`run_worker_first`）
- 開発: `@cloudflare/vite-plugin`（`npm run dev` も workerd で動き、ローカルの D1 につながる）
- TypeScript（strict、`noUncheckedIndexedAccess`）
- Cloudflare D1（binding `DB`）。ORM は使わず、`c.env.DB.prepare(...).bind(...)` で素の SQL を書く
- `jose`（Access の JWT 検証）、`hono/csrf`、`hono/cookie`
- テスト: Vitest（`src/lib/` の純粋関数と、`src/shared/` のスキーマが対象）
- 入れないもの: 状態管理ライブラリ（Redux・Zustand など）、UI キット、CSS フレームワーク、グラフのライブラリ、フォームライブラリ

## コマンド

```sh
npm run dev               # ローカル起動（Vite + workerd）
npm test                  # Vitest
npm run typecheck
npm run build
npm run cf-typegen        # wrangler.jsonc / .dev.vars を変えたら実行する
npm run db:migrate:local
npm run sync:problems -- --local
```

次のコマンドは本番に影響するので、ユーザーに明示的に頼まれない限り実行しない。

- `--remote` が付くもの（`db:migrate:remote`、`wrangler d1 execute --remote`、`sync:problems -- --remote`）
- `npm run deploy`、`wrangler deploy`、`wrangler rollback`
- `wrangler secret ...`、`wrangler d1 create|delete|time-travel`

## ディレクトリ構成

```
src/
  worker/                 Hono（API）。ブラウザのコードを import しない
    index.ts              アプリ本体。ミドルウェア、ルートのマウント、`export type AppType`
    routes/               me / home / sessions / register / table / cards / profile / contests / debug
    db/                   テーブルごとのクエリ
    auth.ts               AUTH_MODE ごとの認証
    errors.ts             エラーのレスポンス（apiError）
    validate.ts           zod の検証（失敗したら 400）
    env.d.ts              wrangler types が拾わない secret などの型
    clock.ts              now(env)
    random.ts             crypto.getRandomValues から作る draw() 用の乱数
    kenkoooo.ts           提出 API（SPEC §7.3）
  react-app/              React（SPA）。worker/ を import しない（型の AppType だけは例外）
    main.tsx              エントリ。QueryClient と Router
    routes.tsx            画面のルート（SPEC §8.1）
    api.ts                hc<AppType> のクライアントと、TanStack Query のフック
    pages/                Home / Session / Register / Table / CardDetail / Profile / Login / Debug
    components/           DESIGN.md §3 のコンポーネント
    hooks/                useTimer など
    styles/               tokens.css（DESIGN.md §2）と共通スタイル
  shared/                 サーバーとクライアントの両方で使う zod スキーマと型
  lib/                    純粋関数。D1・fetch・Hono・React・cloudflare:workers を import しない
    scheduler.ts          apply / register / draw / planSlots（実装済み）
    clock.ts              時計のずれの計算
    auth-mode.ts          AUTH_MODE の解釈（fail closed）
    difficulty.ts         表示用の補正と色帯
    problem-id.ts         URL の解析
    contest.ts            コンテストの種類（kind）の判定と一覧
    eligibility.ts        isFreshTarget / buildFreshQuery / cardStatus
    stats.ts              30日グラフと草の集計
    problem-sync.ts       同期の変換（所属コンテストの決定）と SQL の組み立て
    format.ts             JST の表示、「あと N日」
migrations/               0001_init.sql から連番
scripts/                  sync-problems.ts（Node で実行）
tests/                    lib と shared のテスト
```

ディレクトリ名（`src/worker/`、`src/react-app/`）は Cloudflare の `vite-react-template` に合わせている。

## 守ること

### ドメインのロジック

1. スケジュール・抽選・枠の配分の規則は `src/lib/scheduler.ts` だけに書く。初見の対象と問題表の状態の判定は `src/lib/eligibility.ts` だけに書く。ルートや DB 層やコンポーネントで、streak・日数・初見の対象を独自に計算しない。
   - 登録した問題（カードがある問題）は、プロフィールの設定に関係なく復習に出る。プロフィールが決めるのは、カードのない問題が初見に出るかどうかだけ。この区別を崩さない。
2. 業務ルールの確定は必ずサーバー側で行う。クライアントが `src/lib/` を使ってよいのは表示用（ボタンの補足文、「あと N日」など）だけ。保存する値をクライアントで計算して送らない。
3. `src/lib/` を変えるときは、先にテストを書くか直す。規則を変えたら、SPEC も同じコミットで直す。
4. サーバーの現在時刻は `src/worker/clock.ts` の `now(env)` から取る。サーバー側で `new Date()`（引数なし）や `Date.now()` を呼んでよいのは `src/worker/clock.ts` だけ。
5. 乱数は `crypto.getRandomValues` から作り、`draw()` に渡す。
6. コンテストの種類は `src/lib/contest.ts` の一覧から作る。`'ABC'` などの文字列をあちこちに直書きしない。

### API とデータ

7. API の入力は `src/shared/schema.ts` の zod スキーマで検証する。レスポンスの型は RPC でクライアントに渡るので、クライアント側で型を手書きしない。
8. エラーは `{ error: { code, message } }` と適切な HTTP ステータスで返す（SPEC §8）。
9. 複数のテーブルに書き込むときは `c.env.DB.batch([...])` で1トランザクションにする（D1 では BEGIN / COMMIT を使えない）。
10. `attempts` は追記専用。例外は SPEC §11 に書いたものだけ。
11. 日時は UTC の ISO 文字列で保存し、API も ISO 文字列で返す。表示はクライアントで `format.ts` を通して JST にする。
12. 一度適用したマイグレーションは編集しない。変更は新しい番号のファイルで足し、`npm run db:migrate:local` まで実行する。
13. SQL の値は必ず `bind()` で渡す。文字列を連結して埋め込まない。
14. 問題データ（contests / problems）を Worker の中で取得しない（SPEC §14）。

### UI

15. サーバーのデータは TanStack Query で取得・更新する。申告や登録のあとは、関係するクエリを invalidate して取り直す。サーバーのデータをコンポーネントの state に写して持ち回らない。
16. 画面の状態（選んだ種類・ページ・検索語）は URL のクエリに持たせる。
17. localStorage はタイマーにだけ使う（`useTimer`）。
18. 色・フォント・角丸は `tokens.css` の変数だけを使う。新しい色を足さない。グラデーション、左端だけ太い線、絵文字、明朝体は使わない。スタイルは CSS Modules か共通 CSS で書き、インラインの style は動的な値（グラフの高さなど）だけにする。
19. グラフ（30日の棒・草）は、API が返した集計を React で div か SVG として描く。
20. 画面の文言は日本語。申告の表示は SPEC §2.2 のとおり。difficulty を表示する画面には出典を書く。
21. 操作できるものは `<button>`・`<a>`（React Router の `<Link>`）・`<input>` + `<label>` で作る。div に onClick を付けない。

### セキュリティ

22. 認証は fail closed にする。`AUTH_MODE` が未知なら 500。`none` はローカル開発（`DEBUG_TOOLS=1`）のときだけ通す。
23. データは `/api/*` からだけ返す。静的アセットにデータや秘密を埋め込まない（`token` モードでは静的アセットは誰でも取得できる）。
24. `/api/debug/*` は `DEBUG_TOOLS=1` のときだけ動かし、それ以外は 404 にする。
25. シークレットをコード・ログ・コミットに入れない。`.dev.vars` はコミットしない。

### 依存

26. 依存パッケージを足す前に、ユーザーに確認する。入れてよいことになっているのは、テンプレートに入っていたものと `react-router`、`@tanstack/react-query`、`zod`、`@hono/zod-validator`、`jose`、`vitest`、`tsx` だけ。

## 作業の進め方

- SPEC §19 の順に、1ステップずつ縦に通す。1回の依頼で複数のステップをまたがない。
- 各ステップは、次がすべて満たされたら完了とする。
  1. `npm test`、`npm run typecheck`、`npm run build` がすべて通る
  2. ローカルで画面を操作して確認した（時間が絡む挙動は `/debug` の時計で確認した）
  3. SPEC §19 のチェックボックスを更新した
  4. 変更の要約、判断した点、未解決の点を報告した
- コミットメッセージは `feat:` / `fix:` / `docs:` / `chore:` / `test:` で始める。
- 大きな設計変更（テーブル構成、API の形、認証方式）は、書く前に案を出して合意を取る。

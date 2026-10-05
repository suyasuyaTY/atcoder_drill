# AtCoder 復習ドリル

AtCoder の問題を間隔をあけて解き直すための、個人用の復習ドリルです。登録した問題を 30日後・90日後に出し直し、自力で余裕を持って AC できた状態が2回続いたら「卒業」にします。登録していない問題も、プロフィールで選んだ範囲から「初見」として混ぜて出します。

- 申告は自己申告の3段階（WA 解けず / AC 苦戦 / AC 余裕）
- 1回3問。初見を多めに出し、残りを解禁中の復習から、解禁からの日数が長いものほど出やすく引く
- 問題表（AtCoder Problems の Table のような一覧）、直近30日のグラフ、取り組みの記録（草）

difficulty は [AtCoder Problems](https://kenkoooo.com/atcoder/) の推定値を使っています。

## 構成

React（Vite）の SPA と Hono の JSON API を、1つの Cloudflare Worker から配信します。データは Cloudflare D1 に置きます。問題データは GitHub Actions で週1回同期します。

| ファイル | 内容 |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | 挙動の仕様（スケジュール、抽選、登録、問題表、DB、API、認証） |
| [docs/DESIGN.md](docs/DESIGN.md) | 見た目（トークン、コンポーネント、画面ごとの状態） |
| [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md) | インフラの構成、環境変数、デプロイ手順 |
| [docs/SETUP.md](docs/SETUP.md) | 開発環境のセットアップ |
| [AGENTS.md](AGENTS.md) | 実装の約束ごと |

## ローカルで動かす

Node.js 22 以上が要ります。

```sh
npm install
printf 'AUTH_MODE=none\nDEBUG_TOOLS=1\n' > .dev.vars   # ローカル開発用（コミットしない）
npm run db:migrate:local
npm run sync:problems -- --local                        # 問題データを取得してローカルの D1 に入れる
npm run dev
```

`/debug` から、時計をずらしたりサンプルデータを入れたりできます（`DEBUG_TOOLS=1` のときだけ）。

```sh
npm test            # Vitest（src/lib の純粋関数と src/shared のスキーマ）
npm run typecheck
npm run build
npm run lint
```

デプロイの手順は [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md) §7 にあります。

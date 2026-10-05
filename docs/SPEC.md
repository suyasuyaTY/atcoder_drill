# AtCoder 復習ドリル — 仕様書

この文書が挙動の正本。実装と食い違ったら、どちらが正しいかを決めてから両方を揃える。

## 1. コンセプト

応用情報の過去問道場のように、AtCoder の問題を間隔をあけて何度も解き直す。自力で余裕を持って AC できる状態が続けて確認できたら「卒業」とする。

利用者は1人（自分）。ブックマークから開いてすぐ使えることを重視する。

出題元は2つある。

| 出題元 | 中身 | 何で決まるか |
|---|---|---|
| 復習 | 登録した問題のうち、解禁日を過ぎたもの | 登録したかどうかだけ。プロフィールの設定には左右されない |
| 初見 | 登録していない問題のうち、プロフィールで選んだもの | プロフィール（§5） |

- 1回のセッションでは両方を混ぜる。初見がある間は初見を多めに出す（既定は3問中2問、§6.2）。1問を確実にするより、多くの問題に触れることを優先するため。初見の候補が減ってくると、自然に復習の割合が増える。
- 登録した問題は必ず復習に出る。簡単すぎて復習に出したくない問題は、登録しなければよい。
- 初見で解いて申告した問題は、その場で登録され、以後は復習に回る。

## 2. 申告

### 2.1 自己申告にする理由

提出 API（kenkoooo）で AC かどうかは取れるが、解説を見て AC したのか自力で AC したのかは区別できない。そのため申告は自己申告にする。提出データは使わない（登録画面での AC / WA の表示も、AC 済みの問題を初見から外す処理もしない）。解いた問題は自分で登録する。

### 2.2 申告の3段階

申告は、横一列につながった3つのボタン「WA | AC | AC」で選ぶ（DESIGN の `GradeBar`）。2つの AC は、下の小さい文字（苦戦 / 余裕）で区別する。登録画面・セッション画面とも同じ部品を使う。

| grade | ボタン | 意味 | streak |
|---|---|---|---|
| `failed` | WA（解けず） | 自力で AC できなかった（WA のまま、解説・ヒントを見た、撤退した） | 0 にリセット |
| `hard` | AC（苦戦） | 自力で AC したが苦戦した。自力で WA を直した場合もここ | 据え置き |
| `easy` | AC（余裕） | 自力で、実装にも余裕があった | +1 |

- 登録画面では、どれも選んでいない状態が「登録しない」（何も記録しない）。選んだボタンをもう一度押すと選択が外れる。
- 申告欄の近くに、判断基準を1行で常に表示する:「自力で WA を直して AC できたら『AC 苦戦』。解説・ヒントを見た、または撤退したら『WA』。」

## 3. スケジュール

| 申告後の streak | 次の解禁 |
|---|---|
| 0 | 30日後 |
| 1 | 90日後 |
| 2 | 卒業（以後は出題しない） |

- 30日・90日は固定日数（暦月ではない）。
- 次の解禁日は「申告後の streak」で決まる。
- `next_review_at` は締切ではなく解禁日。日ごとのノルマは設けない。

### 3.1 初回（登録・初見）

初回の申告も1回分として数える（`register(grade, now)` = `apply(0, grade, now)`、実装済み）。登録画面からの登録でも、初見での申告でも同じ。

| 初回の申告 | 開始時の streak | 解禁 |
|---|---|---|
| AC（余裕） | 1 | 90日後（次も余裕なら卒業） |
| AC（苦戦） | 0 | 30日後 |
| WA | 0 | 30日後 |

## 4. コンテストの種類（kind）

`contestKind(contestId)`（`src/lib/contest.ts`）で判定する。種類の一覧はこのファイルだけで定義する。

| kind | 判定 | 表示 |
|---|---|---|
| `ABC` | `^abc\d+$` | ABC |
| `ARC` | `^arc\d+$` | ARC |
| `AGC` | `^agc\d+$` | AGC |
| `OTHER` | それ以外すべて | その他 |

`OTHER` は AtCoder Problems の「Other Contests」にあたる。数が多いので、初見に出すものはコンテスト単位で選ぶ（§5）。AtCoder Problems が別枠にしている ABC-Like・PAST・JOI なども、ここでは `OTHER` に含める。

### 4.1 問題記号の正規化

`normalizeIndex(problemIndex)`: `Ex` は `H` として扱う。それ以外は先頭の英大文字1文字（`F2` → `F`）。英大文字を含まない記号はそのまま返す。同期時に `problems.index_norm` に入れる。

## 5. 初見で出す問題（プロフィール）

プロフィールで「登録していなくても出題する問題」を選ぶ。

| 項目 | 内容 | 初期値 |
|---|---|---|
| ABC | 問題記号のチェック（A〜G、Ex/H） | F・G |
| ARC | 問題記号のチェック（A〜F） | なし |
| AGC | 問題記号のチェック（A〜F） | なし |
| その他のコンテスト | コンテスト単位で選ぶ（検索して追加） | なし |
| difficulty の下限・上限 | 補正後の値（§10.1）。上限は「未満」。NULL の問題は範囲に関係なく含める | なし |
| 初見の枠 | 1セッション3問のうち、初見に優先して割り当てる数（0〜3） | 2 |

判定は純粋関数で行う（`src/lib/eligibility.ts`）。

- `isFreshTarget(problem, profile, opts)`: 1問について判定する。カードがある問題は常に偽。
- `buildFreshQuery(profile, kind)`: 同じ条件を D1 の SQL（`WHERE` 句とバインド値）にして返す。件数の集計と抽選に使う。2つの関数が同じ結果になることをテストで確かめる。

設定を変えると、次の抽選から反映される。

## 6. 抽選とセッション

### 6.1 ホームでの選択

ホームでは、いまプールにある問題から、どの種類を出すかを選ぶ。

1. 種類: ABC / ARC / AGC / その他 / すべて。各ボタンに「復習 N ・ 初見 M」の件数を表示する。両方0件の種類は押せない。
2. 選んだ種類での「今回の3問」の内訳（例: 初見 2 ＋ 復習 1）を表示する。
3. 「3問を引く」。

### 6.2 枠の配分とプール

枠の配分は `planSlots(復習の候補数, 初見の候補数, 3, 初見の枠)`（`src/lib/scheduler.ts`、実装済み）で決める。

1. 初見を「初見の枠」（プロフィール、既定 2）まで優先して入れる。
2. 残りの枠を、解禁中の復習で埋める。
3. それでも空いた枠は、もう一方の残りで埋める（復習がなければ初見で、初見がなければ復習で）。

| 例（初見の枠 = 2） | 復習の候補 | 初見の候補 | 結果 |
|---|---|---|---|
| 使い始め | 0 | 500 | 初見 3 |
| ふだん | 10 | 500 | 復習 1 + 初見 2 |
| 初見が残りわずか | 10 | 1 | 復習 2 + 初見 1 |
| 初見を出し切った | 10 | 0 | 復習 3 |

初見を優先すると、1セッションで増えるカード（最大2枚）が、消化する復習（1問）より多くなるので、解禁中の復習は溜まっていく。解禁日は締切ではなく、溜まった復習は解禁からの経過日数で重みが付く（古いものほど出やすい）ため、これは許容する。ホームには解禁中の復習の数を表示し、溜まり具合が見えるようにする。復習を増やしたくなったら、プロフィールで「初見の枠」を減らす。

| 出題元 | プール | 重み |
|---|---|---|
| 復習 | 現役（`graduated_at IS NULL`）、解禁済み（`next_review_at <= now`）、種類が一致 | `1 + 解禁からの経過日数 / 30`（`draw()`、実装済み） |
| 初見 | `buildFreshQuery(profile, kind)` に当たる問題 | 一様 |

- 復習は、候補のカードを読み込んで `draw()` に渡し、`planSlots` の `review` 件だけ引く。
- 初見は候補が多いので、件数を数えたあと、`crypto.getRandomValues` で重複のない OFFSET を `fresh` 件選び、`LIMIT 1 OFFSET ?` で1問ずつ取る。
- 並び順は、初見 → 復習（それぞれ引いた順）。
- streak による重み付けはしない。卒業を急ぐ動機が入ると、申告を甘くする圧力になるため。

### 6.3 セッション

- 引いた結果はすぐに D1 に保存する（`sessions`・`session_items`）。リロードしても同じ問題が出る。
- 開いているセッションは同時に1つまで。全問申告すると自動で閉じる。開いている間は新しく引けない。ホームのボタンは「セッションを再開」になる。途中で閉じる手段は用意しない。
- 初見の問題を申告すると、`register(grade, now)` でカードを作る。以後は復習に回る。

## 7. 登録

### 7.1 入力

入力欄には AtCoder の URL を貼る。解析は `src/lib/problem-id.ts` で行う。

| 入力 | 解釈 |
|---|---|
| `https://atcoder.jp/contests/abc306`（`/tasks` などが続いてもよい） | コンテスト |
| `https://atcoder.jp/contests/abc306/tasks/abc306_d` | 問題 |
| `ABC306`、`abc306_d`（短縮形。画面では案内しないが受け付ける） | コンテスト / 問題 |

- `atcoder.jp` 以外のホストや、解釈できない形は受け付けない。
- URL の問題は、URL のコンテストに属するものとして扱う（`/contests/abc042/tasks/arc058_a` のように、問題 ID の接頭辞とコンテストが違うことがある）。
- 短縮形の問題 ID（`abc306_d`）からはコンテストを決めない。`problems.contest_id` から引く。
- URL の ID は大文字小文字をそのまま使う（`APG4b`、`chokudai_S001` のように大文字を含むコンテストがある）。短縮形は小文字にそろえるので、サーバーは短縮形を大文字小文字を区別せずに引く。

### 7.2 問題を選んで登録する

1. `GET /register?q=<URL>` で、コンテストなら全問、問題ならその1問を、`problems` から問題記号順に並べる。
2. 1行が1問。左に記号・タイトル・difficulty・「初見の対象」ラベル（`isFreshTarget` が真の問題）、右に `GradeBar`（WA | AC | AC）を置く。初期値はどれも選んでいない（= 登録しない）。
3. すでにカードがある問題は、`GradeBar` の代わりに「登録済み ・ カードを開く」を表示する。
4. 「N問を登録」で `POST /register` に送る。N はボタンを選んだ問題の数。
5. 登録した問題は、プロフィールの設定に関係なく復習に出る。何も選ばなかった問題は記録しない（初見の対象なら、後で初見として出ることがある）。
6. 問題1問だけの場合は、メモ（任意）も入力できる。かかった時間は記録しない（§15）。
7. `problems` にない場合（同期前の新しいコンテストなど）は、「問題データが未同期です」と表示する。問題の URL なら、タイトルを手入力して登録できる。
   - コンテストは URL のものを使い、記号は問題 ID の最後の `_` より後ろを大文字にしたもの（`abc999_d` → `D`、`guessProblemIndex`）、difficulty は NULL にする。
   - 短縮形の問題 ID（`abc999_d`）ではコンテストが分からないので、手入力の登録はできない（問題の URL を貼るよう案内する）。
   - 以前に手入力で登録した問題は、未同期のままでもカードから「登録済み」と表示する。

### 7.3 提出状況の表示（作らない）

提出 API は使わない（§2.1）。登録画面に AC / WA は出さない。

### 7.4 登録セッション

- 登録は「登録セッション」にまとめる。最初に登録したときに自動で開く。
- 登録画面の下部に、開いている登録セッションで登録した問題を一覧表示する（今回の登録）。各行に「取り消す」を置く。
- 「取り消す」は、登録セッションが開いていて、そのカードに登録時の申告しかない場合だけできる。カードと、その登録の申告を削除する。セッション（§6.3）に出題中のカードも取り消せない。
- 「登録を終える」で閉じる。開いてから24時間たった登録セッションは、次に登録したときに自動で閉じ、新しい登録セッションを開く。

## 8. 画面と API

React の SPA（Vite でビルドし、Worker の静的アセットとして配信）と、Hono の JSON API（`/api/*`）に分ける。見た目は `docs/DESIGN.md` に従う。

- 業務ルール（streak・解禁日・枠の配分・初見の対象）の確定は、必ずサーバー側で行う。クライアントは `src/lib/` の純粋関数を表示用（ボタンの補足文など）にだけ使ってよい。
- API の入力は zod で検証する（スキーマは `src/shared/schema.ts`）。クライアントは Hono RPC（`hc<AppType>`）で型付きで呼ぶ。
- エラーは `{ "error": { "code": string, "message": string } }` と HTTP ステータスで返す。

### 8.1 画面（クライアントのルート）

ヘッダーのナビは「ホーム / 登録 / 問題表」。プロフィールは右上の自分の名前から開く。

| パス | 画面 |
|---|---|
| `/?kind=ABC` | ホーム（§8.3）。`kind` がなければ `ALL`（すべて） |
| `/session` | セッション（§8.4）。開いているセッションがなければ `/` へ移る |
| `/register?q=<URL>` | 登録（§7） |
| `/table?kind=ABC&page=1` | 問題表（§9） |
| `/cards/:id` | カード詳細と申告履歴 |
| `/profile` | プロフィール（§5） |
| `/login` | トークン入力（`AUTH_MODE=token` で未ログインのとき） |
| `/debug` | デバッグツール（`/api/me` が `debugTools: true` のときだけ表示） |

画面の状態（選んだ種類、ページ番号、検索語）は URL のクエリに持たせる。リロードや戻るで同じ画面に戻れるようにするため。

### 8.2 API

| メソッド・パス | 内容 |
|---|---|
| `GET /api/me` | `{ atcoderUserId, debugTools, clockOffsetDays }`。未認証なら 401 |
| `POST /api/login` | `{ token }`。`AUTH_MODE=token` のときだけ（それ以外は 404）。一致したら cookie を発行する。違えば 401（`invalid_token`） |
| `GET /api/home?kind=ABC` | ホームに必要なもの一式: 種類ごとの `{ review, fresh }` 件数、選んだ種類の `planSlots` の結果、統計、次の解禁日、開いているセッションの有無、30日グラフと草の集計。`kind` の既定は `ALL`。`{ kind, kinds, plan, stats, nextUnlockAt, openSession }`（`openSession` は `{ id, kind, drawnAt, total, graded }` か `null`）。初見の件数はステップ6、グラフと草はステップ8で足す |
| `POST /api/sessions` | `{ kind }` で抽選してセッションを作る（201 と `{ session }`）。開いているセッションがあれば、作らずに 409（`session_open`）とそのセッションを返す。出せる問題がなければ 409（`empty_pool`） |
| `GET /api/sessions/current` | 開いているセッション（なければ `null`） |
| `POST /api/sessions/current/items/:position/grade` | `{ grade, note? }`。結果（streak の前後、次の解禁日、セッションが閉じたか）を返す: `{ position, result: { grade, streakBefore, streakAfter, nextReviewAt, note }, sessionClosed }`。対象は直近のセッションなので、最後の1問の二重送信（セッションはもう閉じている）でも記録済みの結果を返す。楽観ロックに負けたら 409 |
| `GET /api/register/lookup?q=<URL>` | URL を解析し、問題の一覧を返す（各問題の difficulty、カードの有無、`isFreshTarget`）。`{ target, contest, problems, manual }`。`manual` は未同期の問題を手入力で登録するときの既定値（`{ problemId, contestId, problemIndex }`）。解析できなければ 400（`invalid_url`）。`isFreshTarget` はステップ6で足す |
| `POST /api/register` | `{ items: [{ problemId, grade, note?, title?, contestId? }] }`（1〜100件、同じ問題は1回まで）。`title` と `contestId` は未同期の問題を手入力で登録するときだけ、組で渡す。`{ registered: [{ cardId, problemId }], skipped: [problemId] }` を返す。問題データになく `title` もない問題があれば 400（`unknown_problem`）で、何も書き込まない。同時に同じ問題の登録が届いたら 409 |
| `GET /api/register/session` | 開いている登録セッションと、そこで登録した問題 |
| `DELETE /api/register/items/:cardId` | 今回の登録から取り消す（§7.4 の条件を満たすときだけ。満たさなければ 409 `cannot_undo`、カードがなければ 404） |
| `POST /api/register/session/close` | 登録を終える |
| `GET /api/table?kind=ABC&page=1` | 問題表のデータ（20コンテスト分、各セルの状態） |
| `GET /api/cards/:id`・`DELETE /api/cards/:id` | カード詳細と申告履歴 / カード削除（申告も消える） |
| `GET /api/profile`・`PUT /api/profile` | プロフィール（§5） |
| `GET /api/contests?q=` | その他のコンテストの検索（ID・名前、問題数つき。最大20件） |
| `/api/debug/*` | デバッグツール（`DEBUG_TOOLS=1` のときだけ。それ以外は 404）。`POST /clock`（`{ addDays }`、いまのずれに足す。±3650日まで）、`POST /clock/reset`、`POST /unlock`（`{ target }`、カード ID か問題 ID）、`POST /sample` |

### 8.3 ホーム

- 種類の選択（§6.1）と、選んだ種類での「今回の3問」の内訳、「3問を引く」。0件なら押せない。復習が0件のときは「次の解禁は 10/4」も表示する。
- ステップ6までは初見がないので、説明は「解禁中の復習から、解禁からの日数が長いものほど出やすく引きます。」にする。
- 開いているセッションがあれば、選択の代わりに「セッションを再開（1 / 3）」だけを表示する。
- 統計: 現役 / 復習の解禁中 / 卒業 / 初見の候補。
- 30日グラフと草（§10）。

### 8.4 セッション

- 上部に種類・抽選時刻・内訳・進捗を表示する（例:「ABC のセッション」「初見 2 ・ 復習 1」）。
- 各問題に「復習」か「初見」のラベルを付ける。初見には streak の代わりに「まだ登録していない問題」と表示する。
- 各問題は3状態: 未着手（「開始」と「問題を開く」）、挑戦中（`GradeBar`・メモ）、申告済み（1行に畳む）。
- `GradeBar` の補足文は、その問題の streak から `apply()` で計算して表示する（初見は streak 0 として計算する）。確定はサーバーが返した結果で表示し直す。
- 「問題を開く」は新しいタブで開き、その問題を挑戦中にする。
- 申告の送信中はボタンを無効にする（二重送信を防ぐ）。
- 3問とも申告したら、ホームに戻して「セッション完了: 余裕 1 ・ 苦戦 1 ・ 解けず 1」を1回だけ表示する（履歴の state で渡し、表示したら消す。リロードや戻るでは出さない）。
- 未着手から挑戦中にするのは「開始」か「問題を開く」。挑戦中は同時に1問だけ。

## 9. 問題表

AtCoder Problems の Table のように、行をコンテスト、列を問題記号にして、各問題の状態を色で表示する。

- タブは ABC / ARC / AGC / その他。行は新しいコンテストから順に並べ、20コンテストずつページ送りにする。
- 「その他」タブに出すのは、プロフィールで選んだコンテストと、カードが1枚以上あるコンテストだけ（プロフィールで選んだコンテストはステップ6で足す）。
- 問題が1問もないコンテストは出さない。
- 列はその種類の問題記号（`index_norm`）。基本の列（ABC は A〜G、ARC・AGC は A〜F）に、表示中のコンテストにあるほかの記号（Ex/H、ARC の G など）を足す（`tableColumns`、`src/lib/contest.ts`）。`F` と `F2` のように同じ列に2問入るときは、セルの中に縦に並べ、記号も書く。
- 「その他」は記号がコンテストごとにばらばら（`001`〜`090` など、1回で最大137問）なので列をそろえない。行の中に問題を記号順に並べて折り返す。
- セル: difficulty の点、タイトル、状態の補足。押すと、カードがあればカード詳細へ、なければ問題単位の登録画面（`/register?q=<問題 URL>`）へ移る。
- 状態は `cardStatus(problem, card, profile, now)`（`src/lib/eligibility.ts`）で決める。サーバーで計算して `/api/table` に含める。ステップ3の時点では `cardStatus(card, now)` で、ステップ6で問題とプロフィールを受け取るように広げる。

| 状態 | 条件 | セル |
|---|---|---|
| 未登録・初見に出る | カードなし、`isFreshTarget` が真 | 白 |
| 未登録・出ない | カードなし、`isFreshTarget` が偽 | 灰 |

ステップ6までは2つを区別せず、どちらも「未登録」（白）と表示する。
| 待機中 | 現役・未解禁 | streak 0 は橙系、1 は青系。補足「あと N日」 |
| 解禁中 | 現役・解禁済み | streak の色に濃い枠。補足「解禁 N日」 |
| 卒業 | `graduated_at` あり | 緑系。補足「卒業」 |

## 10. グラフ

集計はサーバー側で行い（`/api/home` に含める）、クライアントは React のコンポーネントで div か SVG として描く。グラフのライブラリは使わない。集計は純粋関数（`src/lib/stats.ts`）にしてテストする。日付の区切りは JST。

### 10.1 difficulty の補正と色

- AtCoder 公式の値ではなく AtCoder Problems の推定値。表示する画面には出典を書く。
- 表示値: `d >= 400 ? d : 400 / exp((400 - d) / 400)`。整数に丸める。
- 色帯（補正後）: 〜399 灰 / 400〜 茶 / 800〜 緑 / 1200〜 水 / 1600〜 青 / 2000〜 黄 / 2400〜 橙 / 2800〜 赤。NULL は「—」で、色は灰。

### 10.2 直近30日に自力で解いた問題（積み上げ棒グラフ）

- 今日を含む直近30日を、1日1本で並べる。
- 1本 = その日の `grade IN ('easy', 'hard')` の申告（登録・初見・復習のすべて）。1問1ブロックで、difficulty の色帯ごとに下から易しい順に積む。
- 右上に30日の合計を表示する。

### 10.3 取り組みの記録（草）

- 直近53週。列が週（日曜始まり）、行が曜日。未来の日は描かない。
- 数えるのは、その日の申告の数（grade は問わない）。
- 濃さは5段階: 0 / 1 / 2〜3 / 4〜5 / 6以上。
- 右上に1年の合計を表示する。各セルの `title` に「9/14: 3回」と書く。

## 11. データモデル（D1）

- 日時はすべて UTC の ISO 8601 文字列で保存し、表示は JST にする。
- 複数テーブルにまたがる書き込みは `db.batch()` で1トランザクションにする。
- `attempts` は追記専用（例外: 登録の取り消しと、カード削除の CASCADE）。

```sql
-- migrations/0001_init.sql

CREATE TABLE contests (
  id                 TEXT PRIMARY KEY,       -- 'abc306'
  title              TEXT NOT NULL,
  start_epoch_second INTEGER NOT NULL,
  duration_second    INTEGER NOT NULL,
  kind               TEXT NOT NULL,          -- contestKind(id)
  synced_at          TEXT NOT NULL
);
CREATE INDEX contests_kind_start ON contests (kind, start_epoch_second DESC);

CREATE TABLE problems (
  id              TEXT PRIMARY KEY,          -- 'abc306_d'
  contest_id      TEXT NOT NULL,
  problem_index   TEXT NOT NULL,             -- 'D'、'Ex' など元の値
  index_norm      TEXT NOT NULL,             -- normalizeIndex() の結果
  kind            TEXT NOT NULL,             -- contestKind(contest_id)
  title           TEXT NOT NULL,
  difficulty      REAL,                      -- problem-models.json の生の値
  difficulty_disp INTEGER,                   -- 補正後の値（§10.1）。同期時に計算する
  is_experimental INTEGER NOT NULL DEFAULT 0,
  synced_at       TEXT NOT NULL
);
CREATE INDEX problems_contest ON problems (contest_id, problem_index);
CREATE INDEX problems_kind ON problems (kind, index_norm);

CREATE TABLE user_ac (
  problem_id  TEXT PRIMARY KEY,              -- 使わない（§14.2）。0001 で作ってしまったので残してある
  first_ac_at TEXT NOT NULL
);

CREATE TABLE profile (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  atcoder_user_id TEXT,
  fresh_targets   TEXT NOT NULL,             -- JSON: {"ABC":["F","G"],"ARC":[],"AGC":[],"OTHER":["dp","tdpc","typical90"]}
  min_difficulty  INTEGER,                   -- 補正後。NULL = 下限なし
  max_difficulty  INTEGER,                   -- 補正後、この値未満。NULL = 上限なし
  exclude_solved  INTEGER NOT NULL DEFAULT 1, -- 使わない（§14.2）
  fresh_quota     INTEGER NOT NULL DEFAULT 2 CHECK (fresh_quota BETWEEN 0 AND 3),
  updated_at      TEXT NOT NULL
);

CREATE TABLE cards (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  problem_id     TEXT NOT NULL UNIQUE,
  contest_id     TEXT NOT NULL,
  problem_index  TEXT NOT NULL,
  kind           TEXT NOT NULL,
  title          TEXT NOT NULL,              -- 登録時点のスナップショット
  difficulty     REAL,                       -- 同上。表示は problems 側を優先
  streak         INTEGER NOT NULL CHECK (streak IN (0, 1, 2)),
  next_review_at TEXT,                       -- 卒業したら NULL
  graduated_at   TEXT,
  first_grade    TEXT NOT NULL CHECK (first_grade IN ('easy', 'hard', 'failed')),
  origin         TEXT NOT NULL CHECK (origin IN ('register', 'fresh')),  -- 登録画面か、初見か
  created_at     TEXT NOT NULL,
  CHECK ((graduated_at IS NULL) = (next_review_at IS NOT NULL)),
  CHECK ((streak = 2) = (graduated_at IS NOT NULL))
);
CREATE INDEX cards_pool ON cards (kind, next_review_at) WHERE graduated_at IS NULL;
CREATE INDEX cards_contest ON cards (contest_id);

CREATE TABLE sessions (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  kind      TEXT NOT NULL,                   -- 'ABC' / 'ARC' / 'AGC' / 'OTHER' / 'ALL'
  drawn_at  TEXT NOT NULL,
  closed_at TEXT
);
CREATE UNIQUE INDEX sessions_one_open ON sessions ((closed_at IS NULL)) WHERE closed_at IS NULL;

CREATE TABLE session_items (
  session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,               -- 1..3
  problem_id TEXT NOT NULL,
  card_id    INTEGER REFERENCES cards (id) ON DELETE CASCADE,  -- 初見は申告するまで NULL
  PRIMARY KEY (session_id, position),
  UNIQUE (session_id, problem_id)
);

CREATE TABLE reg_sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  closed_at  TEXT
);
CREATE UNIQUE INDEX reg_sessions_one_open ON reg_sessions ((closed_at IS NULL)) WHERE closed_at IS NULL;

CREATE TABLE attempts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id        INTEGER NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('register', 'fresh', 'review')),
  session_id     INTEGER REFERENCES sessions (id),       -- fresh / review のとき
  reg_session_id INTEGER REFERENCES reg_sessions (id),   -- register のとき
  attempted_at   TEXT NOT NULL,
  grade          TEXT NOT NULL CHECK (grade IN ('easy', 'hard', 'failed')),
  elapsed_sec    INTEGER,                    -- 使わない（§15）。常に NULL
  streak_before  INTEGER NOT NULL,           -- register / fresh は 0
  streak_after   INTEGER NOT NULL,
  next_review_at TEXT,                       -- この申告で決まった解禁日（卒業なら NULL）
  note           TEXT
);
CREATE INDEX attempts_card ON attempts (card_id, attempted_at);
CREATE INDEX attempts_time ON attempts (attempted_at);
CREATE UNIQUE INDEX attempts_once_per_session ON attempts (session_id, card_id) WHERE session_id IS NOT NULL;

CREATE TABLE app_meta (
  key   TEXT PRIMARY KEY,   -- 'problems_synced_at' / 'debug_clock_offset_days'
  value TEXT NOT NULL
);
```

attempts に `streak_before` / `streak_after` / `next_review_at` を残すのは、後でスケジュールのパラメータを変えたくなったときに、生ログから再シミュレーションできるようにするため。

### 11.1 申告の書き込み

1. 開いているセッションの `position` の項目を読む。なければ 404。
2. 復習（`card_id` あり）: カードの streak を読み、`apply(streak, grade, now)` を計算する。batch で次を実行する。
   - attempts の INSERT（`kind='review'`）
   - `UPDATE cards ... WHERE id=? AND streak=?`（読んだ streak で楽観ロック）
   - 全問申告済みなら sessions の `closed_at` を更新
3. 初見（`card_id` が NULL）: `register(grade, now)` を計算する。batch で次を実行する。
   - cards の INSERT（`origin='fresh'`）
   - attempts の INSERT（`kind='fresh'`、`card_id` は `(SELECT id FROM cards WHERE problem_id=?)`）
   - `UPDATE session_items SET card_id=...`
   - 全問申告済みなら sessions の `closed_at` を更新
4. 一意制約違反は二重送信とみなし、すでに記録された結果を 200 で返す。

### 11.2 登録の書き込み

1問ごとに `register(grade, now)` を計算する。cards の INSERT（`origin='register'`）と attempts の INSERT（`kind='register'`、`reg_session_id`）を、全問まとめて1回の batch で実行する。すでにカードがある問題は飛ばし、レスポンスの `skipped` に入れる。画面では「登録済みのため飛ばしました」と表示する。

## 12. 時刻

- サーバー側の現在時刻は `src/worker/clock.ts` の `now(env)` から取る。ずれの計算は純粋関数として `src/lib/clock.ts` に置く。
- `DEBUG_TOOLS=1` のとき、`now()` は実時刻に `app_meta.debug_clock_offset_days` 日を足して返す。本番では常に実時刻。
- 「あと N日」「N日経過」は経過時間で数え、日単位で切り上げる。

## 13. デバッグツール（`/debug`）

`DEBUG_TOOLS=1`（`.dev.vars` にだけ書く）のときだけ動かす。それ以外は `/api/debug/*` が全部 404 を返し、画面にも出さない。

- 時計を ±N 日ずらす。いまのずれを表示し、0 に戻すボタンも置く。
- 指定したカードを今すぐ解禁する（`next_review_at = now()`）。
- サンプルデータを入れる（ローカル D1 だけ）。カードのない ABC / ARC / AGC の C〜F から12問を選び、streak 0 の解禁中・streak 1 の解禁中・streak 0 の待機中・卒業を3枚ずつ、登録の申告（卒業は復習の申告も）と一緒に入れる。問題データの同期が先に要る。
- 画面上部に「DEBUG ・ 時計 +N日」の帯を常に表示する。

## 14. 同期スクリプト

Worker の中では取得しない。Workers Free の CPU 時間は1回 10ms で、数 MB の JSON をパースするには足りないため（`docs/CLOUDFLARE.md` §5）。Node スクリプト `scripts/sync-problems.ts` が取得し、UPSERT の SQL を作って `wrangler d1 execute --file` で流す。`--local` / `--remote` は引数で選ぶ。本番は GitHub Actions で週1回（月曜 03:00 JST）と手動（`workflow_dispatch`）で実行する。

### 14.1 コンテストと問題

- 取得元（AtCoder Problems / kenkoooo）
  - `https://kenkoooo.com/atcoder/resources/contests.json`
  - `https://kenkoooo.com/atcoder/resources/problems.json`
  - `https://kenkoooo.com/atcoder/resources/problem-models.json`（difficulty はここにある）
  - `https://kenkoooo.com/atcoder/resources/contest-problem.json`（どのコンテストにどの問題が、どの記号で入っているか）
- 問題が属するコンテストは1つに決める（`homeContest`、`src/lib/problem-sync.ts`）。`problems.json` の `contest_id` は使わない（`abc306_d` が AtCoder Daily Training の G になっているなど、再収録先のことがある）。
  1. `contest-problem.json` で、問題 ID の接頭辞と一致するコンテスト（`abc306_d` → `abc306`。コンテスト ID のハイフンはアンダースコアとして比べる）
  2. なければ、収録しているコンテストのうち開始がいちばん早いもの（同時刻なら ID 順）
  - `problem_index` は、そのコンテストでの記号にする。
  - ABC と ARC の同時開催（ABC042〜ABC111 の46回）の共通問題（`arc058_a` など）は、1 により ARC 側に属する。問題表の ABC042 の行は A・B だけになり、C・D は ARC058 の行に出る。初見の判定も ARC の問題として行う。
- 同期のときに `kind`・`index_norm`・`difficulty_disp` を計算して入れる（`src/lib` の関数を使い回す）。問題名は `problems.json` の `name`（記号を含まない）を使う。
- UPSERT は値が変わった行だけ更新する（`ON CONFLICT DO UPDATE ... WHERE` で差分のある行に絞る）。`synced_at` は値が変わった行だけ新しくなる。行は削除しない。
- SQL の生成は純粋関数（`buildSyncSql`）にしてテストする。値は `sqlLiteral` でだけ埋め込む（SQL ファイルを流すので bind() を使えない）。
- `--dry-run` を付けると、SQL を作るだけで流さない。取得した問題が1000件未満なら、取得の失敗とみなして止める。
- 最後に `app_meta.problems_synced_at` を更新する。

### 14.2 自分の AC（作らない）

自分の AC は同期しない。AC 済みの問題を初見から自動で外すこともしない（解いた問題は自分で登録する）。`user_ac` テーブルと `profile.exclude_solved` は 0001 で作ってしまったので残してあるが、使わない。

## 15. かかった時間（記録しない）

まとまった時間で解くとは限らず、時間から苦戦したかどうかを判断できないので、かかった時間は記録しない。タイマーも入力欄も作らない。`attempts.elapsed_sec` は常に NULL。localStorage も使わない。

## 16. バックアップ

バックアップは取らない。D1 の Time Travel（無料プランは直近7日分）だけに頼る。アプリ内のエクスポート画面も作らない。

- 手元にも GitHub Actions にも DB を書き出さない。リポジトリは公開するため（公開リポジトリのワークフローの成果物は誰でもダウンロードできる）。ワークフローのログにも DB の中身を出さない。
- 7日より前の状態には戻せない。マイグレーションなどの大きな変更は、ローカルで確かめてから本番に当てる。

## 17. 認証

`AUTH_MODE` で切り替える。Hono のミドルウェアとして `/api/*` の全ルートに適用する。

| AUTH_MODE | 使う場面 | 挙動 |
|---|---|---|
| `none` | ローカル開発だけ | 認証しない。`DEBUG_TOOLS=1` のときだけ許可する（それ以外でこの値なら 500） |
| `token` | ドメイン準備前（workers.dev） | `POST /api/login` の `token` が secret `AUTH_TOKEN` と一致したら、cookie `drill_auth` を発行する。以降は cookie を定数時間比較で検証する。cookie は HttpOnly・Secure・SameSite=Lax・400日。cookie の値は `AUTH_TOKEN` そのものではなく、`AUTH_TOKEN` を鍵にした固定文字列の HMAC-SHA256（`AUTH_TOKEN` を変えると、発行済みの cookie はすべて無効になる）。`AUTH_TOKEN` が未設定なら 500 |
| `access` | 独自ドメイン + Cloudflare Access | `Cf-Access-Jwt-Assertion` を `jose` で検証する（鍵: `https://{ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`、aud: `ACCESS_AUD`、iss: `https://{ACCESS_TEAM_DOMAIN}`） |

- 未設定や未知の値は 500 を返す（fail closed）。判定は `src/lib/auth-mode.ts` の `resolveAuthMode`（テストあり）。
- `access` の検証はステップ11で作る。それまでは `access` でも 500 を返す。
- クライアントは、`/api/me` が 401 なら `/login` を表示する（`token` のとき）。
- 静的アセット（HTML・JS・CSS）は Worker を通らずに配信されるので、`token` のときは誰でも取得できる。中身はアプリのコードだけで、データは含まないため許容する。データは必ず `/api/*` からだけ返す。`access` に切り替えると、静的アセットも含めて Access の内側に入る。
- CSRF 対策: `/api/*` に `hono/csrf`（Origin の確認）をかける。状態を変える API は JSON の本文だけを受け付ける。
- Access に切り替えたら `workers_dev` と `preview_urls` を false にする。

## 18. 未決事項（v1 では作らない）

- 卒業した問題の復帰
- 誤った申告の取り消し（取り消しを表す行を追記する方式が候補）
- スマホ最適化（レスポンシブの最低限は v1 でやる）

## 19. 実装順と状況

縦に1本ずつ通す。各ステップは `npm test`・`npm run typecheck`・`npm run build` がすべて通った状態で終える。

- [x] 0. scheduler（`src/lib/scheduler.ts`）とテスト
- [x] 1. 土台: 純粋関数（`clock` / `difficulty` / `problem-id` / `contest` / `format`）とテスト、マイグレーション 0001、API の骨組み（エラー形式・zod・RPC の型の書き出し）、認証（`none` / `token`）と CSRF、React 側のレイアウト・ルーター・トークン・`/api/me` と `/login`
- [x] 2. 同期スクリプト（§14.1 を `--local` で確認）
- [x] 3. 登録（URL から選ぶ・登録セッション）と問題表（この時点では「初見に出る / 出ない」の区別なし）
- [x] 4. 復習の抽選 → セッション → 申告、ホーム（種類の選択。この時点では復習だけ）、デバッグツール
- [ ] 5. デプロイ（token 認証、workers.dev）と Actions の同期 ※人が実行する
- [ ] 6. プロフィールと初見（`eligibility.ts`、`planSlots` による混ぜ方、初見の申告、問題表の初見の区別）
- [x] 7. ~~タイマー（`useTimer`）~~ 作らない（§15）
- [ ] 8. ホームのグラフと草（`stats.ts`）
- [ ] 9. カード詳細とカード削除
- [x] 10. ~~提出状況の表示（§7.3）と `user_ac` の同期（§14.2）~~ 作らない
- [ ] 11. Access 認証への切り替え ※Cloudflare 側の設定は人が行う
- [ ] 12. 見た目の仕上げとレスポンシブ

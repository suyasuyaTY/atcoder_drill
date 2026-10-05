# デザイン

画面案（キャンバス）: https://claude.ai/artifact/UP7HT5QpC6AeiexnejzdQS
ホーム / セッション / 登録 / 問題表 / プロフィール / カード詳細の6枚（v2.1）。書き出した画像は `docs/design/` に置く。

画面案の数値（difficulty、件数、日数、グラフの形）はサンプル。見た目と構成だけを正とする。

## 1. 方針

- 白い面と薄い灰色の地。線は細く、角は丸め、余白を広く取る。装飾は足さない。
- 主操作（3問を引く、登録、保存）は黒いボタン。リンクと選択状態は青。
- 色で意味を持たせるのは「申告」「difficulty」「問題表の状態」「草」だけ。それ以外は白黒で組む。
- 使わないもの: グラデーション、影の重ね、左端だけ太い線の装飾、絵文字、イラスト、明朝体。

## 2. トークン

`src/react-app/styles/tokens.css` にこのまま置き、`main.tsx` で読み込む。ほかの CSS からは変数だけを参照する。ここにない色は足さない。

```css
:root {
  /* 地・面・文字 */
  --bg:            #F6F7F9;
  --surface:       #FFFFFF;
  --surface-sub:   #FAFBFC;  /* 表ヘッダー・フッター */
  --surface-done:  #F0F2F5;  /* 申告済みのカード */
  --chip-bg:       #EEF1F4;  /* ナビの選択中・セグメントの地 */
  --text:          #1F2329;
  --text-muted:    #5E6672;  /* 白地で 5.9:1 */
  --text-faint:    #9AA3AD;  /* 非活性・未達成の丸だけ。文章には使わない */
  --line:          #E3E6EA;
  --line-strong:   #CDD2D8;  /* 入力欄・副ボタンの枠 */
  --line-row:      #EEF0F3;

  /* 操作 */
  --primary:       #1F2329;  /* 主ボタン。白文字 */
  --link:          #1F6FD1;
  --link-hover:    #164F96;
  --danger:        #B33A0A;

  /* 申告（明度も変えてあるので、色の見え方によらず区別できる） */
  --grade-easy-bg:   #1F7A4D;  /* 白文字 */
  --grade-hard-bg:   #F6C25B;  /* 黒文字 */
  --grade-failed-bg: #FFFFFF;  /* 黒文字 + --line-strong の枠 */

  /* 初見の対象ラベル */
  --fresh-bg:      #EAF2FD;
  --fresh-text:    #164F96;

  /* 問題表の状態 */
  --cell-off:      #E9ECEF;  /* 未登録・出ない */
  --cell-streak0:  #FDE4C2;
  --cell-streak1:  #D6E6FA;
  --cell-graduated:#CFEBD8;
  --cell-pool-ring: inset 0 0 0 2px #1F2329;

  /* 草（0〜4） */
  --grass-0: #E6E9ED;
  --grass-1: #BFE3C8;
  --grass-2: #7CC593;
  --grass-3: #3E9A5E;
  --grass-4: #1F6B3E;

  /* 注意の帯 */
  --notice-bg:   #FFF6E5;
  --notice-line: #F1D7A6;

  /* difficulty の色帯（AtCoder Problems の慣例に合わせる。点・棒にだけ使い、文字色には使わない） */
  --diff-gray: #808080; --diff-brown: #804000; --diff-green: #008000; --diff-cyan: #00C0C0;
  --diff-blue: #0000FF; --diff-yellow: #C0C000; --diff-orange: #FF8000; --diff-red: #FF0000;

  /* 文字 */
  --font: 'Lato', 'Noto Sans JP', sans-serif;

  /* 角丸 */
  --r-s: 6px;  --r-m: 8px;  --r-l: 10px;  --r-xl: 14px;  --r-pill: 999px;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-variant-numeric: tabular-nums;
}
```

### フォント

Lato を先に指定するので、英数字は Lato、日本語は Noto Sans JP で表示される。`index.html` の `<head>` に置く。

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
```

| 用途 | サイズ / 太さ |
|---|---|
| ページ見出し（h1） | 22px / 700 |
| カード見出し（挑戦中の問題名） | 26px / 900 |
| 大きな数字（プール数） | 44px / 900 |
| 統計の数字 | 26px / 900 |
| セクション見出し（h2） | 16px / 700 |
| 本文 | 14px / 400 |
| 補足 | 12〜13px / 400、`--text-muted` |
| 問題記号（ABC306 D） | 13px / 700、`--text-muted` |

### レイアウト

- ヘッダー: 高さ 60px、白、下に 1px の `--line`。左右の余白は 40px。左にロゴ「復習ドリル」（17px / 900）とナビ（ホーム / 登録 / 問題表）。右上に自分の名前（人のアイコン + AtCoder ID のピル）を置き、プロフィールへのリンクにする。
- 本文の幅: ホーム・登録は 1040px、問題表は 1120px、セッション・詳細は 880px、プロフィールは 760px。上下の余白は 36px / 56px。
- 面（パネル）: 白、1px の `--line`、角丸 14px、内側の余白 24〜28px。面と面の間隔は 16〜20px。
- 余白は 4 の倍数。

## 3. コンポーネント（`src/react-app/components/`）

| コンポーネント | 仕様 |
|---|---|
| `Header` | 上記。選択中のナビは `--chip-bg` の地 + 太字 + `aria-current="page"`。右上の名前ピルは白地に `--line` の枠、プロフィール表示中は `--text` の枠 |
| `Button` | `primary`（黒地・白文字）、`secondary`（白地・`--line-strong` の枠）、`outline`（白地・黒枠。「開始」「読み込む」）、`danger`（白地・`--danger` の枠と文字）。高さ 40〜52px |
| `KindPicker` | 種類のボタン（ABC / ARC / AGC / その他 / すべて）。高さ 48px、角丸 12px、2行（1行目に種類名 14px / 700、2行目に「復習 N ・ 初見 M」11px）。選択中は黒地に白文字、他は白地に枠、両方0件は点線の枠で押せない。選択は URL のクエリ（`?kind=`）に持たせ、`<Link>` で切り替える |
| `GradeBar` | 申告の部品。登録画面とセッション画面の両方で使う。横一列につながった3つのボタン「WA | AC | AC」。外枠は 1px の `--line-strong`、角丸 10〜12px、`overflow: hidden`、ボタンの間は 1px の縦線。各ボタンは2行で、1行目に「WA」「AC」（太字）、2行目に小さく「解けず」「苦戦」「余裕」。未選択は白地、選択中は WA = 黒地に白文字、AC 苦戦 = `--grade-hard-bg`、AC 余裕 = `--grade-easy-bg`。<br>props は `value: Grade | null`、`onChange`、`size: 'compact' | 'large'`、`hints?`（2行目の結果の文）。中身は3つの `<button>`（`aria-pressed` で選択状態を示す）。<br>登録画面（compact）: 幅 300px、高さ 44px。選択中のボタンをもう一度押すと `null`（= 登録しない）に戻る。<br>セッション画面（large）: 幅いっぱい、高さ 72px。押すと即座に申告を送信する（送信中は3つとも無効）。2行目に結果も書く（「解けず ・ 0 に戻る」「苦戦 ・ 3ヶ月後にまた」「余裕 ・ 卒業」。streak から計算する） |
| `SourceTag` | セッションの各問題に付ける「復習」（`--chip-bg` の地）/「初見」（`--fresh-bg` の地、`--fresh-text`）。11px / 700、ピル |
| `GradeChip` | 申告の小さいラベル（12px / 700、ピル）。色は申告と同じ |
| `FreshTag` | 「初見の対象」（11px / 700、`--fresh-bg` の地、`--fresh-text`）。登録しなくても初見に出る問題の印。`title` で意味を補足する |
| `ContestPicker` | プロフィールの「その他のコンテスト」。選んだコンテストを黒いピル（右に × ボタン）で並べ、その下に検索欄と結果の一覧（checkbox + ID + 名前 + 問題数）を置く。検索欄は入力が止まって 300ms たったら `GET /api/contests?q=` を呼ぶ |
| `StreakDots` | 丸2つ（10px、詳細画面は 14px）。達成分は `--grade-easy-bg` で塗り、残りは `--text-faint` の枠。横に「あと N回の余裕で卒業」 |
| `DifficultyDot` | 色帯の点（8〜9px）と数値。NULL は「—」。`title="AtCoder Problems 推定値"` |
| `Stat` | ラベル（12px、muted）と数字（26px / 900） |
| `DailyBars` | §5 |
| `Grass` | §5 |
| `ProblemTable` | §4 |
| `Notice` | `--notice-bg` の地と `--notice-line` の枠、角丸 10px。API のエラーや「セッション完了」の表示に使う |
| `ExternalLink` | 右に外部リンクのアイコン（線の SVG、13px）。`target="_blank" rel="noopener"` |

アイコンは線の SVG をその場に書く（`stroke="currentColor"`、stroke-width 2）。

## 4. 問題表

- `table-layout: fixed`。コンテスト列は 84px、残りを問題記号の列で等分する。
- セル: 高さ 56px、左右の余白 10px、左と下に 1px の `--line-row`。1行目は difficulty の点とタイトル（12px / 700、はみ出したら省略記号）、2行目は補足（11px、muted）。
- 背景色は SPEC §9 の状態で決める。解禁中は背景に加えて `--cell-pool-ring` を付ける。「未登録・出ない」は `--cell-off` の地にし、文字を `--text-muted`、点を半透明にする。
- 表の上に凡例（未登録・初見に出る / 未登録・出ない / streak 0 / streak 1 / 卒業 / 解禁中）、表の下に difficulty の出典と「登録した問題は設定に関係なく復習に出る」旨を置く。
- 種類のタブは、`--chip-bg` の地に白いピルを乗せたセグメント型。
- 「その他」タブは列をそろえず、コンテストの列の右に、幅 160px のセルを記号順に並べて折り返す（SPEC §9）。
- 1つの列に2問入るとき（`F` と `F2`）は、セルを縦に重ね、タイトルの前に記号を書く。

## 5. グラフ

### DailyBars（直近30日）

- 1日1本、幅 24px、間隔 9px。高さ 150px の枠の下端に 1px の `--line-strong` を引く。
- 1問 = 高さ 24px のブロック（角丸 3px、ブロック間は 2px）。下から易しい色帯の順に積む。6問を超える日は、ブロックの高さを `150 / 問題数` に縮める。
- 7日おきに日付ラベル（11px、muted）。
- 下に色帯の凡例と「difficulty は AtCoder Problems の推定値」を書く。

### Grass（取り組みの記録）

- 13px の正方形、間隔 4px、角丸 3px。53列 × 7行。
- 上に月のラベル、右下に「少ない □□□□□ 多い」の凡例。
- 各セルに `title`（例: 「9/14: 3回」）。数字を色だけで伝えないため。

## 6. 画面ごとの状態

### ホーム（`/`）

- 上から、種類（KindPicker）と説明（「初見を多めに出し（3問中2問）、残りを解禁中の復習から出します。初見の割合はプロフィールで変えられます」）。右側に「今回の3問」の内訳（「2 初見 ＋ 1 復習」、数字は 28px / 900）と「3問を引く」
- 開いているセッションがある: 選択を隠し、「セッションを再開（1 / 3）」だけを出す
- 選んだ種類が復習・初見とも0件: ボタンを無効にする。復習が0件なら「次の解禁は 10/4」も出す
- 1〜2問: ボタンを「N問を引く」にする

### セッション（`/session`）

- 申告済みは `--surface-done` の地で1行に畳む。挑戦中は `--line-strong` の枠で大きく表示する。未着手は小さく表示する。
- 各問題に SourceTag を付ける。申告は GradeBar で、その下に判断基準を常に表示する。

### 登録（`/register`）

- 入力前は入力欄だけを表示する。
- 入力欄のラベルは「AtCoder の URL（コンテストのページ、または問題のページ）」。
- URL を読み込んだら、問題の一覧（SPEC §7.2）、フッター（「何も選ばなかった問題は登録しません。登録した問題は、プロフィールの設定に関係なく復習に出ます。」と「N問を登録」）、その下に「今回の登録」を表示する。
- 「今回の登録」の行: 問題記号・タイトル・申告・解禁日・「取り消す」（リンク風のボタン）。
- エラーは入力欄の直下に `--danger` で表示する。

### 問題表（`/table`）

- ページ送りは表の下に「新しい 20件 / 古い 20件」を置く。

### プロフィール（`/profile`）

- 面の見出しは「初見で出す問題」。説明に「登録した問題は、この設定に関係なく復習に出ます」と書き、右上にいまの候補数を出す。
- 問題記号のチェックは 40px 四方のトグル。オンは黒地に白文字、オフは白地に点線の枠と薄い文字。中身は `<input type="checkbox">` + `<label>`。
- 種類ごとの右に、いまの設定の要約（「F・G」「出さない」など）を自動で表示する。
- その下に ContestPicker、difficulty の下限・上限、「3問のうち初見の枠」（0〜3 のセグメント。既定 2）。
- 変更は「保存」を押したときにまとめて `PUT /api/profile` で送る。未保存の変更があるときは、保存ボタンの横に「未保存の変更があります」と出す。

### デバッグの帯

`DEBUG_TOOLS=1` のとき、ヘッダーの上に高さ 32px の帯を出す。黒地に白文字で「DEBUG ・ 時計 +45日」と書き、右端に `/debug` へのリンクを置く。

## 7. レスポンシブ（v1 は最低限）

- 720px 以下: 本文の左右余白を 16px にする。統計を2列、申告ボタンを1列に並べる。ナビと種類のピルは横スクロールにする。
- 問題表・草・30日グラフは、その面の中だけ横スクロールにする（ページ全体は横にスクロールさせない）。
- タップ領域は 40px 以上。

## 8. アクセシビリティ

- 操作できるものは `<button>`・`<Link>`（`<a>`）・`<input>` + `<label>` で作る。div に onClick を付けない。
- 読み込み中は、面の形を保ったまま中身を薄い灰色の帯で表示する（レイアウトが跳ねないように）。
- 文字のコントラストは 4.5:1 以上。`--text-faint` は文章に使わない。
- 状態は色だけで伝えず、必ず文字を添える（問題表の補足、草の title、申告のラベル）。
- `<html lang="ja">`。ページごとに固有の `<title>`（「問題表 ・ 復習ドリル」など）。

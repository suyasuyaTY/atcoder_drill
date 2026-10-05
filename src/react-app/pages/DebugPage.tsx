import { useId, useState, type FormEvent } from "react";
import { useDebugClock, useDebugClockReset, useDebugSample, useDebugUnlock, useMe } from "../api";
import { Button } from "../components/Button";
import { Notice } from "../components/Notice";
import { usePageTitle } from "../hooks/usePageTitle";
import { NotFoundPage } from "./NotFoundPage";
import styles from "./DebugPage.module.css";

/** デバッグツール（SPEC §13）。/api/me が debugTools: true のときだけ出す */
export function DebugPage() {
  const me = useMe();
  if (!me.data?.debugTools) return <NotFoundPage />;
  return <DebugTools offsetDays={me.data.clockOffsetDays} />;
}

const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n)}日`;

function DebugTools({ offsetDays }: { offsetDays: number }) {
  usePageTitle("デバッグ");
  const clock = useDebugClock();
  const reset = useDebugClockReset();
  const unlock = useDebugUnlock();
  const sample = useDebugSample();
  const daysId = useId();
  const targetId = useId();
  const [days, setDays] = useState("30");
  const [target, setTarget] = useState("");

  const daysNum = Number(days);
  const daysValid = Number.isInteger(daysNum) && daysNum !== 0 && Math.abs(daysNum) <= 3650;

  const shift = (e: FormEvent) => {
    e.preventDefault();
    clock.mutate(daysNum);
  };
  const doUnlock = (e: FormEvent) => {
    e.preventDefault();
    unlock.mutate(target.trim());
  };

  return (
    <main className="page page-narrow">
      <h1>デバッグツール</h1>
      <p className="muted">DEBUG_TOOLS=1 のときだけ動きます。本番には出ません。</p>

      <section className={`panel ${styles.section}`} aria-labelledby="debug-clock">
        <h2 id="debug-clock">時計</h2>
        <p>
          いまのずれ: <strong>{signed(offsetDays)}</strong>
        </p>
        <form className={styles.row} onSubmit={shift}>
          <label htmlFor={daysId}>ずらす日数（マイナスで戻す）</label>
          <input
            id={daysId}
            type="number"
            step={1}
            className={styles.input}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={!daysValid || clock.isPending}>
            ずらす
          </Button>
          <Button variant="secondary" onClick={() => reset.mutate()} disabled={offsetDays === 0 || reset.isPending}>
            0 に戻す
          </Button>
        </form>
        {(clock.error ?? reset.error) && <p className={styles.error}>{(clock.error ?? reset.error)!.message}</p>}
      </section>

      <section className={`panel ${styles.section}`} aria-labelledby="debug-unlock">
        <h2 id="debug-unlock">カードを今すぐ解禁する</h2>
        <form className={styles.row} onSubmit={doUnlock}>
          <label htmlFor={targetId}>カード ID か問題 ID</label>
          <input
            id={targetId}
            className={styles.input}
            placeholder="abc306_d"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={target.trim() === "" || unlock.isPending}>
            解禁する
          </Button>
        </form>
        {unlock.isError && <p className={styles.error}>{unlock.error.message}</p>}
        {unlock.isSuccess && <Notice>解禁しました。</Notice>}
      </section>

      <section className={`panel ${styles.section}`} aria-labelledby="debug-sample">
        <h2 id="debug-sample">サンプルデータ</h2>
        <p className="muted">
          ローカルの D1 に、解禁中・待機中・卒業のカードを12枚入れます（同期した問題データから選びます）。
        </p>
        <div>
          <Button variant="outline" onClick={() => sample.mutate()} disabled={sample.isPending}>
            サンプルデータを入れる
          </Button>
        </div>
        {sample.isError && <p className={styles.error}>{sample.error.message}</p>}
        {sample.isSuccess && <Notice>{sample.data.inserted}枚のカードを入れました。</Notice>}
      </section>
    </main>
  );
}

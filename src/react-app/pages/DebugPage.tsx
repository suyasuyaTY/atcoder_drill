import { useId, useState, type FormEvent } from "react";
import { useDebugClock, useDebugClockReset, useDebugSample, useDebugUnlock, useMe } from "../api";
import { Button } from "../components/Button";
import { Notice } from "../components/Notice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Page, Panel } from "../components/Layout";
import { usePageTitle } from "../hooks/usePageTitle";
import { NotFoundPage } from "./NotFoundPage";

/** デバッグツール（SPEC §13）。/api/me が debugTools: true のときだけ出す */
export function DebugPage() {
  const me = useMe();
  if (!me.data?.debugTools) return <NotFoundPage />;
  return <DebugTools offsetDays={me.data.clockOffsetDays} />;
}

const ROW = "flex flex-wrap items-center gap-3";

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
    <Page width="narrow" className="flex flex-col gap-4">
      <div>
        <h1 className="mb-1">デバッグツール</h1>
        <p className="text-ink-muted">DEBUG_TOOLS=1 のときだけ動きます。本番には出ません。</p>
      </div>

      <Panel aria-labelledby="debug-clock" className="flex flex-col gap-3">
        <h2 id="debug-clock">時計</h2>
        <p>
          いまのずれ: <strong>{signed(offsetDays)}</strong>
        </p>
        <form className={ROW} onSubmit={shift}>
          <Label htmlFor={daysId}>ずらす日数（マイナスで戻す）</Label>
          <Input
            id={daysId}
            type="number"
            step={1}
            className="w-40"
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
        {(clock.error ?? reset.error) && <p className="text-danger">{(clock.error ?? reset.error)!.message}</p>}
      </Panel>

      <Panel aria-labelledby="debug-unlock" className="flex flex-col gap-3">
        <h2 id="debug-unlock">カードを今すぐ解禁する</h2>
        <form className={ROW} onSubmit={doUnlock}>
          <Label htmlFor={targetId}>カード ID か問題 ID</Label>
          <Input
            id={targetId}
            className="w-40"
            placeholder="abc306_d"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={target.trim() === "" || unlock.isPending}>
            解禁する
          </Button>
        </form>
        {unlock.isError && <p className="text-danger">{unlock.error.message}</p>}
        {unlock.isSuccess && <Notice>解禁しました。</Notice>}
      </Panel>

      <Panel aria-labelledby="debug-sample" className="flex flex-col gap-3">
        <h2 id="debug-sample">サンプルデータ</h2>
        <p className="text-ink-muted">
          ローカルの D1 に、解禁中・待機中・卒業のカードを12枚入れます（同期した問題データから選びます）。
        </p>
        <div>
          <Button variant="outline" onClick={() => sample.mutate()} disabled={sample.isPending}>
            サンプルデータを入れる
          </Button>
        </div>
        {sample.isError && <p className="text-danger">{sample.error.message}</p>}
        {sample.isSuccess && <Notice>{sample.data.inserted}枚のカードを入れました。</Notice>}
      </Panel>
    </Page>
  );
}

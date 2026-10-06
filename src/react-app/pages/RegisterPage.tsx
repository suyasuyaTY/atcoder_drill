import { useId, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { DIFFICULTY_SOURCE } from "../../lib/difficulty";
import { formatJstDate } from "../../lib/format";
import { problemUrl } from "../../lib/problem-id";
import type { Grade } from "../../lib/scheduler";
import type { RegisterItem } from "../../shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCloseRegSession, useLookup, useRegister, useRegSession, useUndoRegistration } from "../api";
import { Button } from "../components/Button";
import { DifficultyDot } from "../components/DifficultyDot";
import { ExternalLink } from "../components/ExternalLink";
import { FreshTag } from "../components/FreshTag";
import { GradeBar } from "../components/GradeBar";
import { GradeChip } from "../components/GradeChip";
import { Page, Panel, PanelSkeleton } from "../components/Layout";
import { Notice } from "../components/Notice";
import { GRADE_CRITERION } from "../grades";
import { usePageTitle } from "../hooks/usePageTitle";

/** 一覧の1行。720px 以下では申告を問題の下に回す */
const ROW =
  "flex min-h-[60px] items-center justify-between gap-4 border-line-row py-2 not-first:border-t max-md:flex-col max-md:items-stretch";
const PROBLEM = "flex min-w-0 items-center gap-3";
const INDEX = "min-w-6 shrink-0 text-[13px] font-bold text-ink-muted";

/** 登録（SPEC §7、DESIGN §6 登録）。入力した URL は ?q= に持たせる */
export function RegisterPage() {
  usePageTitle("登録");
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";

  return (
    <Page width="wide" className="flex flex-col gap-4">
      <h1 className="mb-1">登録</h1>
      <UrlForm key={`url:${q}`} initial={q} onSubmit={(next) => setParams(next ? { q: next } : {})} />
      {q !== "" && <LookupResult key={`lookup:${q}`} q={q} />}
      <CurrentRegistrations />
    </Page>
  );
}

function UrlForm({ initial, onSubmit }: { initial: string; onSubmit: (q: string) => void }) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(value.trim());
  };
  return (
    <Panel>
      <form className="flex flex-col gap-2" onSubmit={submit}>
        <Label htmlFor={id} className="font-bold leading-normal">
          AtCoder の URL（コンテストのページ、または問題のページ）
        </Label>
        <div className="flex gap-2">
          <Input
            id={id}
            type="text"
            inputMode="url"
            placeholder="https://atcoder.jp/contests/abc306"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={value.trim() === ""}>
            読み込む
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function LookupResult({ q }: { q: string }) {
  const lookup = useLookup(q);
  const reg = useRegister();
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [note, setNote] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const noteId = useId();
  const titleId = useId();

  if (lookup.isPending) return <PanelSkeleton className="h-40" />;
  if (lookup.isError) {
    return (
      <p className="text-danger" role="alert">
        {lookup.error.message}
      </p>
    );
  }

  const { contest, problems, manual, target } = lookup.data;
  const single = target === "problem";
  const setGrade = (problemId: string, g: Grade | null) =>
    setGrades((prev) => {
      const next = { ...prev };
      if (g === null) delete next[problemId];
      else next[problemId] = g;
      return next;
    });

  if (problems.length === 0 && manual === null) {
    return (
      <Notice>
        問題データが未同期です。
        {target === "contest"
          ? "同期のあとで、このコンテストの問題を登録できます。"
          : "問題のページの URL を貼ると、タイトルを手入力して登録できます。"}
      </Notice>
    );
  }

  const selected = Object.entries(grades);
  const extras = () => (note.trim() !== "" ? { note: note.trim() } : {});
  const items: RegisterItem[] = manual
    ? selected.map(([problemId, grade]) => ({
        problemId,
        grade,
        title: manualTitle.trim(),
        contestId: manual.contestId,
        ...extras(),
      }))
    : selected.map(([problemId, grade]) => ({ problemId, grade, ...(single ? extras() : {}) }));
  const canSubmit = items.length > 0 && (manual === null || manualTitle.trim() !== "") && !reg.isPending;

  const submit = () =>
    reg.mutate(
      { items },
      {
        onSuccess: () => {
          setGrades({});
          setNote("");
        },
      },
    );

  return (
    <Panel aria-label="読み込んだ問題" className="flex flex-col gap-4">
      {manual ? (
        <>
          <Notice>問題データが未同期です。タイトルを入力すると登録できます。</Notice>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={titleId} className="font-bold">
              タイトル（{manual.contestId} {manual.problemIndex}）
            </Label>
            <Input id={titleId} value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
          </div>
          <div className={ROW}>
            <div className={PROBLEM}>
              <span className={INDEX}>{manual.problemIndex}</span>
              <ExternalLink href={problemUrl(manual.contestId, manual.problemId)}>{manual.problemId}</ExternalLink>
            </div>
            <GradeBar
              label={`${manual.problemId} の申告`}
              value={grades[manual.problemId] ?? null}
              onChange={(g) => setGrade(manual.problemId, g)}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2>{contest ? contest.title : "問題"}</h2>
            <span className="text-xs text-ink-muted">difficulty は {DIFFICULTY_SOURCE}</span>
          </div>
          <ul>
            {problems.map((p) => (
              <li key={p.id} className={ROW}>
                <div className={PROBLEM}>
                  <span className={INDEX}>{p.problemIndex}</span>
                  <ExternalLink href={problemUrl(p.contestId, p.id)} className="truncate">
                    {p.title}
                  </ExternalLink>
                  <DifficultyDot value={p.difficulty} />
                  {p.freshTarget && <FreshTag />}
                </div>
                {p.cardId !== null ? (
                  <span className="shrink-0 text-[13px] text-ink-muted">
                    登録済み ・ <Link to={`/cards/${p.cardId}`}>カードを開く</Link>
                  </span>
                ) : p.inSession ? (
                  <span className="shrink-0 text-[13px] text-ink-muted">
                    出題中 ・ <Link to="/session">セッションで申告する</Link>
                  </span>
                ) : (
                  <GradeBar
                    label={`${p.problemIndex} ${p.title} の申告`}
                    value={grades[p.id] ?? null}
                    onChange={(g) => setGrade(p.id, g)}
                  />
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {(single || manual) && problems.every((p) => p.cardId === null && !p.inSession) && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={noteId} className="font-bold">
            メモ（任意）
          </Label>
          <Input id={noteId} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}

      <p className="text-[13px] text-ink-muted">{GRADE_CRITERION}</p>

      {reg.isError && (
        <p className="text-danger" role="alert">
          {reg.error.message}
        </p>
      )}
      {reg.isSuccess && (
        <Notice>
          {reg.data.registered.length > 0 && `${reg.data.registered.length}問を登録しました。`}
          {reg.data.skipped.length > 0 && `登録済みのため飛ばしました: ${reg.data.skipped.join(", ")}`}
          {reg.data.inSession.length > 0 && `出題中のため飛ばしました: ${reg.data.inSession.join(", ")}`}
        </Notice>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-line pt-4 max-md:flex-col max-md:items-stretch">
        <p className="text-[13px] text-ink-muted">
          何も選ばなかった問題は登録しません。登録した問題は、プロフィールの設定に関係なく復習に出ます。
        </p>
        <Button onClick={submit} disabled={!canSubmit}>
          {items.length}問を登録
        </Button>
      </div>
    </Panel>
  );
}

/** 今回の登録（SPEC §7.4）。開いている登録セッションで登録した問題 */
function CurrentRegistrations() {
  const session = useRegSession();
  const undo = useUndoRegistration();
  const close = useCloseRegSession();

  if (!session.data?.session) return null;
  const { items } = session.data;

  return (
    <Panel aria-labelledby="current-registrations" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="current-registrations">今回の登録（{items.length}問）</h2>
        <Button variant="secondary" onClick={() => close.mutate()} disabled={close.isPending}>
          登録を終える
        </Button>
      </div>
      {undo.isError && (
        <p className="text-danger" role="alert">
          {undo.error.message}
        </p>
      )}
      {items.length === 0 ? (
        <p className="text-ink-muted">まだ登録していません。</p>
      ) : (
        <ul>
          {items.map((i) => (
            <li key={i.cardId} className={ROW}>
              <div className={PROBLEM}>
                <span className={INDEX}>
                  {i.contestId} {i.problemIndex}
                </span>
                <Link to={`/cards/${i.cardId}`} className="truncate">
                  {i.title}
                </Link>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-[13px]">
                <GradeChip grade={i.grade} />
                <span className="text-ink-muted">{i.nextReviewAt ? `解禁 ${formatJstDate(i.nextReviewAt)}` : "卒業"}</span>
                {i.canUndo && (
                  <Button variant="link" size="sm" className="px-1" onClick={() => undo.mutate(i.cardId)} disabled={undo.isPending}>
                    取り消す
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

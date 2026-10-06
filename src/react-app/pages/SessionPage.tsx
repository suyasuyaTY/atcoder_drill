import { useId, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { KIND_LABELS } from "../../lib/contest";
import { formatJstDate, formatJstDateTime } from "../../lib/format";
import { problemUrl } from "../../lib/problem-id";
import type { Grade } from "../../lib/scheduler";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCurrentSession, useGrade } from "../api";
import { Button } from "../components/Button";
import { DifficultyDot } from "../components/DifficultyDot";
import { ExternalLink } from "../components/ExternalLink";
import { GradeBar } from "../components/GradeBar";
import { GradeChip } from "../components/GradeChip";
import { Page, PanelSkeleton } from "../components/Layout";
import { Notice } from "../components/Notice";
import { SourceTag } from "../components/SourceTag";
import { StreakDots } from "../components/StreakDots";
import { GRADE_CRITERION, gradeHints } from "../grades";
import { usePageTitle } from "../hooks/usePageTitle";
import type { CompletedSummary } from "./HomePage";

type Session = NonNullable<NonNullable<ReturnType<typeof useCurrentSession>["data"]>["session"]>;
type Item = Session["items"][number];

/** 1問ぶんの枠（DESIGN §6 セッション） */
const ITEM = "rounded-xl border border-line bg-surface";
/** 未着手・申告済みの1行 */
const ROW = "flex flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6";

/** セッション（SPEC §8.4、DESIGN §6 セッション）。開いているセッションがなければホームへ */
export function SessionPage() {
  usePageTitle("セッション");
  const current = useCurrentSession();

  if (current.isError) {
    return (
      <Page width="narrow">
        <Notice role="alert">{current.error.message}</Notice>
      </Page>
    );
  }
  if (current.isPending) {
    return (
      <Page width="narrow">
        <PanelSkeleton className="h-80" />
      </Page>
    );
  }
  if (!current.data.session) return <Navigate to="/" replace />;
  return <SessionView key={current.data.session.id} session={current.data.session} />;
}

function SessionView({ session }: { session: Session }) {
  const navigate = useNavigate();
  const grade = useGrade();
  /** 挑戦中の問題（1問だけ） */
  const [active, setActive] = useState<number | null>(null);

  const graded = session.items.filter((i) => i.result !== null).length;
  const fresh = session.items.filter((i) => i.source === "fresh").length;

  const submit = (item: Item, g: Grade, note: string) =>
    grade.mutate(
      { position: item.position, body: { grade: g, ...(note.trim() !== "" ? { note: note.trim() } : {}) } },
      {
        onSuccess: (res) => {
          setActive(null);
          if (!res.sessionClosed) return;
          // 3問とも申告したらホームへ戻し、内訳を1回だけ出す（表示用の集計）
          const grades = [
            ...session.items.filter((i) => i.position !== item.position).map((i) => i.result?.grade),
            res.result.grade,
          ];
          const completed: CompletedSummary = {
            easy: grades.filter((x) => x === "easy").length,
            hard: grades.filter((x) => x === "hard").length,
            failed: grades.filter((x) => x === "failed").length,
          };
          navigate("/", { state: { completed } });
        },
      },
    );

  return (
    <Page width="narrow">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1">{KIND_LABELS[session.kind]} のセッション</h1>
          <p className="text-ink-muted">
            {formatJstDateTime(session.drawnAt)} に抽選 ・ 初見 {fresh} ・ 復習 {session.items.length - fresh}
          </p>
        </div>
        <p className="text-[26px] font-black whitespace-nowrap" aria-label="進み具合">
          {graded} / {session.items.length}
        </p>
      </header>

      {grade.isError && (
        <div className="mb-4">
          <Notice role="alert">{grade.error.message}</Notice>
        </div>
      )}

      <ol className="flex flex-col gap-4">
        {session.items.map((item) => (
          <li key={item.position}>
            {item.result ? (
              <DoneItem item={item} />
            ) : active === item.position ? (
              <ActiveItem item={item} pending={grade.isPending} onSubmit={(g, note) => submit(item, g, note)} />
            ) : (
              <TodoItem item={item} onStart={() => setActive(item.position)} />
            )}
          </li>
        ))}
      </ol>
    </Page>
  );
}

function ProblemLabel({ item }: { item: Item }) {
  return (
    <span className="shrink-0 text-[13px] font-bold text-ink-muted">
      {item.contestId.toUpperCase()} {item.problemIndex}
    </span>
  );
}

/** 未着手: 「開始」と「問題を開く」。問題を開くと挑戦中にする */
function TodoItem({ item, onStart }: { item: Item; onStart: () => void }) {
  return (
    <div className={cn(ITEM, ROW)}>
      <div className="flex min-w-0 items-center gap-2.5">
        <SourceTag source={item.source} />
        <ProblemLabel item={item} />
        <span className="min-w-0 truncate font-bold">{item.title}</span>
        <DifficultyDot value={item.difficulty} />
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <Button variant="outline" onClick={onStart}>
          開始
        </Button>
        <ExternalLink href={problemUrl(item.contestId, item.problemId)} onClick={onStart}>
          問題を開く
        </ExternalLink>
      </div>
    </div>
  );
}

/** 挑戦中: GradeBar とメモ。押すと即座に申告を送る（送信中は無効） */
function ActiveItem({
  item,
  pending,
  onSubmit,
}: {
  item: Item;
  pending: boolean;
  onSubmit: (g: Grade, note: string) => void;
}) {
  const [note, setNote] = useState("");
  const noteId = useId();
  return (
    <div className={cn(ITEM, "flex flex-col gap-4 border-line-strong px-4 py-5 md:p-7")}>
      <div className="flex items-center gap-2.5">
        <SourceTag source={item.source} />
        <ProblemLabel item={item} />
        <DifficultyDot value={item.difficulty} />
      </div>
      <h2 className="text-[26px] font-black">{item.title}</h2>
      <div className="flex flex-wrap items-center gap-5">
        {item.source === "fresh" ? (
          <span className="text-ink-muted">まだ登録していない問題</span>
        ) : (
          <StreakDots streak={item.streak} />
        )}
        <ExternalLink href={problemUrl(item.contestId, item.problemId)}>問題を開く</ExternalLink>
      </div>
      <GradeBar
        size="large"
        label={`${item.problemIndex} ${item.title} の申告`}
        value={null}
        hints={gradeHints(item.source === "fresh" ? 0 : item.streak)}
        disabled={pending}
        onChange={(g) => g && onSubmit(g, note)}
      />
      <p className="text-[13px] text-ink-muted">{GRADE_CRITERION}</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={noteId} className="font-bold">
          メモ（任意）
        </Label>
        <Input id={noteId} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </div>
  );
}

/** 申告済み: 1行に畳む */
function DoneItem({ item }: { item: Item }) {
  const r = item.result!;
  return (
    <div className={cn(ITEM, ROW, "bg-surface-done")}>
      <div className="flex min-w-0 items-center gap-2.5">
        <SourceTag source={item.source} />
        <ProblemLabel item={item} />
        <span className="min-w-0 truncate font-bold">{item.title}</span>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <GradeChip grade={r.grade} />
        <span className="text-ink-muted">{r.nextReviewAt ? `次は ${formatJstDate(r.nextReviewAt)}` : "卒業"}</span>
      </div>
    </div>
  );
}

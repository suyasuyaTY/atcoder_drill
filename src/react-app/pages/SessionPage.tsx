import { useId, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { KIND_LABELS } from "../../lib/contest";
import { formatJstDate, formatJstDateTime } from "../../lib/format";
import { problemUrl } from "../../lib/problem-id";
import type { Grade } from "../../lib/scheduler";
import { useCurrentSession, useGrade } from "../api";
import { Button } from "../components/Button";
import { DifficultyDot } from "../components/DifficultyDot";
import { ExternalLink } from "../components/ExternalLink";
import { GradeBar } from "../components/GradeBar";
import { GradeChip } from "../components/GradeChip";
import { Notice } from "../components/Notice";
import { SourceTag } from "../components/SourceTag";
import { StreakDots } from "../components/StreakDots";
import { GRADE_CRITERION, gradeHints } from "../grades";
import { usePageTitle } from "../hooks/usePageTitle";
import type { CompletedSummary } from "./HomePage";
import styles from "./SessionPage.module.css";

type Session = NonNullable<NonNullable<ReturnType<typeof useCurrentSession>["data"]>["session"]>;
type Item = Session["items"][number];

/** セッション（SPEC §8.4、DESIGN §6 セッション）。開いているセッションがなければホームへ */
export function SessionPage() {
  usePageTitle("セッション");
  const current = useCurrentSession();

  if (current.isError) {
    return (
      <main className="page page-narrow">
        <Notice role="alert">{current.error.message}</Notice>
      </main>
    );
  }
  if (current.isPending) {
    return (
      <main className="page page-narrow">
        <div className={`panel ${styles.skeleton}`} aria-busy="true" />
      </main>
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
          const grades = [...session.items.filter((i) => i.position !== item.position).map((i) => i.result?.grade), res.result.grade];
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
    <main className="page page-narrow">
      <header className={styles.head}>
        <div>
          <h1>{KIND_LABELS[session.kind]} のセッション</h1>
          <p className="muted">
            {formatJstDateTime(session.drawnAt)} に抽選 ・ 初見 {fresh} ・ 復習 {session.items.length - fresh}
          </p>
        </div>
        <p className={styles.progress} aria-label="進み具合">
          {graded} / {session.items.length}
        </p>
      </header>

      {grade.isError && (
        <div className={styles.notice}>
          <Notice role="alert">{grade.error.message}</Notice>
        </div>
      )}

      <ol className={styles.items}>
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
    </main>
  );
}

function ProblemLabel({ item }: { item: Item }) {
  return (
    <span className={styles.label}>
      {item.contestId.toUpperCase()} {item.problemIndex}
    </span>
  );
}

/** 未着手: 「開始」と「問題を開く」。問題を開くと挑戦中にする */
function TodoItem({ item, onStart }: { item: Item; onStart: () => void }) {
  return (
    <div className={`${styles.item} ${styles.todo}`}>
      <div className={styles.titleRow}>
        <SourceTag source={item.source} />
        <ProblemLabel item={item} />
        <span className={styles.title}>{item.title}</span>
        <DifficultyDot value={item.difficulty} />
      </div>
      <div className={styles.actions}>
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
    <div className={`${styles.item} ${styles.active}`}>
      <div className={styles.titleRow}>
        <SourceTag source={item.source} />
        <ProblemLabel item={item} />
        <DifficultyDot value={item.difficulty} />
      </div>
      <h2 className={styles.bigTitle}>{item.title}</h2>
      <div className={styles.meta}>
        {item.source === "fresh" ? <span className="muted">まだ登録していない問題</span> : <StreakDots streak={item.streak} />}
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
      <p className={styles.criterion}>{GRADE_CRITERION}</p>
      <div className={styles.field}>
        <label htmlFor={noteId} className={styles.fieldLabel}>
          メモ（任意）
        </label>
        <input id={noteId} className={styles.input} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </div>
  );
}

/** 申告済み: 1行に畳む */
function DoneItem({ item }: { item: Item }) {
  const r = item.result!;
  return (
    <div className={`${styles.item} ${styles.done}`}>
      <div className={styles.titleRow}>
        <SourceTag source={item.source} />
        <ProblemLabel item={item} />
        <span className={styles.title}>{item.title}</span>
      </div>
      <div className={styles.actions}>
        <GradeChip grade={r.grade} />
        <span className="muted">{r.nextReviewAt ? `次は ${formatJstDate(r.nextReviewAt)}` : "卒業"}</span>
      </div>
    </div>
  );
}

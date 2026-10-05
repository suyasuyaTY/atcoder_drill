import { useId, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { DIFFICULTY_SOURCE } from "../../lib/difficulty";
import { formatJstDate } from "../../lib/format";
import { problemUrl } from "../../lib/problem-id";
import type { Grade } from "../../lib/scheduler";
import type { RegisterItem } from "../../shared/schema";
import { useCloseRegSession, useLookup, useRegister, useRegSession, useUndoRegistration } from "../api";
import { Button } from "../components/Button";
import { DifficultyDot } from "../components/DifficultyDot";
import { ExternalLink } from "../components/ExternalLink";
import { FreshTag } from "../components/FreshTag";
import { GradeBar } from "../components/GradeBar";
import { GradeChip } from "../components/GradeChip";
import { Notice } from "../components/Notice";
import { GRADE_CRITERION } from "../grades";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./RegisterPage.module.css";

/** 登録（SPEC §7、DESIGN §6 登録）。入力した URL は ?q= に持たせる */
export function RegisterPage() {
  usePageTitle("登録");
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";

  return (
    <main className="page page-wide">
      <h1>登録</h1>
      <UrlForm key={`url:${q}`} initial={q} onSubmit={(next) => setParams(next ? { q: next } : {})} />
      {q !== "" && <LookupResult key={`lookup:${q}`} q={q} />}
      <CurrentRegistrations />
    </main>
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
    <form className={`panel ${styles.urlForm}`} onSubmit={submit}>
      <label htmlFor={id} className={styles.label}>
        AtCoder の URL（コンテストのページ、または問題のページ）
      </label>
      <div className={styles.urlRow}>
        <input
          id={id}
          type="text"
          inputMode="url"
          className={styles.input}
          placeholder="https://atcoder.jp/contests/abc306"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" variant="outline" disabled={value.trim() === ""}>
          読み込む
        </Button>
      </div>
    </form>
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

  if (lookup.isPending) return <div className={`panel ${styles.skeleton}`} aria-busy="true" />;
  if (lookup.isError) {
    return (
      <p className={styles.error} role="alert">
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
    ? selected.map(([problemId, grade]) => ({ problemId, grade, title: manualTitle.trim(), contestId: manual.contestId, ...extras() }))
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
    <section className={`panel ${styles.result}`} aria-label="読み込んだ問題">
      {manual ? (
        <>
          <Notice>問題データが未同期です。タイトルを入力すると登録できます。</Notice>
          <div className={styles.field}>
            <label htmlFor={titleId} className={styles.label}>
              タイトル（{manual.contestId} {manual.problemIndex}）
            </label>
            <input id={titleId} className={styles.input} value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
          </div>
          <div className={styles.row}>
            <div className={styles.problem}>
              <span className={styles.index}>{manual.problemIndex}</span>
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
          <div className={styles.resultHead}>
            <h2>{contest ? contest.title : "問題"}</h2>
            <span className={styles.source}>difficulty は {DIFFICULTY_SOURCE}</span>
          </div>
          <ul className={styles.list}>
            {problems.map((p) => (
              <li key={p.id} className={styles.row}>
                <div className={styles.problem}>
                  <span className={styles.index}>{p.problemIndex}</span>
                  <ExternalLink href={problemUrl(p.contestId, p.id)} className={styles.title}>
                    {p.title}
                  </ExternalLink>
                  <DifficultyDot value={p.difficulty} />
                  {p.freshTarget && <FreshTag />}
                </div>
                {p.cardId !== null ? (
                  <span className={styles.registered}>
                    登録済み ・ <Link to={`/cards/${p.cardId}`}>カードを開く</Link>
                  </span>
                ) : p.inSession ? (
                  <span className={styles.registered}>
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
        <div className={styles.extras}>
          <div className={`${styles.field} ${styles.grow}`}>
            <label htmlFor={noteId} className={styles.label}>
              メモ（任意）
            </label>
            <input id={noteId} className={styles.input} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      )}

      <p className={styles.criterion}>{GRADE_CRITERION}</p>

      {reg.isError && (
        <p className={styles.error} role="alert">
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

      <div className={styles.footer}>
        <p className="muted">
          何も選ばなかった問題は登録しません。登録した問題は、プロフィールの設定に関係なく復習に出ます。
        </p>
        <Button onClick={submit} disabled={!canSubmit}>
          {items.length}問を登録
        </Button>
      </div>
    </section>
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
    <section className={`panel ${styles.current}`} aria-labelledby="current-registrations">
      <div className={styles.resultHead}>
        <h2 id="current-registrations">今回の登録（{items.length}問）</h2>
        <Button variant="secondary" onClick={() => close.mutate()} disabled={close.isPending}>
          登録を終える
        </Button>
      </div>
      {undo.isError && (
        <p className={styles.error} role="alert">
          {undo.error.message}
        </p>
      )}
      {items.length === 0 ? (
        <p className="muted">まだ登録していません。</p>
      ) : (
        <ul className={styles.list}>
          {items.map((i) => (
            <li key={i.cardId} className={styles.row}>
              <div className={styles.problem}>
                <span className={styles.index}>
                  {i.contestId} {i.problemIndex}
                </span>
                <Link to={`/cards/${i.cardId}`} className={styles.title}>
                  {i.title}
                </Link>
              </div>
              <div className={styles.currentMeta}>
                <GradeChip grade={i.grade} />
                <span className="muted">{i.nextReviewAt ? `解禁 ${formatJstDate(i.nextReviewAt)}` : "卒業"}</span>
                {i.canUndo && (
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => undo.mutate(i.cardId)}
                    disabled={undo.isPending}
                  >
                    取り消す
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

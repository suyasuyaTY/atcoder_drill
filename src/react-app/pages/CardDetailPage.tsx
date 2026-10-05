import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { formatJstDate, formatJstDateTime } from "../../lib/format";
import { problemUrl } from "../../lib/problem-id";
import { ApiError, useCard, useDeleteCard } from "../api";
import { Button } from "../components/Button";
import { DifficultyDot } from "../components/DifficultyDot";
import { ExternalLink } from "../components/ExternalLink";
import { GradeChip } from "../components/GradeChip";
import { Notice } from "../components/Notice";
import { StreakDots } from "../components/StreakDots";
import { usePageTitle } from "../hooks/usePageTitle";
import { NotFoundPage } from "./NotFoundPage";
import styles from "./CardDetailPage.module.css";

type Data = NonNullable<ReturnType<typeof useCard>["data"]>;

const ATTEMPT_KIND = { register: "登録", fresh: "初見", review: "復習" } as const;

/** カード詳細と申告履歴（SPEC §8.1 /cards/:id） */
export function CardDetailPage() {
  const { id } = useParams();
  const cardId = Number(id);
  if (!Number.isInteger(cardId) || cardId <= 0) return <NotFoundPage />;
  return <CardDetail key={cardId} cardId={cardId} />;
}

function CardDetail({ cardId }: { cardId: number }) {
  const card = useCard(cardId);
  usePageTitle(card.data ? `${card.data.card.contestId.toUpperCase()} ${card.data.card.problemIndex}` : "カード");

  if (card.isError) {
    if (card.error instanceof ApiError && card.error.status === 404) return <NotFoundPage />;
    return (
      <main className="page page-narrow">
        <Notice role="alert">{card.error.message}</Notice>
      </main>
    );
  }
  if (card.isPending) {
    return (
      <main className="page page-narrow">
        <div className={`panel ${styles.skeleton}`} aria-busy="true" />
      </main>
    );
  }
  return <CardView data={card.data} />;
}

function statusText(s: Data["card"]["status"], nextReviewAt: string | null): string {
  switch (s.state) {
    case "waiting":
      return `解禁は ${formatJstDate(nextReviewAt!)}（あと ${s.days}日）`;
    case "unlocked":
      return `解禁中（解禁から ${s.days}日）。復習に出ます`;
    case "graduated":
      return "卒業しました。もう出題しません";
    default:
      return "";
  }
}

function CardView({ data }: { data: Data }) {
  const { card, attempts } = data;
  const navigate = useNavigate();
  const del = useDeleteCard();
  const [confirming, setConfirming] = useState(false);

  const remove = () =>
    del.mutate(card.id, { onSuccess: () => navigate(`/table?kind=${card.kind}&page=1`, { replace: true }) });

  return (
    <main className="page page-narrow">
      <p className={styles.crumb}>
        <Link to={`/table?kind=${card.kind}&page=1`}>問題表</Link>
      </p>
      <section className={`panel ${styles.head}`} aria-labelledby="card-title">
        <div className={styles.label}>
          {card.contestId.toUpperCase()} {card.problemIndex}
          <DifficultyDot value={card.difficulty} />
        </div>
        <h1 id="card-title" className={styles.title}>
          {card.title}
        </h1>
        <div className={styles.meta}>
          <ExternalLink href={problemUrl(card.contestId, card.problemId)}>問題を開く</ExternalLink>
          <span className="muted">
            {formatJstDate(card.createdAt)} に{card.origin === "fresh" ? "初見で" : "登録画面で"}登録
          </span>
        </div>
        <div className={styles.status}>
          <StreakDots streak={card.streak} size="large" />
          <span>{statusText(card.status, card.nextReviewAt)}</span>
        </div>
        <p className={styles.source}>difficulty は AtCoder Problems 推定値です。</p>
      </section>

      <section className={`panel ${styles.history}`} aria-labelledby="history-heading">
        <h2 id="history-heading">申告の履歴</h2>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">日時</th>
                <th scope="col">種類</th>
                <th scope="col">申告</th>
                <th scope="col">streak</th>
                <th scope="col">次の解禁</th>
                <th scope="col">メモ</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>{formatJstDateTime(a.attemptedAt)}</td>
                  <td>{ATTEMPT_KIND[a.kind]}</td>
                  <td>
                    <GradeChip grade={a.grade} />
                  </td>
                  <td>
                    {a.streakBefore} → {a.streakAfter}
                  </td>
                  <td>{a.nextReviewAt ? formatJstDate(a.nextReviewAt) : "卒業"}</td>
                  <td className={styles.note}>{a.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`panel ${styles.danger}`} aria-labelledby="delete-heading">
        <h2 id="delete-heading">カードを削除</h2>
        <p className="muted">
          カードと申告の履歴をすべて消します。元に戻せません。削除した問題は、初見の対象なら、また初見として出ることがあります。
        </p>
        {card.inSession ? (
          <p className={styles.blocked}>出題中のため削除できません。セッションで申告を済ませてください。</p>
        ) : confirming ? (
          <div className={styles.confirm}>
            <span>本当に削除しますか？</span>
            <Button variant="danger" onClick={remove} disabled={del.isPending}>
              削除する
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={del.isPending}>
              やめる
            </Button>
          </div>
        ) : (
          <div>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              カードを削除
            </Button>
          </div>
        )}
        {del.isError && (
          <p className={styles.error} role="alert">
            {del.error.message}
          </p>
        )}
      </section>
    </main>
  );
}

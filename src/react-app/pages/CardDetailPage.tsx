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
import { Page, Panel, PanelSkeleton } from "../components/Layout";
import { usePageTitle } from "../hooks/usePageTitle";
import { NotFoundPage } from "./NotFoundPage";

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
      <Page width="narrow">
        <Notice role="alert">{card.error.message}</Notice>
      </Page>
    );
  }
  if (card.isPending) {
    return (
      <Page width="narrow">
        <PanelSkeleton className="h-80" />
      </Page>
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
    <Page width="narrow" className="flex flex-col gap-4">
      <p className="text-[13px]">
        <Link to={`/table?kind=${card.kind}&page=1`}>問題表</Link>
      </p>
      <Panel aria-labelledby="card-title" className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-[13px] font-bold text-ink-muted">
          {card.contestId.toUpperCase()} {card.problemIndex}
          <DifficultyDot value={card.difficulty} />
        </div>
        <h1 id="card-title" className="mb-0 text-[26px] font-black">
          {card.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          <ExternalLink href={problemUrl(card.contestId, card.problemId)}>問題を開く</ExternalLink>
          <span className="text-ink-muted">
            {formatJstDate(card.createdAt)} に{card.origin === "fresh" ? "初見で" : "登録画面で"}登録
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <StreakDots streak={card.streak} size="large" />
          <span>{statusText(card.status, card.nextReviewAt)}</span>
        </div>
        <p className="text-xs text-ink-muted">difficulty は AtCoder Problems 推定値です。</p>
      </Panel>

      <Panel aria-labelledby="history-heading" className="flex flex-col gap-3">
        <h2 id="history-heading">申告の履歴</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px] [&_td]:border-b [&_td]:border-line-row [&_td]:p-2.5 [&_td]:whitespace-nowrap [&_th]:border-b [&_th]:border-line [&_th]:bg-surface-sub [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold [&_th]:whitespace-nowrap [&_th]:text-ink-muted">
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
                  <td className="min-w-40 whitespace-normal!">{a.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel aria-labelledby="delete-heading" className="flex flex-col gap-3">
        <h2 id="delete-heading">カードを削除</h2>
        <p className="text-ink-muted">
          カードと申告の履歴をすべて消します。元に戻せません。削除した問題は、初見の対象なら、また初見として出ることがあります。
        </p>
        {card.inSession ? (
          <p className="text-danger">出題中のため削除できません。セッションで申告を済ませてください。</p>
        ) : confirming ? (
          <div className="flex flex-wrap items-center gap-3">
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
          <p className="text-danger" role="alert">
            {del.error.message}
          </p>
        )}
      </Panel>
    </Page>
  );
}

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { isSessionKind, type SessionKind } from "../../lib/contest";
import { formatJstDate } from "../../lib/format";
import { ApiError, useCreateSession, useHome } from "../api";
import { Button, LinkButton } from "../components/Button";
import { DailyBars } from "../components/DailyBars";
import { Grass } from "../components/Grass";
import { KindPicker } from "../components/KindPicker";
import { Page, Panel, PanelSkeleton } from "../components/Layout";
import { Notice } from "../components/Notice";
import { Stat } from "../components/Stat";
import { usePageTitle } from "../hooks/usePageTitle";

/** セッション画面から戻るときに渡す、申告の内訳（SPEC §8.4） */
export type CompletedSummary = { easy: number; hard: number; failed: number };

function readCompleted(state: unknown): CompletedSummary | null {
  if (typeof state !== "object" || state === null || !("completed" in state)) return null;
  return state.completed as CompletedSummary;
}

/** ホーム（SPEC §6.1、§8.3、§10）。選んだ種類は ?kind= に持たせる */
export function HomePage() {
  usePageTitle(null);
  const [params] = useSearchParams();
  const rawKind = params.get("kind");
  const kind: SessionKind = isSessionKind(rawKind) ? rawKind : "ALL";
  const home = useHome(kind);
  const create = useCreateSession();
  const navigate = useNavigate();
  const location = useLocation();

  // 「セッション完了」は1回だけ出す。履歴の state は消しておく（リロードや戻るで出し直さない）
  const [completed] = useState(() => readCompleted(location.state));
  useEffect(() => {
    if (location.state) navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location, navigate]);

  const start = () =>
    create.mutate(kind, {
      onSuccess: () => navigate("/session"),
      onError: (e) => {
        if (e instanceof ApiError && e.code === "session_open") navigate("/session");
      },
    });

  return (
    <Page width="wide">
      <h1>ホーム</h1>
      {completed && (
        <div className="mb-4">
          <Notice>
            セッション完了: 余裕 {completed.easy} ・ 苦戦 {completed.hard} ・ 解けず {completed.failed}
          </Notice>
        </div>
      )}

      {home.isError ? (
        <Notice role="alert">{home.error.message}</Notice>
      ) : home.isPending ? (
        <PanelSkeleton className="h-[220px]" />
      ) : (
        <div className="flex flex-col gap-4">
          <Panel aria-label="出題" className="flex flex-wrap justify-between gap-8">
            {home.data.openSession ? (
              <div className="flex w-full flex-wrap items-center justify-between gap-4">
                <p>開いているセッションがあります。全問を申告すると閉じます。</p>
                <LinkButton to="/session" size="lg">
                  セッションを再開（{home.data.openSession.graded} / {home.data.openSession.total}）
                </LinkButton>
              </div>
            ) : (
              <>
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <h2>種類</h2>
                  <KindPicker value={kind} counts={home.data.kinds} />
                  <p className="text-[13px] text-ink-muted">
                    初見を多めに出し（3問中{home.data.freshQuota}問）、残りを解禁中の復習から出します。初見の割合は
                    <Link to="/profile">プロフィール</Link>で変えられます。
                  </p>
                </div>
                <div className="flex min-w-[220px] flex-col items-start gap-2">
                  <h2>今回の{home.data.plan.review + home.data.plan.fresh}問</h2>
                  <p>
                    <span className="text-[28px] font-black">{home.data.plan.fresh}</span> 初見 ＋{" "}
                    <span className="text-[28px] font-black">{home.data.plan.review}</span> 復習
                  </p>
                  {home.data.plan.review === 0 && home.data.nextUnlockAt && (
                    <p className="text-ink-muted">次の解禁は {formatJstDate(home.data.nextUnlockAt)}</p>
                  )}
                  <Button
                    size="lg"
                    onClick={start}
                    disabled={home.data.plan.review + home.data.plan.fresh === 0 || create.isPending}
                  >
                    {home.data.plan.review + home.data.plan.fresh}問を引く
                  </Button>
                  {create.isError && !(create.error instanceof ApiError && create.error.code === "session_open") && (
                    <p className="text-danger" role="alert">
                      {create.error.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </Panel>

          <Panel aria-label="統計" className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="現役" value={home.data.stats.active} />
            <Stat label="復習の解禁中" value={home.data.stats.unlocked} />
            <Stat label="卒業" value={home.data.stats.graduated} />
            <Stat label="初見の候補" value={home.data.stats.freshCandidates} />
          </Panel>

          <DailyBars days={home.data.daily} />
          <Grass weeks={home.data.grass.weeks} total={home.data.grass.total} />
        </div>
      )}
    </Page>
  );
}

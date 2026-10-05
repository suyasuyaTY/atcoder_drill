import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { isSessionKind, type SessionKind } from "../../lib/contest";
import { formatJstDate } from "../../lib/format";
import { ApiError, useCreateSession, useHome } from "../api";
import { Button, LinkButton } from "../components/Button";
import { DailyBars } from "../components/DailyBars";
import { Grass } from "../components/Grass";
import { KindPicker } from "../components/KindPicker";
import { Notice } from "../components/Notice";
import { Stat } from "../components/Stat";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./HomePage.module.css";

/** セッション画面から戻るときに渡す、申告の内訳（SPEC §8.4） */
export type CompletedSummary = { easy: number; hard: number; failed: number };

function readCompleted(state: unknown): CompletedSummary | null {
  if (typeof state !== "object" || state === null || !("completed" in state)) return null;
  return state.completed as CompletedSummary;
}

/** ホーム（SPEC §6.1、§8.3）。選んだ種類は ?kind= に持たせる。30日グラフと草はステップ8で足す */
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
    <main className="page page-wide">
      <h1>ホーム</h1>
      {completed && (
        <div className={styles.notice}>
          <Notice>
            セッション完了: 余裕 {completed.easy} ・ 苦戦 {completed.hard} ・ 解けず {completed.failed}
          </Notice>
        </div>
      )}

      {home.isError ? (
        <Notice role="alert">{home.error.message}</Notice>
      ) : home.isPending ? (
        <div className={`panel ${styles.skeleton}`} aria-busy="true" />
      ) : (
        <>
          <section className={`panel ${styles.draw}`} aria-label="出題">
            {home.data.openSession ? (
              <div className={styles.resume}>
                <p>開いているセッションがあります。全問を申告すると閉じます。</p>
                <LinkButton to="/session" className={styles.big}>
                  セッションを再開（{home.data.openSession.graded} / {home.data.openSession.total}）
                </LinkButton>
              </div>
            ) : (
              <>
                <div className={styles.pick}>
                  <h2>種類</h2>
                  <KindPicker value={kind} counts={home.data.kinds} />
                  <p className={styles.help}>
                    初見を多めに出し（3問中{home.data.freshQuota}問）、残りを解禁中の復習から出します。初見の割合は
                    <Link to="/profile">プロフィール</Link>で変えられます。
                  </p>
                </div>
                <div className={styles.plan}>
                  <h2>今回の{home.data.plan.review + home.data.plan.fresh}問</h2>
                  <p className={styles.breakdown}>
                    <span className={styles.num}>{home.data.plan.fresh}</span> 初見 ＋{" "}
                    <span className={styles.num}>{home.data.plan.review}</span> 復習
                  </p>
                  {home.data.plan.review === 0 && home.data.nextUnlockAt && (
                    <p className="muted">次の解禁は {formatJstDate(home.data.nextUnlockAt)}</p>
                  )}
                  <Button
                    className={styles.big}
                    onClick={start}
                    disabled={home.data.plan.review + home.data.plan.fresh === 0 || create.isPending}
                  >
                    {home.data.plan.review + home.data.plan.fresh === 3
                      ? "3問を引く"
                      : `${home.data.plan.review + home.data.plan.fresh}問を引く`}
                  </Button>
                  {create.isError && !(create.error instanceof ApiError && create.error.code === "session_open") && (
                    <p className={styles.error} role="alert">
                      {create.error.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>

          <section className={`panel ${styles.stats}`} aria-label="統計">
            <Stat label="現役" value={home.data.stats.active} />
            <Stat label="復習の解禁中" value={home.data.stats.unlocked} />
            <Stat label="卒業" value={home.data.stats.graduated} />
            <Stat label="初見の候補" value={home.data.stats.freshCandidates} />
          </section>

          <div className={styles.charts}>
            <DailyBars days={home.data.daily} />
            <Grass weeks={home.data.grass.weeks} total={home.data.grass.total} />
          </div>
        </>
      )}
    </main>
  );
}

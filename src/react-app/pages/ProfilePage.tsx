import { useId, useState, type FormEvent } from "react";
import { FRESH_INDEX_OPTIONS, KIND_LABELS, indexOptionLabel } from "../../lib/contest";
import type { ProfileBody } from "../../shared/schema";
import { useProfile, useSaveProfile } from "../api";
import { Button } from "../components/Button";
import { ContestPicker, type PickedContest } from "../components/ContestPicker";
import { Notice } from "../components/Notice";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./ProfilePage.module.css";

type Saved = NonNullable<ReturnType<typeof useProfile>["data"]>;
type IndexKind = keyof typeof FRESH_INDEX_OPTIONS;
const INDEX_KINDS: IndexKind[] = ["ABC", "ARC", "AGC"];

/** 入力欄の下書き。保存するまではサーバーに送らない（DESIGN §6 プロフィール） */
interface Draft {
  atcoderUserId: string;
  targets: Record<IndexKind, string[]>;
  others: PickedContest[];
  minDifficulty: string;
  maxDifficulty: string;
  freshQuota: number;
}

const toDraft = (p: Saved): Draft => ({
  atcoderUserId: p.atcoderUserId ?? "",
  targets: { ABC: p.targets.ABC, ARC: p.targets.ARC, AGC: p.targets.AGC },
  others: p.otherContests,
  minDifficulty: p.minDifficulty === null ? "" : String(p.minDifficulty),
  maxDifficulty: p.maxDifficulty === null ? "" : String(p.maxDifficulty),
  freshQuota: p.freshQuota,
});

const toBody = (d: Draft): ProfileBody => ({
  atcoderUserId: d.atcoderUserId.trim() === "" ? null : d.atcoderUserId.trim(),
  targets: {
    // 選択肢の順にそろえる（未保存の判定と表示のため）
    ABC: FRESH_INDEX_OPTIONS.ABC.filter((i) => d.targets.ABC.includes(i)),
    ARC: FRESH_INDEX_OPTIONS.ARC.filter((i) => d.targets.ARC.includes(i)),
    AGC: FRESH_INDEX_OPTIONS.AGC.filter((i) => d.targets.AGC.includes(i)),
    OTHER: d.others.map((c) => c.id),
  },
  minDifficulty: d.minDifficulty === "" ? null : Number(d.minDifficulty),
  maxDifficulty: d.maxDifficulty === "" ? null : Number(d.maxDifficulty),
  freshQuota: d.freshQuota,
});

/** プロフィール（SPEC §5、DESIGN §6 プロフィール） */
export function ProfilePage() {
  usePageTitle("プロフィール");
  const profile = useProfile();

  return (
    <main className="page page-profile">
      <h1>プロフィール</h1>
      {profile.isError ? (
        <Notice role="alert">{profile.error.message}</Notice>
      ) : profile.isPending ? (
        <div className={`panel ${styles.skeleton}`} aria-busy="true" />
      ) : (
        <ProfileForm saved={profile.data} />
      )}
    </main>
  );
}

function ProfileForm({ saved }: { saved: Saved }) {
  const save = useSaveProfile();
  const [draft, setDraft] = useState<Draft>(() => toDraft(saved));
  const ids = { atcoder: useId(), min: useId(), max: useId(), quota: useId() };

  const body = toBody(draft);
  const dirty = JSON.stringify(body) !== JSON.stringify(toBody(toDraft(saved)));
  const num = (s: string) => s === "" || (/^\d{1,4}$/.test(s) && Number(s) <= 5000);
  const rangeError =
    !num(draft.minDifficulty) || !num(draft.maxDifficulty)
      ? "difficulty は 0〜5000 の整数で入れてください"
      : body.minDifficulty !== null && body.maxDifficulty !== null && body.minDifficulty >= body.maxDifficulty
        ? "下限は上限より小さくしてください"
        : null;
  const idError =
    body.atcoderUserId !== null && !/^[A-Za-z0-9_]{3,16}$/.test(body.atcoderUserId)
      ? "AtCoder ID は英数字と _ の 3〜16 文字です"
      : null;

  const toggleIndex = (kind: IndexKind, index: string) =>
    setDraft((d) => {
      const cur = d.targets[kind];
      const next = cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index];
      return { ...d, targets: { ...d.targets, [kind]: next } };
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(body);
  };

  return (
    <form onSubmit={submit} className={styles.form}>
      <section className={`panel ${styles.section}`} aria-labelledby="fresh-heading">
        <div className={styles.head}>
          <div>
            <h2 id="fresh-heading">初見で出す問題</h2>
            <p className="muted">
              登録していなくても出題する問題を選びます。登録した問題は、この設定に関係なく復習に出ます。
            </p>
          </div>
          <p className={styles.count}>
            <span className={styles.countNum}>{saved.freshCandidates}</span>問が候補
          </p>
        </div>

        {INDEX_KINDS.map((kind) => {
          const picked = FRESH_INDEX_OPTIONS[kind].filter((i) => draft.targets[kind].includes(i));
          return (
            <fieldset key={kind} className={styles.kindRow}>
              <legend className={styles.kindName}>{KIND_LABELS[kind]}</legend>
              <div className={styles.toggles}>
                {FRESH_INDEX_OPTIONS[kind].map((index) => {
                  const id = `${ids.quota}-${kind}-${index}`;
                  return (
                    <span key={index} className={styles.toggle}>
                      <input
                        id={id}
                        type="checkbox"
                        checked={draft.targets[kind].includes(index)}
                        onChange={() => toggleIndex(kind, index)}
                      />
                      <label htmlFor={id}>{indexOptionLabel(kind, index)}</label>
                    </span>
                  );
                })}
              </div>
              <span className={styles.summary}>
                {picked.length === 0 ? "出さない" : picked.map((i) => indexOptionLabel(kind, i)).join("・")}
              </span>
            </fieldset>
          );
        })}

        <div className={styles.block}>
          <h3 className={styles.kindName}>その他のコンテスト</h3>
          <p className="muted">選んだコンテストは、全問が初見の候補になります。</p>
          <ContestPicker value={draft.others} onChange={(others) => setDraft((d) => ({ ...d, others }))} />
        </div>

        <div className={styles.block}>
          <h3 className={styles.kindName}>difficulty の範囲</h3>
          <div className={styles.range}>
            <label htmlFor={ids.min}>下限（以上）</label>
            <input
              id={ids.min}
              type="number"
              min={0}
              max={5000}
              step={1}
              className={styles.input}
              placeholder="なし"
              value={draft.minDifficulty}
              onChange={(e) => setDraft((d) => ({ ...d, minDifficulty: e.target.value }))}
            />
            <label htmlFor={ids.max}>上限（未満）</label>
            <input
              id={ids.max}
              type="number"
              min={0}
              max={5000}
              step={1}
              className={styles.input}
              placeholder="なし"
              value={draft.maxDifficulty}
              onChange={(e) => setDraft((d) => ({ ...d, maxDifficulty: e.target.value }))}
            />
          </div>
          <p className="muted">
            AtCoder Problems 推定値を補正した値です。difficulty がない問題は範囲に関係なく候補に入ります。
          </p>
          {rangeError && <p className={styles.error}>{rangeError}</p>}
        </div>

        <fieldset className={styles.block}>
          <legend className={styles.kindName}>3問のうち初見の枠</legend>
          <div className={styles.segment}>
            {[0, 1, 2, 3].map((n) => {
              const id = `${ids.quota}-q${n}`;
              return (
                <span key={n}>
                  <input
                    id={id}
                    type="radio"
                    name="freshQuota"
                    checked={draft.freshQuota === n}
                    onChange={() => setDraft((d) => ({ ...d, freshQuota: n }))}
                  />
                  <label htmlFor={id}>{n}</label>
                </span>
              );
            })}
          </div>
          <p className="muted">
            初見をこの数まで優先して出し、残りを解禁中の復習で埋めます。復習が溜まってきたら減らしてください。
          </p>
        </fieldset>
      </section>

      <section className={`panel ${styles.section}`} aria-labelledby="account-heading">
        <h2 id="account-heading">表示名</h2>
        <div className={styles.field}>
          <label htmlFor={ids.atcoder}>AtCoder ID（ヘッダーに出すだけ。提出データは使いません）</label>
          <input
            id={ids.atcoder}
            className={styles.input}
            autoComplete="username"
            value={draft.atcoderUserId}
            onChange={(e) => setDraft((d) => ({ ...d, atcoderUserId: e.target.value }))}
          />
          {idError && <p className={styles.error}>{idError}</p>}
        </div>
      </section>

      <div className={styles.footer}>
        {save.isError && (
          <p className={styles.error} role="alert">
            {save.error.message}
          </p>
        )}
        {dirty && <span className="muted">未保存の変更があります</span>}
        {!dirty && save.isSuccess && <span className="muted">保存しました</span>}
        <Button type="submit" disabled={!dirty || rangeError !== null || idError !== null || save.isPending}>
          保存
        </Button>
      </div>
    </form>
  );
}

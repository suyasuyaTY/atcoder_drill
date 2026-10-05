import { useId, useState } from "react";
import { useContestSearch } from "../api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import styles from "./ContestPicker.module.css";

export interface PickedContest {
  id: string;
  title: string;
  problemCount: number;
}

/**
 * その他のコンテストを選ぶ（DESIGN §3 ContestPicker）。選んだものを黒いピルで並べ、下に検索欄と結果の一覧を置く。
 * 検索は入力が止まって 300ms たったら呼ぶ。
 */
export function ContestPicker({ value, onChange }: { value: PickedContest[]; onChange: (v: PickedContest[]) => void }) {
  const inputId = useId();
  const [text, setText] = useState("");
  const q = useDebouncedValue(text.trim(), 300);
  const search = useContestSearch(q);
  const selected = new Set(value.map((c) => c.id));

  const toggle = (c: PickedContest) =>
    onChange(selected.has(c.id) ? value.filter((v) => v.id !== c.id) : [...value, c]);

  return (
    <div className={styles.picker}>
      {value.length > 0 ? (
        <ul className={styles.pills} aria-label="選んだコンテスト">
          {value.map((c) => (
            <li key={c.id} className={styles.pill} title={c.title}>
              {c.id}
              <button type="button" className={styles.remove} aria-label={`${c.id} を外す`} onClick={() => toggle(c)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">まだ選んでいません。</p>
      )}

      <label htmlFor={inputId} className={styles.label}>
        コンテストを検索（ID か名前）
      </label>
      <input
        id={inputId}
        type="search"
        className={styles.input}
        placeholder="typical90、dp、PAST など"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {q !== "" && (
        <div className={styles.results} aria-busy={search.isFetching}>
          {search.isError ? (
            <p className={styles.error}>{search.error.message}</p>
          ) : search.data && search.data.contests.length === 0 ? (
            <p className="muted">見つかりません。</p>
          ) : (
            <ul className={styles.list}>
              {search.data?.contests.map((c) => {
                const id = `${inputId}-${c.id}`;
                return (
                  <li key={c.id}>
                    <input id={id} type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c)} />
                    <label htmlFor={id} className={styles.result}>
                      <span className={styles.id}>{c.id}</span>
                      <span className={styles.title}>{c.title}</span>
                      <span className="muted">{c.problemCount}問</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

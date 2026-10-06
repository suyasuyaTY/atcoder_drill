import { XIcon } from "lucide-react";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContestSearch } from "../api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

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
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="選んだコンテスト">
          {value.map((c) => (
            <li
              key={c.id}
              title={c.title}
              className="inline-flex items-center gap-1 rounded-full bg-primary py-1 pr-1 pl-3 text-[13px] font-bold text-surface"
            >
              {c.id}
              <button
                type="button"
                aria-label={`${c.id} を外す`}
                onClick={() => toggle(c)}
                className="inline-flex size-6 items-center justify-center rounded-full hover:bg-ink-muted"
              >
                <XIcon className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">まだ選んでいません。</p>
      )}

      <Label htmlFor={inputId} className="mt-2 font-bold">
        コンテストを検索（ID か名前）
      </Label>
      <Input
        id={inputId}
        type="search"
        placeholder="typical90、dp、PAST など"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {q !== "" && (
        <div className="max-h-80 overflow-y-auto rounded-lg border border-line" aria-busy={search.isFetching}>
          {search.isError ? (
            <p className="px-4 py-3 text-danger">{search.error.message}</p>
          ) : search.data && search.data.contests.length === 0 ? (
            <p className="px-4 py-3 text-ink-muted">見つかりません。</p>
          ) : (
            <ul>
              {search.data?.contests.map((c) => {
                const id = `${inputId}-${c.id}`;
                return (
                  <li key={c.id} className="flex items-center gap-2.5 border-line-row px-4 not-first:border-t">
                    <input
                      id={id}
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c)}
                    />
                    <label htmlFor={id} className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <span className="shrink-0 font-bold">{c.id}</span>
                      <span className="min-w-0 flex-1 truncate">{c.title}</span>
                      <span className="text-ink-muted">{c.problemCount}問</span>
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

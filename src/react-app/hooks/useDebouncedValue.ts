import { useEffect, useState } from "react";

/** 値が ms のあいだ変わらなかったら、その値を返す（検索欄の入力待ち） */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

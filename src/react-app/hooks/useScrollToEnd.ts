import { useLayoutEffect, useRef } from "react";

/** 横スクロールする面を、最初は右端（いちばん新しい日）に合わせる。deps が変わったら合わせ直す */
export function useScrollToEnd<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

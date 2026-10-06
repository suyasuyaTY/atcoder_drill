import { Link } from "react-router";
import {
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Pagination as UiPagination,
} from "@/components/ui/pagination";

/** 表示するページ番号。最初・最後・いまのページの前後1つを出し、間は「…」（null）にする */
function pageItems(page: number, total: number): (number | null)[] {
  const pages = [...new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total))].sort(
    (a, b) => a - b,
  );
  const items: (number | null)[] = [];
  for (const [i, p] of pages.entries()) {
    const prev = pages[i - 1];
    if (prev !== undefined && p - prev === 2) items.push(prev + 1);
    else if (prev !== undefined && p - prev > 2) items.push(null);
    items.push(p);
  }
  return items;
}

/**
 * ページ送り（shadcn/ui の Pagination）。「‹ 前へ  1 … 4 [5] 6 … 24  次へ ›」。
 * 画面の移動は React Router の Link で行う。端では前へ・次へを押せない。
 */
export function Pagination({ page, total, href }: { page: number; total: number; href: (page: number) => string }) {
  const edge = (target: number) =>
    target < 1 || target > total
      ? { "aria-disabled": true, className: "pointer-events-none opacity-50", render: <span /> }
      : { render: <Link to={href(target)} /> };

  return (
    <UiPagination aria-label="ページ" className="mt-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious text="前へ" aria-label="前のページ" {...edge(page - 1)} />
        </PaginationItem>
        {pageItems(page, total).map((p, i) =>
          p === null ? (
            <PaginationItem key={`gap-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink isActive={p === page} aria-label={`${p}ページ`} render={<Link to={href(p)} />}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext text="次へ" aria-label="次のページ" {...edge(page + 1)} />
        </PaginationItem>
      </PaginationContent>
    </UiPagination>
  );
}

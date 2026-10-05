import { usePageTitle } from "../hooks/usePageTitle";

/** ホーム（SPEC §8.3）。中身は SPEC §19 のステップ4で作る */
export function HomePage() {
  usePageTitle(null);
  return (
    <main className="page page-wide">
      <h1>ホーム</h1>
      <section className="panel">
        <p className="muted">ここに出題の選択と記録が入ります（準備中）。</p>
      </section>
    </main>
  );
}

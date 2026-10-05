import { Link } from "react-router";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("ページが見つかりません");
  return (
    <main className="page page-narrow">
      <h1>ページが見つかりません</h1>
      <section className="panel">
        <p>
          <Link to="/">ホームに戻る</Link>
        </p>
      </section>
    </main>
  );
}

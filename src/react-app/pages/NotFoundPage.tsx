import { Link } from "react-router";
import { Page, Panel } from "../components/Layout";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("ページが見つかりません");
  return (
    <Page width="narrow">
      <h1>ページが見つかりません</h1>
      <Panel>
        <p>
          <Link to="/">ホームに戻る</Link>
        </p>
      </Panel>
    </Page>
  );
}

import { Navigate, Outlet, useLocation } from "react-router";
import { isUnauthorized, useMe } from "../api";
import { DebugBand } from "./DebugBand";
import { Header } from "./Header";
import { Page } from "./Layout";
import { Notice } from "./Notice";

/** ログインが必要な画面の枠。/api/me が 401 なら /login へ移る（SPEC §17） */
export function AppLayout() {
  const me = useMe();
  const location = useLocation();

  if (me.isError && isUnauthorized(me.error)) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return (
    <>
      {me.data?.debugTools && <DebugBand offsetDays={me.data.clockOffsetDays} />}
      <Header atcoderUserId={me.data?.atcoderUserId ?? null} />
      {me.isError ? (
        <Page width="narrow">
          <Notice>{me.error.message}</Notice>
        </Page>
      ) : me.isPending ? null : (
        <Outlet />
      )}
    </>
  );
}

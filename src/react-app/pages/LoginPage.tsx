import { useId, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { ApiError, isUnauthorized, useLogin, useMe } from "../api";
import { Button } from "../components/Button";
import { Notice } from "../components/Notice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Page, Panel } from "../components/Layout";
import { usePageTitle } from "../hooks/usePageTitle";

/** トークン入力（AUTH_MODE=token で未ログインのとき。SPEC §17） */
export function LoginPage() {
  usePageTitle("ログイン");
  const me = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const inputId = useId();
  const [token, setToken] = useState("");

  const state: unknown = location.state;
  const from =
    typeof state === "object" && state !== null && "from" in state && typeof state.from === "string"
      ? state.from
      : "/";

  // すでに入れる（ログイン済み、または認証なしのローカル開発）
  if (me.isSuccess) return <Navigate to={from} replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ token }, { onSuccess: () => navigate(from, { replace: true }) });
  };

  const otherError = me.isError && !isUnauthorized(me.error) ? me.error : null;

  // AUTH_MODE=access: Cloudflare Access のログインが切れている。読み込み直すと Access のログイン画面に移る
  if (me.isError && me.error instanceof ApiError && me.error.code === "access_required") {
    return (
      <>
        <LoginHeader />
        <Page width="profile">
          <h1>ログイン</h1>
          <Panel className="flex flex-col gap-3">
            <p>Cloudflare Access のログインが切れています。ページを読み込み直すと、ログイン画面に移ります。</p>
            <div>
              <Button onClick={() => window.location.assign(from)}>読み込み直す</Button>
            </div>
          </Panel>
        </Page>
      </>
    );
  }

  return (
    <>
      <LoginHeader />
      <Page width="profile">
        <h1>ログイン</h1>
        <Panel>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <Label htmlFor={inputId} className="font-bold">
            トークン
          </Label>
          <Input
            id={inputId}
            type="password"
            autoComplete="current-password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          {login.isError && (
            <p className="text-danger" role="alert">
              {login.error.message}
            </p>
          )}
          <div>
            <Button type="submit" disabled={login.isPending || token === ""}>
              ログイン
            </Button>
          </div>
          </form>
        </Panel>
        {otherError && (
          <div className="mt-4">
            <Notice role="alert">{otherError.message}</Notice>
          </div>
        )}
      </Page>
    </>
  );
}

/** ログイン画面のヘッダー（ロゴだけ） */
function LoginHeader() {
  return (
    <header className="flex h-[60px] items-center border-b border-line bg-surface px-4 md:px-10">
      <span className="text-[17px] font-black">復習ドリル</span>
    </header>
  );
}

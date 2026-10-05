import { useId, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { isUnauthorized, useLogin, useMe } from "../api";
import { Button } from "../components/Button";
import { Notice } from "../components/Notice";
import { usePageTitle } from "../hooks/usePageTitle";
import styles from "./LoginPage.module.css";

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

  return (
    <>
      <header className={styles.header}>
        <span className={styles.logo}>復習ドリル</span>
      </header>
      <main className="page page-profile">
        <h1>ログイン</h1>
        <form className={`panel ${styles.form}`} onSubmit={onSubmit}>
          <label htmlFor={inputId} className={styles.label}>
            トークン
          </label>
          <input
            id={inputId}
            type="password"
            autoComplete="current-password"
            className={styles.input}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          {login.isError && (
            <p className={styles.error} role="alert">
              {login.error.message}
            </p>
          )}
          <div>
            <Button type="submit" disabled={login.isPending || token === ""}>
              ログイン
            </Button>
          </div>
        </form>
        {otherError && (
          <div className={styles.notice}>
            <Notice role="alert">{otherError.message}</Notice>
          </div>
        )}
      </main>
    </>
  );
}

/**
 * API のクライアント（Hono RPC）と、TanStack Query のフック。
 * レスポンスの型は worker の AppType から来るので、ここで手書きしない。
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hc, type ClientResponse, type parseResponse } from "hono/client";
import type { ContestKind, SessionKind } from "../lib/contest";
import type { ErrorBody, GradeBody, LoginBody, ProfileBody, RegisterBody } from "../shared/schema";
import type { AppType } from "../worker/index";

export const client = hc<AppType>(window.location.origin);

/** API が返したエラー（`{ error: { code, message } }`） */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

/** 2xx なら本文を返し、それ以外は ApiError を投げる */
async function call<T extends ClientResponse<unknown>>(req: T | Promise<T>): ReturnType<typeof parseResponse<T>> {
  let res: T;
  try {
    res = await req;
  } catch {
    throw new ApiError(0, "network", "サーバーに接続できません");
  }
  if (res.ok) return res.json() as ReturnType<typeof parseResponse<T>>;

  const body = (await res.json().catch(() => null)) as Partial<ErrorBody> | null;
  throw new ApiError(
    res.status,
    body?.error?.code ?? "error",
    body?.error?.message ?? `エラーが起きました（HTTP ${res.status}）`,
  );
}

export const queryKeys = {
  me: ["me"] as const,
  lookup: (q: string) => ["register", "lookup", q] as const,
  lookupAll: ["register", "lookup"] as const,
  regSession: ["register", "session"] as const,
  tableAll: ["table"] as const,
  table: (kind: ContestKind, page: number) => ["table", kind, page] as const,
  homeAll: ["home"] as const,
  home: (kind: SessionKind) => ["home", kind] as const,
  session: ["session", "current"] as const,
  profile: ["profile"] as const,
  contests: (q: string) => ["contests", q] as const,
};

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => call(client.api.me.$get()),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginBody) => call(client.api.login.$post({ json: body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useLookup(q: string) {
  return useQuery({
    queryKey: queryKeys.lookup(q),
    queryFn: () => call(client.api.register.lookup.$get({ query: { q } })),
    enabled: q !== "",
  });
}

export function useRegSession() {
  return useQuery({
    queryKey: queryKeys.regSession,
    queryFn: () => call(client.api.register.session.$get()),
  });
}

/** 登録・取り消しのあとに取り直すもの */
function invalidateRegistration(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.lookupAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.regSession }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tableAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.homeAll }),
  ]);
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterBody) => call(client.api.register.$post({ json: body })),
    onSettled: () => invalidateRegistration(queryClient),
  });
}

export function useUndoRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: number) =>
      call(client.api.register.items[":cardId"].$delete({ param: { cardId: String(cardId) } })),
    onSettled: () => invalidateRegistration(queryClient),
  });
}

export function useCloseRegSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => call(client.api.register.session.close.$post()),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.regSession }),
  });
}

export function useTable(kind: ContestKind, page: number) {
  return useQuery({
    queryKey: queryKeys.table(kind, page),
    queryFn: () => call(client.api.table.$get({ query: { kind, page: String(page) } })),
    placeholderData: (prev) => prev,
  });
}

export function useHome(kind: SessionKind) {
  return useQuery({
    queryKey: queryKeys.home(kind),
    queryFn: () => call(client.api.home.$get({ query: { kind } })),
    placeholderData: (prev) => prev,
  });
}

export function useCurrentSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => call(client.api.sessions.current.$get()),
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kind: SessionKind) => call(client.api.sessions.$post({ json: { kind } })),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.homeAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.session }),
      ]),
  });
}

export function useGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ position, body }: { position: number; body: GradeBody }) =>
      call(
        client.api.sessions.current.items[":position"].grade.$post({ param: { position: String(position) }, json: body }),
      ),
    // 取り直しは待たない。待つと、最後の申告でセッションが null になって画面が外れ、
    // mutate に渡した onSuccess（ホームへ戻して内訳を出す）が呼ばれなくなる
    onSettled: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.session }),
        queryClient.invalidateQueries({ queryKey: queryKeys.homeAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tableAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.regSession }),
      ]);
    },
  });
}

/** デバッグツール。時計やカードが変わるので、終わったら全部取り直す */
function useDebugMutation<T, V>(fn: (v: V) => Promise<T>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => queryClient.invalidateQueries() });
}

export const useDebugClock = () =>
  useDebugMutation((addDays: number) => call(client.api.debug.clock.$post({ json: { addDays } })));
export const useDebugClockReset = () => useDebugMutation(() => call(client.api.debug.clock.reset.$post()));
export const useDebugUnlock = () =>
  useDebugMutation((target: string) => call(client.api.debug.unlock.$post({ json: { target } })));
export const useDebugSample = () => useDebugMutation(() => call(client.api.debug.sample.$post()));

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => call(client.api.profile.$get()),
  });
}

/** 保存すると、初見の候補が変わるので、ホーム・問題表・登録画面・ヘッダーの名前も取り直す */
export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileBody) => call(client.api.profile.$put({ json: body })),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.profile, data),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
        queryClient.invalidateQueries({ queryKey: queryKeys.homeAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tableAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lookupAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.me }),
      ]),
  });
}

export function useContestSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.contests(q),
    queryFn: () => call(client.api.contests.$get({ query: { q } })),
    enabled: q !== "",
    placeholderData: (prev) => prev,
  });
}

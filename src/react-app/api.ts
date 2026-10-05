/**
 * API のクライアント（Hono RPC）と、TanStack Query のフック。
 * レスポンスの型は worker の AppType から来るので、ここで手書きしない。
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hc, type ClientResponse, type parseResponse } from "hono/client";
import type { ErrorBody, LoginBody } from "../shared/schema";
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

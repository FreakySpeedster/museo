export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Typed fetch wrapper for our JSON API. Throws ApiError with the server's code + friendly message. */
export async function api<T>(url: string, init: { method?: string; json?: unknown; form?: FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (init.json || init.form ? "POST" : "GET"),
      headers: init.json ? { "content-type": "application/json" } : undefined,
      body: init.form ?? (init.json ? JSON.stringify(init.json) : undefined),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("NETWORK", "Couldn't reach the server. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    throw new ApiError(e?.code ?? "ERROR", e?.message ?? "Something went wrong. Please try again.", res.status);
  }
  return data as T;
}

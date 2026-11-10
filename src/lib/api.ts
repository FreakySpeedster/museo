import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { firstIssue } from "./validation";
import { getCurrentUser, type SessionUser } from "./auth";
import { rateLimit } from "./rate-limit";

type Ctx<P> = { params: Promise<P> };

export interface HandlerArgs<P, U> {
  req: NextRequest;
  user: U;
  params: P;
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients; cookies are SameSite=Lax anyway
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, details: err.details } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: firstIssue(err) } }, { status: 400 });
  }
  console.error("[api] unexpected error", err);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong. Please try again." } }, { status: 500 });
}

/** Wrap a route handler: CSRF origin check, optional auth, uniform JSON errors. */
export function route<P = Record<string, never>>(
  handler: (args: HandlerArgs<P, SessionUser>) => Promise<Response>,
  opts: { auth: true; limit?: { key: string; max: number; windowMs: number } },
): (req: NextRequest, ctx: Ctx<P>) => Promise<Response>;
export function route<P = Record<string, never>>(
  handler: (args: HandlerArgs<P, SessionUser | null>) => Promise<Response>,
  opts?: { auth?: false; limit?: { key: string; max: number; windowMs: number } },
): (req: NextRequest, ctx: Ctx<P>) => Promise<Response>;
export function route<P>(
  handler: (args: HandlerArgs<P, never>) => Promise<Response>,
  opts: { auth?: boolean; limit?: { key: string; max: number; windowMs: number } } = {},
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !sameOrigin(req)) {
        throw new AppError("FORBIDDEN", "Cross-origin request blocked");
      }
      const user = await getCurrentUser();
      if (opts.auth && !user) throw new AppError("UNAUTHORIZED", "Please sign in to continue");
      if (opts.limit) {
        const id = user?.id ?? clientIp(req);
        const rl = await rateLimit(`${opts.limit.key}:${id}`, opts.limit.max, opts.limit.windowMs);
        if (!rl.ok) throw new AppError("RATE_LIMITED", `Too many requests. Try again in ${rl.retryAfter}s.`);
      }
      const params = (ctx?.params ? await ctx.params : {}) as P;
      return await handler({ req, user: user as never, params });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Invalid JSON body");
  }
}

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });

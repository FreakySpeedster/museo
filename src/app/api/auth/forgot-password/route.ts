import { after } from "next/server";
import { route, readJson, ok } from "@/lib/api";
import { appUrl } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { sha256 } from "@/lib/auth";
import { requestPasswordReset } from "@/lib/services/passwords";
import { forgotPasswordSchema } from "@/lib/validation";

const GENERIC = "If an account exists for that email, we've sent a link to reset your password. It expires in 1 hour.";

export const POST = route(
  async ({ req }) => {
    const { email } = forgotPasswordSchema.parse(await readJson(req));
    // Per-email cap is silent: the response never changes, so it can't be used to probe accounts.
    const perEmail = await rateLimit(`pw-reset-email:${sha256(email)}`, 3, 60 * 60_000);
    if (perEmail.ok) {
      // Runs after the response so timing doesn't reveal whether the account exists.
      after(() => requestPasswordReset(email, appUrl()).catch((e) => console.error("[password-reset] failed", e instanceof Error ? e.message : e)));
    }
    return ok({ message: GENERIC });
  },
  { limit: { key: "pw-reset-ip", max: 10, windowMs: 15 * 60_000 } },
);

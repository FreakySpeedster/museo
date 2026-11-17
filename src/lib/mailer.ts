import "server-only";

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const isProduction = () => process.env.VERCEL_ENV === "production" || (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production");

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Send a transactional email through Resend's HTTP API (free tier). Never throws: failures are logged
 * so callers that must stay enumeration-safe can always answer the same way.
 * Without RESEND_API_KEY, development logs the plain-text body (so links can be clicked locally);
 * production logs an error that never includes the body.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (isProduction()) console.error("[mail] RESEND_API_KEY is not set; email not sent:", mail.subject);
    else console.info(`[mail] (dev, not sent) to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return false;
  }
  const from = process.env.EMAIL_FROM || "nook <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[mail] Resend rejected the email:", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[mail] Resend request failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** On-brand password reset email: warm off-white canvas, black pill button, lowercase wordmark. */
export function passwordResetEmail(to: string, name: string, link: string): Mail {
  const text = [
    `Hi ${name},`,
    "",
    "Someone (hopefully you) asked to reset the password for your nook account.",
    "Use this link to choose a new one. It works once and expires in 1 hour:",
    "",
    link,
    "",
    "If you didn't ask for this, you can ignore this email. Your password won't change.",
    "",
    "nook",
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#fafaf8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171513">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf8;padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e7e5e1;border-radius:24px;padding:36px 32px">
<tr><td style="font-size:22px;font-weight:700;letter-spacing:-0.02em">nook</td></tr>
<tr><td style="padding-top:28px;font-size:20px;font-weight:600;letter-spacing:-0.01em">Reset your password</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#5c5852">Hi ${esc(name)}, someone (hopefully you) asked to reset the password for your nook account. This link works once and expires in 1 hour.</td></tr>
<tr><td style="padding-top:28px"><a href="${esc(link)}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:999px">Choose a new password</a></td></tr>
<tr><td style="padding-top:28px;font-size:13px;line-height:1.6;color:#5c5852">Button not working? Paste this into your browser:<br><a href="${esc(link)}" style="color:#171513;word-break:break-all">${esc(link)}</a></td></tr>
<tr><td style="padding-top:24px;border-top:1px solid #efede9;margin-top:24px;font-size:13px;line-height:1.6;color:#5c5852">If you didn't ask for this, ignore this email. Your password won't change.</td></tr>
</table></td></tr></table></body></html>`;
  return { to, subject: "Reset your nook password", html, text };
}

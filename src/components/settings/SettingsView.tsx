"use client";

import { AtSign, Gem, KeyRound, LogOut, Mail, Monitor, Moon, Palette, Pencil, Sun, UserCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FollowPolicy, ViewerDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { useToast } from "@/components/ui/Toast";
import { OptionSheet } from "@/components/ui/OptionSheet";
import { applyTheme, useThemeMode, type ThemeMode } from "@/components/ThemeToggle";
import { count } from "@/lib/plural";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { SettingsGroup, SettingsRow } from "./SettingsSection";

const THEMES: Record<ThemeMode, string> = { light: "Light", dark: "Dark", system: "Automatic" };
const POLICIES: Record<FollowPolicy, string> = { request: "Approval", open: "Anyone" };

export function SettingsView({ viewer, pendingRequests }: { viewer: ViewerDTO; pendingRequests: number }) {
  const [policy, setPolicy] = useState<FollowPolicy>(viewer.followPolicy);
  const [pending, setPending] = useState(pendingRequests);
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<null | "theme" | "privacy" | "password">(null);
  const toast = useToast();
  const router = useRouter();
  const theme = useThemeMode();

  async function changePolicy(next: FollowPolicy) {
    if (next === policy || saving) return;
    const prev = policy;
    setPolicy(next);
    setSaving(true);
    try {
      const { approved } = await api<{ approved: number }>("/api/me/settings", { method: "PATCH", json: { followPolicy: next } });
      if (next === "open") setPending(0);
      toast.success(
        next === "open"
          ? approved > 0
            ? `Anyone can follow you now. ${count(approved, "pending request")} ${approved === 1 ? "was" : "were"} approved.`
            : "Anyone can follow you now"
          : "New followers now need your approval",
      );
      router.refresh();
    } catch (e) {
      setPolicy(prev);
      toast.error(e instanceof ApiError ? e.message : "Couldn't save that setting");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST", json: {} });
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Couldn't log out. Try again.");
    }
  }

  return (
    <div className="flex flex-col gap-7" data-testid="settings">
      <SettingsGroup title="Appearance">
        <SettingsRow icon={<Palette className="size-[18px]" aria-hidden />} label="Theme" value={THEMES[theme]} onClick={() => setSheet("theme")} testId="setting-theme" />
      </SettingsGroup>

      <SettingsGroup
        title="Privacy"
        footer={policy === "request" ? `New followers need your approval. Requests show up in Notifications.${pending > 0 ? ` Switching to "Anyone" approves your ${count(pending, "pending request")}.` : ""}` : "Anyone can follow you right away."}
      >
        <SettingsRow icon={<UserCheck className="size-[18px]" aria-hidden />} label="Who can follow you" value={POLICIES[policy]} onClick={() => setSheet("privacy")} testId="setting-privacy" />
      </SettingsGroup>

      <SettingsGroup title="Security" footer="Changing your password signs you out on every other device.">
        <SettingsRow icon={<KeyRound className="size-[18px]" aria-hidden />} label="Change password" onClick={() => setSheet("password")} />
      </SettingsGroup>

      <SettingsGroup title="Plan & billing">
        <SettingsRow icon={<Gem className="size-[18px]" aria-hidden />} label={viewer.subscribed ? "Museo Plus" : "Free plan"} value={viewer.subscribed ? "Manage" : "Upgrade"} href="/pricing" />
      </SettingsGroup>

      <SettingsGroup title="Account">
        <SettingsRow icon={<Pencil className="size-[18px]" aria-hidden />} label="Edit profile" href={`/u/${viewer.username}?edit=1`} />
        <SettingsRow icon={<AtSign className="size-[18px]" aria-hidden />} label="Username" value={`@${viewer.username}`} />
        <SettingsRow icon={<Mail className="size-[18px]" aria-hidden />} label="Email" value={viewer.email} />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow icon={<LogOut className="size-[18px]" aria-hidden />} label="Log out" onClick={logout} danger testId="setting-logout" />
      </SettingsGroup>

      <OptionSheet<ThemeMode>
        open={sheet === "theme"}
        onClose={() => setSheet(null)}
        title="Theme"
        value={theme}
        onChange={applyTheme}
        options={[
          { value: "light", label: "Light", icon: <Sun className="size-[18px]" aria-hidden /> },
          { value: "dark", label: "Dark", icon: <Moon className="size-[18px]" aria-hidden /> },
          { value: "system", label: "Automatic", description: "Match your device", icon: <Monitor className="size-[18px]" aria-hidden /> },
        ]}
      />
      <OptionSheet<FollowPolicy>
        open={sheet === "privacy"}
        onClose={() => setSheet(null)}
        title="Who can follow you"
        value={policy}
        onChange={(v) => void changePolicy(v)}
        options={[
          { value: "request", label: "Approve follow requests", description: "You decide who follows you", icon: <UserCheck className="size-[18px]" aria-hidden /> },
          { value: "open", label: "Anyone can follow", description: "No approval needed", icon: <Users className="size-[18px]" aria-hidden /> },
        ]}
      />
      <ChangePasswordDialog open={sheet === "password"} onClose={() => setSheet(null)} />
    </div>
  );
}

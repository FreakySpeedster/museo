"use client";

import { KeyRound, LockKeyhole, Monitor, Moon, Palette, Shield, Sun, UserCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FollowPolicy, ViewerDTO } from "@/lib/dto";
import { ApiError, api } from "@/lib/client";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { applyTheme, useThemeMode, type ThemeMode } from "@/components/ThemeToggle";
import { count } from "@/lib/plural";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { SettingRow, SettingsSection } from "./SettingsSection";

export function SettingsView({ viewer, pendingRequests }: { viewer: ViewerDTO; pendingRequests: number }) {
  const [policy, setPolicy] = useState<FollowPolicy>(viewer.followPolicy);
  const [pending, setPending] = useState(pendingRequests);
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
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

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Privacy" description="Control who can follow you." icon={<Shield className="size-4" aria-hidden />}>
        <SettingRow
          label="Who can follow you"
          htmlFor="set-follow"
          description={
            policy === "request"
              ? `New followers need your approval. Requests show up in Notifications.${pending > 0 ? ` Switching to "Anyone can follow" approves your ${count(pending, "pending request")}.` : ""}`
              : "Anyone can follow you right away."
          }
        >
          <Select
            id="set-follow"
            label="Who can follow you"
            value={policy}
            onChange={(v) => void changePolicy(v as FollowPolicy)}
            options={[
              { value: "request", label: "Approve follow requests", icon: <UserCheck className="size-4 shrink-0 text-muted" aria-hidden /> },
              { value: "open", label: "Anyone can follow", icon: <Users className="size-4 shrink-0 text-muted" aria-hidden /> },
            ]}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Security" description="Keep your account safe." icon={<LockKeyhole className="size-4" aria-hidden />}>
        <SettingRow label="Password" description={`Signed in as ${viewer.email}. Changing it signs you out on every other device.`}>
          <Button variant="secondary" className="w-full" onClick={() => setPwOpen(true)}>
            <KeyRound className="size-4" aria-hidden />
            Change password
          </Button>
        </SettingRow>
      </SettingsSection>
      <SettingsSection title="Appearance" description="How nook looks on this device." icon={<Palette className="size-4" aria-hidden />}>
        <SettingRow label="Theme" description={theme === "system" ? "Matches your device's light or dark setting." : `Always ${theme}.`}>
          <Tabs<ThemeMode>
            label="Theme"
            spread
            value={theme}
            onChange={applyTheme}
            options={[
              { value: "light", label: <><Sun className="size-4" aria-hidden /> Light</> },
              { value: "dark", label: <><Moon className="size-4" aria-hidden /> Dark</> },
              { value: "system", label: <><Monitor className="size-4" aria-hidden /> Auto</> },
            ]}
          />
        </SettingRow>
      </SettingsSection>
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

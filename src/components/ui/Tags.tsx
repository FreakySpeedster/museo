"use client";

import { useState, type KeyboardEvent } from "react";
import clsx from "clsx";
import { Hash, X } from "lucide-react";

export const MAX_TAGS = 8;
export const normalizeTag = (t: string) => t.trim().replace(/^#/, "").toLowerCase().replace(/\s+/g, "-").slice(0, 24);

/** Read-only tag chips. */
export function TagList({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <ul className={clsx("flex flex-wrap gap-1.5", className)} aria-label="Tags">
      {tags.map((t) => (
        <li key={t} className="inline-flex h-6 items-center gap-0.5 rounded-full border border-border bg-surface-hover px-2.5 text-caption text-muted">
          <Hash className="size-3" aria-hidden />
          {t}
        </li>
      ))}
    </ul>
  );
}

/** Chip input: Enter, comma or Tab adds a tag; Backspace on empty removes the last. */
export function TagInput({ id, value, onChange }: { id?: string; value: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const full = value.length >= MAX_TAGS;

  function commit(raw = draft) {
    const parts = raw.split(",").map(normalizeTag).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])].slice(0, MAX_TAGS));
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === "," || (e.key === "Tab" && draft.trim())) && draft.trim()) {
      e.preventDefault();
      commit();
    } else if (e.key === "Enter") {
      e.preventDefault();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 focus-within:border-foreground/40">
      {value.map((t) => (
        <span key={t} className="inline-flex h-7 items-center gap-1 rounded-full bg-surface-hover pl-2.5 pr-1 text-caption">
          <Hash className="size-3 text-muted" aria-hidden />
          {t}
          <button type="button" aria-label={`Remove ${t}`} className="rounded-full p-0.5 text-muted hover:text-foreground" onClick={() => onChange(value.filter((x) => x !== t))}>
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        disabled={full}
        onChange={(e) => (e.target.value.includes(",") ? commit(e.target.value) : setDraft(e.target.value))}
        onKeyDown={onKey}
        onBlur={() => draft.trim() && commit()}
        placeholder={full ? "Tag limit reached" : value.length ? "Add another" : "e.g. vintage, gift-idea"}
        className="h-7 min-w-28 flex-1 bg-transparent text-meta outline-none placeholder:text-muted"
        maxLength={30}
      />
    </div>
  );
}

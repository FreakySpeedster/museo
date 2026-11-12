"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SearchOverlay } from "./SearchOverlay";

const Ctx = createContext<{ open: () => void; close: () => void; opened: boolean } | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpened((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const value = useMemo(() => ({ open: () => setOpened(true), close: () => setOpened(false), opened }), [opened]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <SearchOverlay open={opened} onClose={() => setOpened(false)} />
    </Ctx.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}

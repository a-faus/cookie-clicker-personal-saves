"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Account = { name: string; id: string } | null;
type Props = { account: Account; signInUrl: string; signOutUrl: string };
type Backup = { save: string; updatedAt: number };
type GameWindow = Window & { Game?: { ready?: number; WriteSave?: (type: number) => string } };

function readBackup(key: string): Backup | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Backup;
    if (typeof parsed.save === "string" && typeof parsed.updatedAt === "number") return parsed;
  } catch { /* The original game can still load its own local save. */ }
  return null;
}

function saveTime(value: string): number {
  try {
    const encoded = unescape(value);
    if (!encoded.endsWith("!END!")) return 0;
    const runDetails = atob(encoded.slice(0, -5)).split("|")[2];
    return Number(runDetails?.split(";")[2]) || 0;
  } catch { return 0; }
}

export default function Mirror({ account, signInUrl, signOutUrl }: Props) {
  const slot = account ? "u-" + account.id.replace(/[^a-zA-Z0-9_-]/g, "") : "guest";
  const gameKey = "CookieClickerGame-" + slot;
  const backupKey = "cookie-clicker-account-backup-" + slot;
  const frame = useRef<HTMLIFrameElement>(null);
  const lastSent = useRef("");
  const writing = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [panel, setPanel] = useState(false);
  const [status, setStatus] = useState("Loading saved game…");

  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      let local = readBackup(backupKey);
      let native: string | null = null;
      try { native = localStorage.getItem(gameKey); } catch { /* Browser storage may be unavailable. */ }
      // The game's own autosave may be newer than our last account backup.
      if (native && (!local || saveTime(native) > saveTime(local.save))) {
        local = { save: native, updatedAt: saveTime(native) };
      }
      let selected = local;
      let fromRemote = false;
      if (account) {
        try {
          const response = await fetch("/api/save", { cache: "no-store" });
          if (response.ok) {
            const data = await response.json() as { save?: string | null; updatedAt?: number };
            if (data.save && (!selected || (data.updatedAt || 0) > selected.updatedAt)) {
              selected = { save: data.save, updatedAt: data.updatedAt || 0 };
              fromRemote = true;
            }
          }
        } catch { /* Continue from the local backup. */ }
      }
      if (cancelled) return;
      if (selected?.save) {
        try {
          localStorage.setItem(gameKey, selected.save);
          localStorage.setItem(backupKey, JSON.stringify(selected));
        } catch { /* The game can still run without browser storage. */ }
        lastSent.current = fromRemote ? selected.save : "";
      }
      setLoaded(true);
      setStatus(account ? "Account save ready" : "Saved on this browser");
    }
    prepare();
    return () => { cancelled = true; };
  }, [account, backupKey, gameKey]);

  const saveNow = useCallback(async () => {
    const game = (frame.current?.contentWindow as GameWindow | null)?.Game;
    if (!game?.ready || typeof game.WriteSave !== "function") return;
    let value: string;
    try { value = game.WriteSave(1); } catch { return; }
    if (!value || value.length < 20) return;
    const updatedAt = Date.now();
    try {
      localStorage.setItem(gameKey, value);
      localStorage.setItem(backupKey, JSON.stringify({ save: value, updatedAt }));
    } catch { /* Continue to cloud sync if local storage is unavailable. */ }
    if (!account) { setStatus("Saved on this browser"); return; }
    if (value === lastSent.current || writing.current) return;
    writing.current = true;
    setStatus("Syncing…");
    try {
      const response = await fetch("/api/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ version: 1, save: value }), keepalive: true });
      if (!response.ok) throw new Error("Save failed");
      lastSent.current = value;
      setStatus("Saved to your account");
    } catch { setStatus("Cloud sync pending; local backup saved"); }
    finally { writing.current = false; }
  }, [account, backupKey, gameKey]);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setInterval(() => { void saveNow(); }, 12000);
    const onHidden = () => { if (document.visibilityState === "hidden") void saveNow(); };
    document.addEventListener("visibilitychange", onHidden);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onHidden); void saveNow(); };
  }, [loaded, saveNow]);

  return <main className="mirror">
    {loaded ? <iframe ref={frame} className="game-frame" src={"/cookieclicker/index.html?saveSlot=" + encodeURIComponent(slot)} title="Cookie Clicker" /> : <div className="loading"><div><strong>Cookie Clicker</strong><span>Loading your saved game…</span></div></div>}
    <button className="sync-button" onClick={() => setPanel(!panel)} aria-expanded={panel} aria-label="Open account save controls">☁ {account ? "Account save" : "Guest save"}</button>
    {panel && <div className="sync-panel"><h2>Player save</h2><p>{account ? <>Playing as <strong>{account.name}</strong>. Your game is saved to this account and backed up in this browser.</> : <>Playing as a guest. Your game is saved on this browser. Sign in to keep a separate save on your account.</>}</p><div className="status">{status}</div><button onClick={() => void saveNow()} disabled={!loaded}>Save now</button>{account ? <a href={signOutUrl} target="_top">Sign out</a> : <a href={signInUrl} target="_top">Sign in</a>}<small>Use the game’s Options menu to export or import a save. Each signed-in player gets a separate save.</small></div>}
  </main>;
}

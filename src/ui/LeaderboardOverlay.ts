import {
  getLocalLeaderboard,
  getGlobalLeaderboard,
  getSummaryFromEntry,
  type LeaderboardEntry,
} from "../api/leaderboard";
import type { RunSummaryData } from "../app/types/runSummary";
import { isMobileDevice } from "../core/device";

type LeaderboardMode = "global" | "local";

/**
 * DOM overlay: arcade-style leaderboard (green/amber on dark).
 * Toggle Global / Local. Shows Distance, Scrap, Gold; "View summary" opens Summary scene.
 */
export class LeaderboardOverlay {
  private el: HTMLElement | null = null;
  private entries: LeaderboardEntry[] = [];
  private mode: LeaderboardMode = "global";
  private onViewSummary: ((summary: RunSummaryData) => void) | null = null;
  private onPlayReplay: ((replayUrl: string) => void) | null = null;

  show(
    onViewSummary?: (summary: RunSummaryData) => void,
    onPlayReplay?: (replayUrl: string) => void
  ) {
    this.onViewSummary = onViewSummary ?? null;
    this.onPlayReplay = onPlayReplay ?? null;
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.className = "leaderboard-overlay";
      this.el.innerHTML = this.markup();
      document.body.appendChild(this.el);

      if (!isMobileDevice()) this.el.querySelector(".leaderboard-overlay-backdrop")?.addEventListener("click", () => this.hide());
      this.el.querySelector(".leaderboard-overlay-close")?.addEventListener("click", () => this.hide());
      this.el.querySelector(".leaderboard-panel")?.addEventListener("click", (e) => e.stopPropagation());

      this.el.querySelector(".leaderboard-tab-global")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.setMode("global");
      });
      this.el.querySelector(".leaderboard-tab-local")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.setMode("local");
      });
    }
    this.el.style.display = "flex";
    this.refresh();
  }

  private setMode(mode: LeaderboardMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.el?.querySelectorAll(".leaderboard-tab").forEach((t) => t.classList.remove("active"));
    this.el?.querySelector(`.leaderboard-tab-${mode}`)?.classList.add("active");
    this.refresh();
  }

  hide() {
    if (this.el) this.el.style.display = "none";
  }

  private async refresh() {
    if (!this.el) return;
    const listEl = this.el.querySelector(".leaderboard-list");
    if (!listEl) return;
    if (this.mode === "local") {
      this.entries = getLocalLeaderboard();
    } else {
      this.entries = await getGlobalLeaderboard();
    }
    // Global tab shows only Supabase data; no local fallback
    if (this.entries.length === 0) {
      listEl.innerHTML = `<div class="leaderboard-empty">No scores yet. Play to get on the board!</div>`;
      return;
    }
    const replayUrlForEntry = (e: LeaderboardEntry) =>
      e.replayUrl ?? getSummaryFromEntry(e)?.replayUrl ?? "";

    listEl.innerHTML = this.entries
      .map((e, i) => {
        const replayUrl = replayUrlForEntry(e);
        const replayBtn =
          replayUrl && this.onPlayReplay
            ? `<button type="button" class="leaderboard-replay-btn" data-index="${i}" data-replay-url="${replayUrl.replace(/"/g, "&quot;")}">Replay</button>`
            : "";
        return `<div class="leaderboard-row" data-index="${i}">
            <span class="rank">${i + 1}</span>
            <span class="initials">${e.initials}</span>
            <span class="stat">${Math.round(e.distance)} m</span>
            <span class="stat">${e.scrap}</span>
            <span class="stat">${e.gold}</span>
            <span class="leaderboard-actions">
              <button type="button" class="leaderboard-view-btn" data-index="${i}">View</button>
              ${replayBtn}
            </span>
          </div>`;
      })
      .join("");

    listEl.querySelectorAll(".leaderboard-view-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt((e.currentTarget as HTMLElement).dataset.index ?? "-1", 10);
        if (idx < 0 || !this.onViewSummary) return;
        const entry = this.entries[idx];
        const summary = getSummaryFromEntry(entry);
        if (summary) {
          this.hide();
          this.onViewSummary(summary);
        } else {
          this.onViewSummary({
            initials: entry.initials,
            distanceM: entry.distance,
            scrap: entry.scrap,
            gold: entry.gold,
            round: 0,
            totalKills: 0,
            level: 0,
            upgrades: [],
            evolutions: [],
            artifacts: [],
          });
          this.hide();
        }
      });
    });

    listEl.querySelectorAll(".leaderboard-replay-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const url = (e.currentTarget as HTMLElement).dataset.replayUrl;
        if (!url || !this.onPlayReplay) return;
        this.hide();
        this.onPlayReplay(url);
      });
    });
  }

  private markup(): string {
    return `
<style>
  .leaderboard-overlay {
    position: fixed;
    inset: 0;
    z-index: 10001;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.8);
  }
  .leaderboard-overlay-backdrop { position: absolute; inset: 0; cursor: pointer; }
  .leaderboard-panel {
    position: relative;
    width: 90%;
    max-width: 420px;
    background: #0a0a14;
    border: 3px solid #3a5a3a;
    border-radius: 8px;
    padding: 24px 28px 28px;
    box-shadow: 0 0 40px rgba(0,80,0,0.2), inset 0 0 60px rgba(0,0,0,0.5);
    font-family: "Courier New", monospace;
  }
  .leaderboard-title {
    text-align: center;
    color: #ffcc00;
    font-size: 22px;
    font-weight: bold;
    letter-spacing: 4px;
    margin-bottom: 12px;
    text-shadow: 0 0 10px rgba(255,204,0,0.5);
  }
  .leaderboard-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 12px;
    border-radius: 6px;
    overflow: hidden;
    background: rgba(0,20,0,0.5);
  }
  .leaderboard-tab {
    flex: 1;
    padding: 8px 16px;
    text-align: center;
    font-size: 13px;
    font-weight: bold;
    color: rgba(255,204,0,0.45);
    background: rgba(0,30,0,0.25);
    cursor: pointer;
    border: 1px solid #2a4a2a;
  }
  .leaderboard-tab:hover { color: rgba(255,204,0,0.7); background: rgba(0,35,0,0.35); }
  .leaderboard-tab.active {
    color: #ffcc00;
    background: rgba(0,50,0,0.6);
    text-shadow: 0 0 8px rgba(255,204,0,0.4);
  }
  .leaderboard-head {
    display: grid;
    grid-template-columns: 32px 1fr 72px 56px 56px 120px;
    gap: 8px;
    align-items: center;
    color: #6a8a6a;
    font-size: 12px;
    letter-spacing: 2px;
    margin-bottom: 8px;
    padding: 0 8px;
  }
  .leaderboard-list { min-height: 200px; }
  .leaderboard-row {
    display: grid;
    grid-template-columns: 32px 1fr 72px 56px 56px 120px;
    gap: 8px;
    align-items: center;
    padding: 8px 12px;
    margin-bottom: 4px;
    background: rgba(0,40,0,0.3);
    border-radius: 4px;
    color: #aaffaa;
    font-size: 16px;
  }
  .leaderboard-row .rank { color: #ffcc00; }
  .leaderboard-row .initials { letter-spacing: 3px; text-align: center; }
  .leaderboard-row .stat { color: #00ff88; text-align: right; }
  .leaderboard-view-btn {
    padding: 4px 10px;
    font-size: 12px;
    background: #2a4a2a;
    color: #aaffaa;
    border: 1px solid #3a6a3a;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
  }
  .leaderboard-view-btn:hover { background: #3a5a3a; }
  .leaderboard-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .leaderboard-replay-btn {
    padding: 4px 8px;
    font-size: 11px;
    background: #1a3a5a;
    color: #88ccff;
    border: 1px solid #2a5a8a;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
  }
  .leaderboard-replay-btn:hover { background: #2a4a6a; }
  .leaderboard-empty {
    color: #668866;
    text-align: center;
    padding: 40px 20px;
    font-size: 14px;
  }
  .leaderboard-overlay-close {
    display: block;
    margin: 20px auto 0;
    padding: 10px 28px;
    background: #2a4a2a;
    color: #aaffaa;
    border: 2px solid #3a6a3a;
    border-radius: 8px;
    font: bold 14px "Courier New", monospace;
    cursor: pointer;
  }
  .leaderboard-overlay-close:hover { background: #3a5a3a; }
</style>
<div class="leaderboard-overlay-backdrop" aria-label="Close"></div>
<div class="leaderboard-panel">
  <div class="leaderboard-title">★ HIGH SCORES ★</div>
  <div class="leaderboard-tabs">
    <button type="button" class="leaderboard-tab leaderboard-tab-global active">Global</button>
    <button type="button" class="leaderboard-tab leaderboard-tab-local">Local</button>
  </div>
  <div class="leaderboard-head"><span>#</span><span>INITIALS</span><span>DIST</span><span>SCRAP</span><span>GOLD</span><span></span></div>
  <div class="leaderboard-list">Loading…</div>
  <button type="button" class="leaderboard-overlay-close">Close</button>
</div>
`;
  }
}

/** One-off DOM modal: show run stats, ask for initials (3 chars), then call onSubmit(initials). */
export function showInitialsPrompt(
  stats: { distance: number; scrap: number; gold: number },
  onSubmit: (initials: string) => void
): void {
  const wrap = document.createElement("div");
  wrap.className = "initials-prompt-overlay";
  wrap.style.cssText = "position:fixed;inset:0;z-index:10002;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);font-family:system-ui,sans-serif;";
  wrap.innerHTML = `
    <div style="background:#12122a;border:2px solid #4488aa;border-radius:12px;padding:28px;text-align:center;max-width:320px;">
      <p style="color:#fff;margin:0 0 8px 0;font-size:18px;">You made the top 10!</p>
      <p style="color:#88aacc;margin:0 0 16px 0;font-size:14px;">Distance: ${Math.round(stats.distance)} m · Scrap: ${stats.scrap} · Gold: ${stats.gold}</p>
      <label style="display:block;color:#aaccdd;font-size:13px;margin-bottom:6px;">Enter your initials (3 letters)</label>
      <input type="text" maxlength="3" placeholder="ABC" style="width:120px;padding:10px;font-size:20px;letter-spacing:6px;text-align:center;border-radius:8px;border:2px solid #4488aa;background:#0a0a1a;color:#fff;">
      <div style="margin-top:16px;">
        <button type="button" class="initials-submit" style="padding:10px 24px;background:#4488aa;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Submit</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const input = wrap.querySelector("input") as HTMLInputElement;
  const submitBtn = wrap.querySelector(".initials-submit") as HTMLButtonElement;
  input?.focus();

  const close = () => {
    wrap.remove();
  };

  submitBtn?.addEventListener("click", () => {
    const v = (input?.value ?? "").trim().toUpperCase().slice(0, 3) || "???";
    close();
    onSubmit(v);
  });
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitBtn?.click();
  });
}

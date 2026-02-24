import { getLocalReplays, getLocalReplayData } from "../app/replay/localReplays";
import type { ReplayData } from "../app/replay/replayTypes";
import { isMobileDevice } from "../core/device";

function formatWhen(savedAt: number): string {
  const d = new Date(savedAt);
  const now = Date.now();
  const diffMs = now - savedAt;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

/**
 * DOM overlay: list of locally saved replays. Pick one to watch.
 */
export class LocalReplaysOverlay {
  private el: HTMLElement | null = null;
  private onPlay: ((replayData: ReplayData) => void) | null = null;

  show(onPlay: (replayData: ReplayData) => void) {
    this.onPlay = onPlay;
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.className = "local-replays-overlay";
      this.el.innerHTML = this.markup();
      document.body.appendChild(this.el);
      if (!isMobileDevice()) this.el.querySelector(".local-replays-backdrop")?.addEventListener("click", () => this.hide());
      this.el.querySelector(".local-replays-close")?.addEventListener("click", () => this.hide());
      this.el.querySelector(".local-replays-panel")?.addEventListener("click", (e) => e.stopPropagation());
    }
    this.el.style.display = "flex";
    this.refresh();
  }

  hide() {
    if (this.el) this.el.style.display = "none";
  }

  private refresh() {
    if (!this.el) return;
    const listEl = this.el.querySelector(".local-replays-list");
    if (!listEl) return;
    const replays = getLocalReplays();
    if (replays.length === 0) {
      listEl.innerHTML = `<div class="local-replays-empty">No saved runs yet. Play a game to save a replay here.</div>`;
      return;
    }
    listEl.innerHTML = replays
      .map(
        (r) =>
          `<button type="button" class="local-replays-row" data-id="${r.id}">
            <span class="local-replays-dist">${Math.round(r.distanceM)} m</span>
            <span class="local-replays-when">${formatWhen(r.savedAt)}</span>
          </button>`
      )
      .join("");
    listEl.querySelectorAll(".local-replays-row").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (!id || !this.onPlay) return;
        const data = getLocalReplayData(id);
        if (data) {
          this.hide();
          this.onPlay(data);
        }
      });
    });
  }

  private markup(): string {
    return `
<style>
  .local-replays-overlay {
    position: fixed;
    inset: 0;
    z-index: 10001;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.8);
  }
  .local-replays-backdrop { position: absolute; inset: 0; cursor: pointer; }
  .local-replays-panel {
    position: relative;
    width: 90%;
    max-width: 360px;
    background: #0a0a14;
    border: 3px solid #3a5a3a;
    border-radius: 8px;
    padding: 24px 28px 28px;
    box-shadow: 0 0 40px rgba(0,80,0,0.2);
    font-family: "Courier New", monospace;
  }
  .local-replays-title {
    text-align: center;
    color: #ffcc00;
    font-size: 20px;
    font-weight: bold;
    letter-spacing: 2px;
    margin-bottom: 16px;
  }
  .local-replays-list { min-height: 120px; }
  .local-replays-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 12px 14px;
    margin-bottom: 6px;
    background: rgba(0,40,0,0.3);
    border: 1px solid #2a4a2a;
    border-radius: 6px;
    color: #aaffaa;
    font-size: 16px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }
  .local-replays-row:hover { background: rgba(0,55,0,0.45); border-color: #3a6a3a; }
  .local-replays-dist { color: #00ff88; font-weight: bold; }
  .local-replays-when { color: #88aa88; font-size: 14px; }
  .local-replays-empty {
    color: #668866;
    text-align: center;
    padding: 32px 16px;
    font-size: 14px;
  }
  .local-replays-close {
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
  .local-replays-close:hover { background: #3a5a3a; }
</style>
<div class="local-replays-backdrop" aria-label="Close"></div>
<div class="local-replays-panel">
  <div class="local-replays-title">★ MY REPLAYS ★</div>
  <div class="local-replays-list">Loading…</div>
  <button type="button" class="local-replays-close">Close</button>
</div>
`;
  }
}

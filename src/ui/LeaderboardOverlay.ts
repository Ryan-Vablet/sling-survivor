import { getLeaderboard } from "../api/leaderboard";

/**
 * DOM overlay: arcade-style leaderboard (green/amber on dark).
 * Shown from title (Leaderboards button) or after submitting initials.
 */
export class LeaderboardOverlay {
  private el: HTMLElement | null = null;

  show() {
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.className = "leaderboard-overlay";
      this.el.innerHTML = this.markup();
      document.body.appendChild(this.el);

      this.el.querySelector(".leaderboard-overlay-backdrop")?.addEventListener("click", () => this.hide());
      this.el.querySelector(".leaderboard-overlay-close")?.addEventListener("click", () => this.hide());
      this.el.querySelector(".leaderboard-panel")?.addEventListener("click", (e) => e.stopPropagation());
    }
    this.el.style.display = "flex";
    this.refresh();
  }

  hide() {
    if (this.el) this.el.style.display = "none";
  }

  private async refresh() {
    if (!this.el) return;
    const listEl = this.el.querySelector(".leaderboard-list");
    if (!listEl) return;
    const entries = await getLeaderboard();
    listEl.innerHTML = entries.length
      ? entries
          .map(
            (e, i) =>
              `<div class="leaderboard-row"><span class="rank">${i + 1}</span><span class="initials">${e.initials}</span><span class="score">${e.score}</span></div>`
          )
          .join("")
      : `<div class="leaderboard-empty">No scores yet. Play to get on the board!</div>`;
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
    margin-bottom: 20px;
    text-shadow: 0 0 10px rgba(255,204,0,0.5);
  }
  .leaderboard-head {
    display: flex;
    justify-content: space-between;
    color: #6a8a6a;
    font-size: 12px;
    letter-spacing: 2px;
    margin-bottom: 8px;
    padding: 0 8px;
  }
  .leaderboard-list { min-height: 200px; }
  .leaderboard-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    margin-bottom: 4px;
    background: rgba(0,40,0,0.3);
    border-radius: 4px;
    color: #aaffaa;
    font-size: 18px;
  }
  .leaderboard-row .rank { color: #ffcc00; width: 32px; }
  .leaderboard-row .initials { letter-spacing: 3px; flex: 1; text-align: center; }
  .leaderboard-row .score { color: #00ff88; min-width: 72px; text-align: right; }
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
  <div class="leaderboard-head"><span>RANK</span><span>INITIALS</span><span>SCORE</span></div>
  <div class="leaderboard-list">Loading…</div>
  <button type="button" class="leaderboard-overlay-close">Close</button>
</div>
`;
  }
}

/** One-off DOM modal: ask for initials (3 chars), then call onSubmit(initials). */
export function showInitialsPrompt(score: number, onSubmit: (initials: string) => void): void {
  const wrap = document.createElement("div");
  wrap.className = "initials-prompt-overlay";
  wrap.style.cssText = "position:fixed;inset:0;z-index:10002;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);font-family:system-ui,sans-serif;";
  wrap.innerHTML = `
    <div style="background:#12122a;border:2px solid #4488aa;border-radius:12px;padding:28px;text-align:center;max-width:320px;">
      <p style="color:#fff;margin:0 0 8px 0;font-size:18px;">You made the top 10!</p>
      <p style="color:#88aacc;margin:0 0 16px 0;font-size:14px;">Score: ${score} m</p>
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

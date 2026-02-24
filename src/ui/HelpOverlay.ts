/**
 * HTML-based help overlay: 80% viewport, sidebar pagination, big image slots.
 * Each section's image loads from public/assets/{id}.webp (e.g. survive.webp).
 * On mobile, backdrop tap does not close (toggle behavior); only "Got it" closes.
 */

import { assetUrl } from "../render/assets";
import { isMobileDevice } from "../core/device";

const SECTIONS: { id: string; title: string; body: string }[] = [
  {
    id: "launch",
    title: "Launch",
    body:
      "Pull back on the launcher and release to launch your rocket. The further you pull, the more power.",
  },
  {
    id: "thrust",
    title: "Thrust",
    body:
      "Use WASD or Arrow keys to thrust and steer. Your boost bar depletes while thrusting and refills when you don't.",
  },
  {
    id: "coins",
    title: "Collect coins",
    body:
      "Fly through gold coins in the world to earn currency. Spend it at the merchant between rounds.",
  },
  {
    id: "enemies",
    title: "Fight enemies",
    body:
      "UFOs chase and shoot at you. Destroy them with your weapon to gain scrap and XP. Level up to choose upgrades.",
  },
  {
    id: "survive",
    title: "Survive",
    body:
      "Reach the round toll in scrap before you run out of rockets. Pay the toll at the merchant to advance. Good luck!",
  },
];

export class HelpOverlay {
  private el: HTMLElement | null = null;
  private currentPage = 0;

  show(_viewW: number, _viewH: number) {
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.className = "help-overlay";
      this.el.innerHTML = this.markup();
      document.body.appendChild(this.el);

      const back = this.el.querySelector(".help-overlay-backdrop");
      const closeBtn = this.el.querySelector(".help-overlay-close");
      const sidebarLinks = this.el.querySelectorAll(".help-sidebar a");

      if (!isMobileDevice()) back?.addEventListener("click", () => this.hide());
      closeBtn?.addEventListener("click", () => this.hide());
      this.el.querySelector(".help-overlay-panel")?.addEventListener("click", (e) => e.stopPropagation());

      sidebarLinks.forEach((link, i) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          this.showPage(i);
        });
      });

      const nextBtn = this.el.querySelector(".help-next-btn");
      nextBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        const next = (this.currentPage + 1) % SECTIONS.length;
        this.showPage(next);
      });
    }

    this.el.style.display = "flex";
    this.showPage(0);
  }

  hide() {
    if (this.el) this.el.style.display = "none";
  }

  private updateNextArrow() {
    if (!this.el) return;
    const nextBtn = this.el.querySelector(".help-next-btn") as HTMLElement;
    if (!nextBtn) return;
    const isLast = this.currentPage === SECTIONS.length - 1;
    nextBtn.style.opacity = isLast ? "0.4" : "1";
    nextBtn.style.pointerEvents = isLast ? "none" : "auto";
  }

  private showPage(index: number) {
    this.currentPage = index;
    if (!this.el) return;

    this.el.querySelectorAll(".help-sidebar a").forEach((a, i) => {
      a.classList.toggle("active", i === index);
    });
    this.el.querySelectorAll(".help-page").forEach((p, i) => {
      (p as HTMLElement).style.display = i === index ? "block" : "none";
    });
    this.updateNextArrow();
  }

  private markup(): string {
    const widthPct = 80;
    const sidebarW = 160;

    return `
<style>
  .help-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.75);
  }
  .help-overlay-backdrop {
    position: absolute;
    inset: 0;
    cursor: pointer;
  }
  .help-overlay-panel {
    position: relative;
    width: ${widthPct}vw;
    max-width: 100%;
    height: ${widthPct}vh;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    background: #12122a;
    border-radius: 16px;
    border: 2px solid rgba(68,136,170,0.6);
    box-shadow: 0 0 60px rgba(0,0,0,0.6);
    overflow: hidden;
    margin: auto;
  }
  .help-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: rgba(0,0,0,0.35);
    border-bottom: 1px solid rgba(68,136,170,0.4);
  }
  .help-header-title {
    color: #fff;
    font: bold 18px system-ui, sans-serif;
    letter-spacing: 1px;
  }
  .help-overlay-close {
    padding: 8px 20px;
    background: #4488aa;
    color: #fff;
    border: none;
    border-radius: 10px;
    font: bold 14px system-ui, sans-serif;
    cursor: pointer;
  }
  .help-overlay-close:hover { background: #55aacc; }
  .help-panel-body {
    flex: 1;
    display: flex;
    min-height: 0;
  }
  .help-sidebar {
    width: ${sidebarW}px;
    flex-shrink: 0;
    background: rgba(0,0,0,0.3);
    padding: 20px 0;
  }
  .help-sidebar a {
    display: block;
    padding: 12px 20px;
    color: #8899aa;
    text-decoration: none;
    font: 14px/1.3 system-ui, sans-serif;
    border-left: 3px solid transparent;
  }
  .help-sidebar a:hover { color: #aaccdd; }
  .help-sidebar a.active {
    color: #fff;
    background: rgba(68,136,170,0.25);
    border-left-color: #4488aa;
  }
  .help-main-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
  }
  .help-main {
    flex: 1;
    overflow: auto;
    padding: 24px 32px 60px 32px;
    scrollbar-width: thin;
    scrollbar-color: #4488aa #1a1a2e;
  }
  .help-main::-webkit-scrollbar { width: 10px; }
  .help-main::-webkit-scrollbar-track { background: #1a1a2e; }
  .help-main::-webkit-scrollbar-thumb { background: #4488aa; border-radius: 5px; }
  .help-main::-webkit-scrollbar-thumb:hover { background: #55aacc; }
  .help-next-btn {
    position: absolute;
    bottom: 20px;
    right: 24px;
    width: 48px;
    height: 48px;
    padding: 0;
    border: none;
    background: rgba(68,136,170,0.5);
    color: #fff;
    border-radius: 12px;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }
  .help-next-btn:hover { background: #4488aa; }
  .help-page { display: none; }
  .help-page h2 {
    margin: 0 0 16px 0;
    color: #88aacc;
    font: bold 20px/1.3 system-ui, sans-serif;
  }
  .help-image-wrap {
    width: 100%;
    max-width: 560px;
    aspect-ratio: 16/10;
    margin-bottom: 20px;
    background: #1a1a2e;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .help-image-wrap img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .help-image-wrap img:not([src]),
  .help-image-wrap img[src=""] {
    display: none;
  }
  .help-image-wrap:has(img[src]:not([src=""])) .help-image-placeholder {
    display: none;
  }
  .help-image-wrap .help-image-placeholder {
    color: #556677;
    font: 14px system-ui, sans-serif;
    padding: 24px;
    text-align: center;
  }
  .help-body {
    color: #ccccdd;
    font: 14px/1.5 system-ui, sans-serif;
    max-width: 520px;
  }
  .help-overlay-close {
    position: absolute;
    top: 16px;
    right: 20px;
    padding: 10px 24px;
    background: #4488aa;
    color: #fff;
    border: none;
    border-radius: 10px;
    font: bold 14px system-ui, sans-serif;
    cursor: pointer;
    z-index: 1;
  }
  .help-overlay-close:hover { background: #55aacc; }
</style>
<div class="help-overlay-backdrop" aria-label="Close"></div>
<div class="help-overlay-panel">
  <header class="help-header">
    <span class="help-header-title">How to Play</span>
    <button type="button" class="help-overlay-close">Got it</button>
  </header>
  <div class="help-panel-body">
    <nav class="help-sidebar">
    ${SECTIONS.map((s, i) => `<a href="#" class="${i === 0 ? "active" : ""}" data-page="${i}">${s.title}</a>`).join("")}
  </nav>
    <div class="help-main-wrap">
      <main class="help-main">
        ${SECTIONS.map(
          (s, i) => `
        <section class="help-page" data-page="${i}" style="display: ${i === 0 ? "block" : "none"}">
          <h2>${s.title}</h2>
          <div class="help-image-wrap">
            <img src="${assetUrl(`/assets/${s.id}.webp`)}" alt="${s.title}" data-help-image="${s.id}" />
            <span class="help-image-placeholder">Image: set img src for "${s.id}"</span>
          </div>
          <p class="help-body">${s.body}</p>
        </section>
        `
        ).join("")}
      </main>
      <button type="button" class="help-next-btn" aria-label="Next page">→</button>
    </div>
  </div>
</div>
`;
  }
}

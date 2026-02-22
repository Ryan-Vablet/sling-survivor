/**
 * Gold Mode — a meme. Click the gold coin on the title screen.
 * Persists a gold glowing border; shows "Gold Mode Activated" once when clicked.
 * Does nothing. (:
 */

const STORAGE_KEY = "sling-survivor-gold-mode";
const MESSAGE_DURATION_MS = 4500;

let overlayEl: HTMLElement | null = null;
let messageEl: HTMLElement | null = null;
let messageHideTimeout: ReturnType<typeof setTimeout> | null = null;

export function isGoldMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGoldMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
  ensureOverlay();
  if (overlayEl) overlayEl.style.display = on ? "block" : "none";
  if (on) showActivatedMessage();
}

const SEGMENT_DELAYS = [0, 0.35, 0.7, 1.05, 1.4, 1.75, 2.1, 2.45]; // one bulges every ~0.35s

function ensureOverlay(): void {
  if (overlayEl) return;
  overlayEl = document.createElement("div");
  overlayEl.className = "gold-mode-overlay";
  overlayEl.setAttribute("aria-hidden", "true");
  overlayEl.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    display: none;
    border: 3px solid rgba(212, 175, 55, 0.6);
    border-radius: 6px;
    box-sizing: border-box;
  `;
  if (!document.getElementById("gold-mode-pulse-style")) {
    const style = document.createElement("style");
    style.id = "gold-mode-pulse-style";
    style.textContent = `
      .gold-mode-segment {
        position: absolute;
        background: transparent;
        animation: gold-segment-bulge-top 2.8s ease-in-out infinite;
      }
      .gold-mode-segment.top { left: 35%; top: -1px; width: 30%; height: 14px; box-shadow: 0 -2px 0 0 rgba(212,175,55,0.55), 0 0 14px rgba(212,175,55,0.22); }
      .gold-mode-segment.top-right { right: -1px; top: -1px; width: 14px; height: 14px; box-shadow: 2px -2px 0 0 rgba(212,175,55,0.55), 0 0 14px rgba(212,175,55,0.22); border-radius: 0 6px 0 0; }
      .gold-mode-segment.right { right: -1px; top: 35%; width: 14px; height: 30%; box-shadow: 2px 0 0 0 rgba(212,175,55,0.55), 0 0 14px rgba(212,175,55,0.22); }
      .gold-mode-segment.bottom-right { right: -1px; bottom: -1px; width: 14px; height: 14px; box-shadow: 2px 2px 0 0 rgba(212,175,55,0.55), 0 0 14px rgba(212,175,55,0.22); border-radius: 0 0 6px 0; }
      .gold-mode-segment.bottom { left: 35%; bottom: -1px; width: 30%; height: 14px; box-shadow: 0 2px 0 0 rgba(212,175,55,0.55), 0 0 14px rgba(212,175,55,0.22); }
      .gold-mode-segment.bottom-left { left: -1px; bottom: -1px; width: 14px; height: 14px; box-shadow: -2px 2px 0 0 rgba(212,175,55,0.55), 0 0 14px rgba(212,175,55,0.22); border-radius: 0 0 0 6px; }
      .gold-mode-segment.left { left: -1px; top: 35%; width: 14px; height: 30%; box-shadow: -2px 0 0 0 rgba(212,175,55,0.55), 0 0 14px rgba(212,175,55,0.22); }
      .gold-mode-segment.top-left { left: -1px; top: -1px; width: 14px; height: 14px; box-shadow: -2px -2px 0 0 rgba(212,175,55,0.55), 0 0 14px rgba(212,175,55,0.22); border-radius: 6px 0 0 0; }
      .gold-mode-segment.top { animation-name: gold-segment-bulge-top; }
      .gold-mode-segment.top-right { animation-name: gold-segment-bulge-tr; }
      .gold-mode-segment.right { animation-name: gold-segment-bulge-right; }
      .gold-mode-segment.bottom-right { animation-name: gold-segment-bulge-br; }
      .gold-mode-segment.bottom { animation-name: gold-segment-bulge-bottom; }
      .gold-mode-segment.bottom-left { animation-name: gold-segment-bulge-bl; }
      .gold-mode-segment.left { animation-name: gold-segment-bulge-left; }
      .gold-mode-segment.top-left { animation-name: gold-segment-bulge-tl; }
      @keyframes gold-segment-bulge-top {
        0%, 100% { box-shadow: 0 -2px 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
        15% { box-shadow: 0 -3px 0 0 rgba(255,215,0,0.9), 0 0 28px 4px rgba(212,175,55,0.5), 0 0 50px rgba(212,175,55,0.25); opacity: 1; }
        30%, 100% { box-shadow: 0 -2px 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
      }
      @keyframes gold-segment-bulge-tr {
        0%, 100% { box-shadow: 2px -2px 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
        15% { box-shadow: 3px -3px 0 0 rgba(255,215,0,0.9), 0 0 28px 4px rgba(212,175,55,0.5), 0 0 50px rgba(212,175,55,0.25); opacity: 1; }
        30%, 100% { box-shadow: 2px -2px 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
      }
      @keyframes gold-segment-bulge-right {
        0%, 100% { box-shadow: 2px 0 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
        15% { box-shadow: 3px 0 0 0 rgba(255,215,0,0.9), 0 0 28px 4px rgba(212,175,55,0.5), 0 0 50px rgba(212,175,55,0.25); opacity: 1; }
        30%, 100% { box-shadow: 2px 0 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
      }
      @keyframes gold-segment-bulge-br {
        0%, 100% { box-shadow: 2px 2px 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
        15% { box-shadow: 3px 3px 0 0 rgba(255,215,0,0.9), 0 0 28px 4px rgba(212,175,55,0.5), 0 0 50px rgba(212,175,55,0.25); opacity: 1; }
        30%, 100% { box-shadow: 2px 2px 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
      }
      @keyframes gold-segment-bulge-bottom {
        0%, 100% { box-shadow: 0 2px 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
        15% { box-shadow: 0 3px 0 0 rgba(255,215,0,0.9), 0 0 28px 4px rgba(212,175,55,0.5), 0 0 50px rgba(212,175,55,0.25); opacity: 1; }
        30%, 100% { box-shadow: 0 2px 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
      }
      @keyframes gold-segment-bulge-bl {
        0%, 100% { box-shadow: -2px 2px 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
        15% { box-shadow: -3px 3px 0 0 rgba(255,215,0,0.9), 0 0 28px 4px rgba(212,175,55,0.5), 0 0 50px rgba(212,175,55,0.25); opacity: 1; }
        30%, 100% { box-shadow: -2px 2px 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
      }
      @keyframes gold-segment-bulge-left {
        0%, 100% { box-shadow: -2px 0 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
        15% { box-shadow: -3px 0 0 0 rgba(255,215,0,0.9), 0 0 28px 4px rgba(212,175,55,0.5), 0 0 50px rgba(212,175,55,0.25); opacity: 1; }
        30%, 100% { box-shadow: -2px 0 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
      }
      @keyframes gold-segment-bulge-tl {
        0%, 100% { box-shadow: -2px -2px 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
        15% { box-shadow: -3px -3px 0 0 rgba(255,215,0,0.9), 0 0 28px 4px rgba(212,175,55,0.5), 0 0 50px rgba(212,175,55,0.25); opacity: 1; }
        30%, 100% { box-shadow: -2px -2px 0 0 rgba(212,175,55,0.5), 0 0 12px rgba(212,175,55,0.15); opacity: 0.9; }
      }
      .gold-mode-message {
        position: absolute;
        top: 28px;
        left: 50%;
        transform: translateX(-50%);
        font-family: system-ui, sans-serif;
        font-size: 54px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: #ffd700;
        text-shadow:
          0 0 20px rgba(255, 215, 0, 0.9),
          0 0 40px rgba(212, 175, 55, 0.7),
          0 0 60px rgba(212, 175, 55, 0.5),
          0 0 80px rgba(212, 175, 55, 0.3);
        opacity: 0;
        transition: opacity 0.4s ease;
        white-space: nowrap;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: gold-message-pulse 1.6s ease-in-out infinite;
      }
      .gold-mode-message .gold-letter {
        display: inline-block;
        animation: gold-letter-bob 0.8s ease-in-out infinite;
      }
      @keyframes gold-message-pulse {
        0%, 100% { filter: brightness(1); text-shadow: 0 0 20px rgba(255,215,0,0.85), 0 0 40px rgba(212,175,55,0.6), 0 0 60px rgba(212,175,55,0.4), 0 0 80px rgba(212,175,55,0.25); }
        50% { filter: brightness(1.15); text-shadow: 0 0 28px rgba(255,215,0,1), 0 0 55px rgba(212,175,55,0.8), 0 0 85px rgba(212,175,55,0.55), 0 0 120px rgba(212,175,55,0.35); }
      }
      @keyframes gold-letter-bob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
    `;
    document.head.appendChild(style);
  }
  const segments = ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"];
  segments.forEach((side, i) => {
    const seg = document.createElement("div");
    seg.className = `gold-mode-segment ${side}`;
    seg.style.animationDelay = `${SEGMENT_DELAYS[i]}s`;
    overlayEl!.appendChild(seg);
  });
  messageEl = document.createElement("div");
  messageEl.className = "gold-mode-message";
  const messageText = "Gold Mode Activated";
  for (let i = 0; i < messageText.length; i++) {
    const span = document.createElement("span");
    span.className = "gold-letter";
    span.textContent = messageText[i];
    span.style.animationDelay = `${i * 0.04}s`;
    messageEl.appendChild(span);
  }
  overlayEl.appendChild(messageEl);
  document.body.appendChild(overlayEl);
  if (isGoldMode()) overlayEl.style.display = "block";
}

function showActivatedMessage(): void {
  ensureOverlay();
  if (!messageEl) return;
  if (messageHideTimeout) clearTimeout(messageHideTimeout);
  messageEl.style.opacity = "1";
  messageEl.style.display = "flex";
  messageHideTimeout = setTimeout(() => {
    messageHideTimeout = null;
    messageEl!.style.opacity = "0";
    setTimeout(() => {
      messageEl!.style.display = "none";
    }, 400);
  }, MESSAGE_DURATION_MS);
}

/** Call from createApp so the overlay exists and reflects persisted state. */
export function initGoldModeOverlay(): void {
  ensureOverlay();
  if (isGoldMode() && overlayEl) overlayEl.style.display = "block";
}

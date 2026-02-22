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
    border: 6px solid rgba(212, 175, 55, 0.6);
    border-radius: 24px;
    box-sizing: border-box;
  `;
  if (!document.getElementById("gold-mode-pulse-style")) {
    const style = document.createElement("style");
    style.id = "gold-mode-pulse-style";
    style.textContent = `
      .gold-mode-segment {
        position: absolute;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: transparent;
        animation: gold-segment-bulge 2.8s ease-in-out infinite;
      }
      .gold-mode-segment.top { left: 50%; top: 0; transform: translate(-50%, -50%); }
      .gold-mode-segment.top-right { right: 0; top: 0; transform: translate(50%, -50%); }
      .gold-mode-segment.right { right: 0; top: 50%; transform: translate(50%, -50%); }
      .gold-mode-segment.bottom-right { right: 0; bottom: 0; transform: translate(50%, 50%); }
      .gold-mode-segment.bottom { left: 50%; bottom: 0; transform: translate(-50%, 50%); }
      .gold-mode-segment.bottom-left { left: 0; bottom: 0; transform: translate(-50%, 50%); }
      .gold-mode-segment.left { left: 0; top: 50%; transform: translate(-50%, -50%); }
      .gold-mode-segment.top-left { left: 0; top: 0; transform: translate(-50%, -50%); }
      .gold-mode-segment.top { animation-delay: 0s; }
      .gold-mode-segment.top-right { animation-delay: 0.35s; }
      .gold-mode-segment.right { animation-delay: 0.7s; }
      .gold-mode-segment.bottom-right { animation-delay: 1.05s; }
      .gold-mode-segment.bottom { animation-delay: 1.4s; }
      .gold-mode-segment.bottom-left { animation-delay: 1.75s; }
      .gold-mode-segment.left { animation-delay: 2.1s; }
      .gold-mode-segment.top-left { animation-delay: 2.45s; }
      @keyframes gold-segment-bulge {
        0%, 100% { box-shadow: 0 0 12px rgba(212,175,55,0.25); opacity: 0.85; }
        15% { box-shadow: 0 0 25px rgba(212,175,55,0.5), 0 0 45px rgba(212,175,55,0.3); opacity: 1; }
        30%, 100% { box-shadow: 0 0 12px rgba(212,175,55,0.25); opacity: 0.85; }
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
  segments.forEach((side) => {
    const seg = document.createElement("div");
    seg.className = `gold-mode-segment ${side}`;
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

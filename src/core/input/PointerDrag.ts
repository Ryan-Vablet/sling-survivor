export type DragState = {
  isDragging: boolean;
  released: boolean;
  startX: number;
  startY: number;
  x: number;
  y: number;
};

export class PointerDrag {
  state: DragState = { isDragging: false, released: false, startX: 0, startY: 0, x: 0, y: 0 };

  constructor(private el: HTMLElement) {
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", this.onDown, { passive: false });
    el.addEventListener("pointermove", this.onMove, { passive: false });
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointercancel", this.onUp);
    el.addEventListener("lostpointercapture", this.onUp as any);
  }

  private onDown = (e: PointerEvent) => {
    e.preventDefault();
    this.el.setPointerCapture(e.pointerId);
    this.state.isDragging = true;
    this.state.startX = e.clientX;
    this.state.startY = e.clientY;
    this.state.x = e.clientX;
    this.state.y = e.clientY;
  };

  private onMove = (e: PointerEvent) => {
    if (!this.state.isDragging) return;
    e.preventDefault();
    this.state.x = e.clientX;
    this.state.y = e.clientY;
  };

  private onUp = (_e: PointerEvent) => {
    if (this.state.isDragging) {
      this.state.released = true;
    }
    this.state.isDragging = false;
  };
}

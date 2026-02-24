/** True when the device has touch capability (mobile, tablet, touch laptop). */
export function isMobileDevice(): boolean {
  return navigator.maxTouchPoints > 0;
}

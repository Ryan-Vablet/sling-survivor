import { getTierForDistance } from "../../content/tiers/tierDefs";
import type { TierDef } from "../../content/tiers/tierTypes";

export class TierSystem {
  currentTier: TierDef = getTierForDistance(0);
  tierJustChanged = false;
  /** When set (e.g. by debug key), update() uses this instead of distance-based tier. */
  debugTierOverride: TierDef | null = null;

  update(distanceM: number): void {
    if (this.debugTierOverride) {
      this.currentTier = this.debugTierOverride;
      this.tierJustChanged = false;
      return;
    }
    const next = getTierForDistance(distanceM);
    this.tierJustChanged = next.id !== this.currentTier.id;
    this.currentTier = next;
  }

  /** Set tier for debug (e.g. cycle with 't' key). Pass null to clear and use distance again. */
  setDebugTier(tier: TierDef | null): void {
    this.debugTierOverride = tier;
    if (tier) {
      this.currentTier = tier;
      this.tierJustChanged = true;
    }
  }

  reset(): void {
    this.debugTierOverride = null;
    this.currentTier = getTierForDistance(0);
    this.tierJustChanged = false;
  }
}

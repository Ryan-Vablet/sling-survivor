import { getTierForDistance } from "../../content/tiers/tierDefs";
import type { TierDef } from "../../content/tiers/tierTypes";

export class TierSystem {
  currentTier: TierDef = getTierForDistance(0);
  tierJustChanged = false;

  update(distanceM: number): void {
    const next = getTierForDistance(distanceM);
    this.tierJustChanged = next.id !== this.currentTier.id;
    this.currentTier = next;
  }

  reset(): void {
    this.currentTier = getTierForDistance(0);
    this.tierJustChanged = false;
  }
}

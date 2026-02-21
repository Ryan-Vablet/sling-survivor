import type { RunState } from "../runtime/RunState";
import { TUNING } from "../../content/tuning";

export class UpgradeSystem {
  checkLevelUp(run: RunState): void {
    while (run.currentXp >= run.xpToNextLevel) {
      run.currentXp -= run.xpToNextLevel;
      run.currentLevel++;
      run.pendingLevelUps++;
      run.xpToNextLevel = Math.round(run.xpToNextLevel * TUNING.xp.levelScale);
    }
  }

  applyChoice(run: RunState, upgradeId: string) {
    run.applyUpgrade(upgradeId);
    run.paused = false;
  }
}

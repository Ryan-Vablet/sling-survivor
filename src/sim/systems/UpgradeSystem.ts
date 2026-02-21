import type { UpgradeChoice } from "../../content/upgrades/upgradeTypes";
import { rollUpgradeChoices } from "../../content/upgrades/upgradePool";
import type { RunState } from "../runtime/RunState";
import { TUNING } from "../../content/tuning";

export class UpgradeSystem {
  checkMilestone(
    distanceM: number,
    kills: number,
    run: RunState
  ): UpgradeChoice[] | null {
    if (run.paused) return null;

    let triggered = false;

    if (distanceM >= run.nextUpgradeDistM) {
      run.nextUpgradeDistM += TUNING.milestones.distanceIntervalM;
      triggered = true;
    }

    if (!triggered && kills >= run.nextUpgradeKills) {
      run.nextUpgradeKills += TUNING.milestones.killsInterval;
      triggered = true;
    }

    if (!triggered) return null;

    const choices = rollUpgradeChoices(run.rng, run.appliedUpgrades, 3, run.weaponLoadout);
    if (choices.length === 0) return null;

    run.paused = true;
    return choices;
  }

  applyChoice(run: RunState, upgradeId: string) {
    run.applyUpgrade(upgradeId);
    run.paused = false;
  }
}

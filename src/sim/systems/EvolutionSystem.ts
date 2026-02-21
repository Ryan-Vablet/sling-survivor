import { EVOLUTION_DEFS } from "../../content/evolutions/evolutionDefs";
import type { EvolutionResult } from "../../content/evolutions/evolutionTypes";
import type { RunState } from "../runtime/RunState";

export class EvolutionSystem {
  check(run: RunState): EvolutionResult | null {
    for (const evo of EVOLUTION_DEFS) {
      if (evo.oneTime && run.appliedEvolutions.has(evo.id)) continue;
      if (!run.weaponLoadout.includes(evo.sourceWeaponId)) continue;

      let met = true;
      for (const [upgradeId, minCount] of Object.entries(
        evo.requiresUpgrades
      )) {
        if ((run.appliedUpgrades.get(upgradeId) ?? 0) < minCount) {
          met = false;
          break;
        }
      }
      if (!met) continue;

      const idx = run.weaponLoadout.indexOf(evo.sourceWeaponId);
      if (idx !== -1) {
        run.weaponLoadout[idx] = evo.resultWeaponId;
      }
      run.appliedEvolutions.add(evo.id);
      run.recomputeStats();

      if (import.meta.env.DEV) {
        console.log(
          `[Evolution] ${evo.sourceWeaponId} → ${evo.resultWeaponId}`
        );
      }

      return { def: evo };
    }
    return null;
  }
}

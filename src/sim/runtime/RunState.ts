import { RNG } from "../../core/rng/rng";
import { TUNING } from "../../content/tuning";
import { UPGRADE_DEFS } from "../../content/upgrades/upgradeDefs";
import { WEAPON_DEFS } from "../../content/weapons/weaponDefs";
import type { TargetMode } from "../../content/weapons/weaponDefs";

export type DerivedPlayerStats = {
  hpMax: number;
  boostMax: number;
  boostDrainPerSec: number;
  boostRegenPerSec: number;
  boostAutoRegen: boolean;
  thrustAccel: number;
  stallSpeed: number;
  stallTime: number;
  contactSpeedRetain: number;
  dragDebuffSec: number;
};

export type DerivedWeaponStats = {
  id: string;
  fireCooldown: number;
  range: number;
  projectileSpeed: number;
  damage: number;
  extraShots: number;
  targetMode: TargetMode;
  projectileLifeT: number;
  pierceCount: number;
};

export class RunState {
  seed: number;
  rng: RNG;

  currentRound = 1;
  rocketsRemaining: number;
  scrap = 0;
  gold = 0;
  roundToll: number;

  currentXp = 0;
  xpToNextLevel: number;
  currentLevel = 0;
  pendingLevelUps = 0;
  totalKills = 0;

  appliedUpgrades: Map<string, number> = new Map();
  appliedEvolutions: Set<string> = new Set();
  weaponLoadout: string[] = ["auto_cannon"];

  playerStats!: DerivedPlayerStats;
  weaponStats: Map<string, DerivedWeaponStats> = new Map();

  paused = false;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
    this.rng = new RNG(this.seed);
    this.rocketsRemaining = TUNING.rounds.startingRockets;
    this.roundToll = TUNING.rounds.baseToll;
    this.xpToNextLevel = TUNING.xp.baseToLevel;
    this.recomputeStats();
  }

  applyUpgrade(id: string) {
    const count = this.appliedUpgrades.get(id) ?? 0;
    this.appliedUpgrades.set(id, count + 1);

    const def = UPGRADE_DEFS.find((d) => d.id === id);
    if (
      def?.effect.type === "special" &&
      def.effect.specialId === "unlock_rear_blaster"
    ) {
      if (!this.weaponLoadout.includes("rear_blaster")) {
        this.weaponLoadout.push("rear_blaster");
      }
    }

    this.recomputeStats();

    if (import.meta.env.DEV) {
      console.log(
        `[Upgrade] ${id}`,
        Object.fromEntries(this.appliedUpgrades)
      );
    }
  }

  recomputeStats() {
    this.playerStats = this.computePlayerStats();
    this.weaponStats = this.computeWeaponStats();
  }

  private computePlayerStats(): DerivedPlayerStats {
    const adds: Record<string, number> = {};
    const mults: Record<string, number> = {};
    const specials: string[] = [];

    for (const [id, count] of this.appliedUpgrades) {
      const def = UPGRADE_DEFS.find((d) => d.id === id);
      if (!def) continue;
      for (let i = 0; i < count; i++) {
        const e = def.effect;
        if (e.type === "stat_add") {
          adds[e.stat] = (adds[e.stat] ?? 0) + e.amount;
        } else if (e.type === "stat_mult") {
          mults[e.stat] = (mults[e.stat] ?? 1) * e.multiplier;
        } else if (e.type === "special") {
          specials.push(e.specialId);
        }
      }
    }

    const d = (stat: string, base: number) =>
      (base + (adds[stat] ?? 0)) * (mults[stat] ?? 1);

    return {
      hpMax: d("hpMax", TUNING.player.hpMax),
      boostMax: d("boostMax", TUNING.player.boostMax),
      boostDrainPerSec: d("boostDrainPerSec", TUNING.player.boostDrainPerSec),
      boostRegenPerSec: d("boostRegenPerSec", TUNING.player.boostRegenPerSec),
      boostAutoRegen:
        (TUNING.player.boostAutoRegen as boolean) ||
        specials.includes("boost_auto_regen"),
      thrustAccel: d("thrustAccel", TUNING.player.thrustAccel),
      stallSpeed: d("stallSpeed", TUNING.player.stallSpeed),
      stallTime: d("stallTime", TUNING.player.stallTime),
      contactSpeedRetain: d(
        "contactSpeedRetain",
        TUNING.enemy.contactSpeedRetain
      ),
      dragDebuffSec: d("dragDebuffSec", TUNING.enemy.dragDebuffSec),
    };
  }

  private computeWeaponStats(): Map<string, DerivedWeaponStats> {
    const result = new Map<string, DerivedWeaponStats>();

    type WMod = {
      weaponTag?: string;
      mods: Record<string, number>;
    };
    const weaponMods: WMod[] = [];

    for (const [id, count] of this.appliedUpgrades) {
      const def = UPGRADE_DEFS.find((d) => d.id === id);
      if (!def || def.effect.type !== "weapon_mod") continue;
      const eff = def.effect;
      for (let i = 0; i < count; i++) {
        weaponMods.push({
          weaponTag: eff.weaponTag,
          mods: eff.mods as Record<string, number>,
        });
      }
    }

    for (const weaponId of this.weaponLoadout) {
      const wdef = WEAPON_DEFS[weaponId];
      if (!wdef) continue;

      let cooldownMult = 1;
      let damageMult = 1;
      let damageAdd = 0;
      let projectileSpeedMult = 1;
      let rangeMult = 1;
      let extraShotsAdd = 0;

      for (const mod of weaponMods) {
        // No tag → global mod (applies to all weapons). Tag set → only matching weapons.
        if (mod.weaponTag && !wdef.tags.includes(mod.weaponTag)) continue;
        cooldownMult *= mod.mods.cooldownMult ?? 1;
        damageMult *= mod.mods.damageMult ?? 1;
        damageAdd += mod.mods.damageAdd ?? 0;
        projectileSpeedMult *= mod.mods.projectileSpeedMult ?? 1;
        rangeMult *= mod.mods.rangeMult ?? 1;
        extraShotsAdd += mod.mods.extraShotsAdd ?? 0;
      }

      result.set(weaponId, {
        id: weaponId,
        fireCooldown: wdef.baseCooldown * cooldownMult,
        range: wdef.baseRange * rangeMult,
        projectileSpeed: wdef.baseProjectileSpeed * projectileSpeedMult,
        damage: (wdef.baseDamage + damageAdd) * damageMult,
        extraShots: wdef.baseExtraShots + extraShotsAdd,
        targetMode: wdef.targetMode,
        projectileLifeT: wdef.projectileLifeT,
        pierceCount: wdef.basePierceCount,
      });
    }

    return result;
  }
}

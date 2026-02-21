export type EvolutionDef = {
  id: string;
  name: string;
  description: string;
  sourceWeaponId: string;
  resultWeaponId: string;
  requiresUpgrades: Record<string, number>;
  oneTime: boolean;
};

export type EvolutionResult = {
  def: EvolutionDef;
};

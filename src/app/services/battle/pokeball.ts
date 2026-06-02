import { EnemyPokemonState, TeamPokemon } from '../../models/battle.model';

export function calculateCatchRate(enemy: EnemyPokemonState): number {
  const hpRemaining = 1 - enemy.currentHp / enemy.maxHp;
  let segs = Math.round(14 * hpRemaining * hpRemaining + 3 * hpRemaining + 1);
  if (enemy.status !== null) segs = 18;
  return Math.min(20, Math.max(1, segs));
}

export function rollCatch(segments: number): boolean {
  return Math.floor(Math.random() * 20) < segments;
}

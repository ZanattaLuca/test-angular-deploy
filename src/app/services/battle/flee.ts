import { TeamPokemon, EnemyPokemonState } from '../../models/battle.model';

export function tryFlee(playerSpeed: number, enemySpeed: number): boolean {
  const fleeChance = ((playerSpeed * 32) / (enemySpeed / 4) + 30) / 256;
  return Math.random() < fleeChance;
}

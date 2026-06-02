import { Pokemon } from './pokemon.model';
import { DiceSize } from './evolution-data';

export type StatusEffect = 'paralyzed' | 'burned' | 'frozen';

export type BattleSubPhase = 'idle' | 'item' | 'pokemon' | 'flee';

export interface BattleStats {
  hp: number;
  speed: number;
}

export interface TeamPokemon {
  pokemon: Pokemon;
  level: number;
  currentXp: number;
  currentHp: number;
  maxHp: number;
  stats: BattleStats;
  diceSize: DiceSize;
  status: StatusEffect | null;
}

export interface BattleLogEntry {
  text: string;
  side: 'player' | 'enemy';
}

export interface WildPokemonState {
  pokemon: Pokemon;
  level: number;
  currentHp: number;
  maxHp: number;
  stats: BattleStats;
  diceSize: DiceSize;
  status: StatusEffect | null;
  baseExperience: number;
}

export type EnemyPokemonState = WildPokemonState;

export const STATUS_NAMES: Record<StatusEffect, string> = {
  paralyzed: 'Paralizzato',
  burned: 'Scottato',
  frozen: 'Congelato',
};

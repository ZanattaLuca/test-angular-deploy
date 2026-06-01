import { Pokemon } from './pokemon.model';

export type StatusEffect =
  | 'paralyzed'
  | 'poisoned'
  | 'burned'
  | 'frozen'
  | 'sleep';

export type DamageClass = 'physical' | 'special' | 'status';

export type BattleSubPhase = 'idle' | 'fight' | 'item' | 'pokemon' | 'flee';

export interface BattleMove {
  name: string;
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  type: string;
  damageClass: DamageClass;
}

export interface BattleStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface TeamPokemon {
  pokemon: Pokemon;
  level: number;
  currentXp: number;
  currentHp: number;
  maxHp: number;
  stats: BattleStats;
  moves: BattleMove[];
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
  moves: BattleMove[];
  status: StatusEffect | null;
  baseExperience: number;
}

export type EnemyPokemonState = WildPokemonState;

export const STATUS_NAMES: Record<StatusEffect, string> = {
  paralyzed: 'Paralizzato',
  poisoned: 'Avvelenato',
  burned: 'Scottato',
  frozen: 'Congelato',
  sleep: 'Addormentato',
};

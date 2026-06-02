export { BattleService } from './battle.service';
export type { GamePhase } from './battle.service';
export { performAttack, getDiceForPokemon, getTypeDice } from './dice.engine';
export type { TypeDiceRoll } from './dice.engine';
export { calculateCatchRate, rollCatch } from './pokeball';
export { tryLevelUp } from './xp-leveling';
export { tryFlee } from './flee';

import { Pokemon } from '../../models/pokemon.model';
import { StatusEffect } from '../../models/battle.model';
import { DiceSize, getDiceSize } from '../../models/evolution-data';
import { PokemonService } from '../pokemon.service';

export interface TypeDiceRoll {
  type: string;
  diceSize: DiceSize;
  advantage: boolean;
  disadvantage: boolean;
  result: number;
  rollA: number;
  rollB: number | null;
  statusInflicted: StatusEffect | null;
}

const DICE_MAX: Record<DiceSize, number> = { d6: 6, d8: 8, d10: 10, d12: 12 };

export function getTypeDice(pokemon: Pokemon): [string, string] {
  const types = pokemon.types.map((t) => t.type.name);
  if (types.length === 1) return [types[0], types[0]];
  return [types[0], types[1]];
}

export function getDiceForPokemon(pokemon: Pokemon): DiceSize {
  return getDiceSize(pokemon.id);
}

function rollDie(diceSize: DiceSize): number {
  const max = DICE_MAX[diceSize];
  return Math.floor(Math.random() * max) + 1;
}

export function rollTypeDice(
  diceSize: DiceSize,
  advantage: boolean,
  disadvantage: boolean,
): { result: number; rollA: number; rollB: number | null } {
  const first = rollDie(diceSize);
  if (!advantage && !disadvantage) return { result: first, rollA: first, rollB: null };
  const second = rollDie(diceSize);
  if (advantage) {
    return { result: Math.max(first, second), rollA: first, rollB: second };
  }
  return { result: Math.min(first, second), rollA: first, rollB: second };
}

const STATUS_DICE_TYPES: Record<string, StatusEffect> = {
  fire: 'burned',
  ice: 'frozen',
  electric: 'paralyzed',
};

function checkStatusEffect(
  diceType: string,
  diceSize: DiceSize,
  roll: number,
): StatusEffect | null {
  const status = STATUS_DICE_TYPES[diceType];
  if (!status) return null;
  const max = DICE_MAX[diceSize];
  if (roll === max && Math.random() < 0.1) return status;
  return null;
}

export function performAttack(
  pokemon: Pokemon,
  diceSize: DiceSize,
  defenderTypes: string[],
  pokemonService: PokemonService,
): { damage: number; rolls: TypeDiceRoll[] } {
  const typeDice = getTypeDice(pokemon);
  const rolls: TypeDiceRoll[] = [];
  let total = 0;

  for (const dtype of typeDice) {
    const immune = pokemonService.isImmune(dtype, defenderTypes);

    if (immune) {
      rolls.push({
        type: dtype,
        diceSize,
        advantage: false,
        disadvantage: false,
        result: 0,
        rollA: 0,
        rollB: null,
        statusInflicted: null,
      });
      continue;
    }

    const advantage = pokemonService.isSuperEffective(dtype, defenderTypes);
    const disadvantage = pokemonService.isNotVeryEffective(dtype, defenderTypes);
    const { result, rollA, rollB } = rollTypeDice(diceSize, advantage, disadvantage);
    const statusInflicted = checkStatusEffect(dtype, diceSize, result);

    rolls.push({
      type: dtype,
      diceSize,
      advantage,
      disadvantage,
      result,
      rollA,
      rollB,
      statusInflicted,
    });
    total += result;
  }

  return { damage: total, rolls };
}

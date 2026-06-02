import { TeamPokemon } from '../../models/battle.model';
import { PokemonService } from '../pokemon.service';

export function tryLevelUp(pkmn: TeamPokemon, pokemonService: PokemonService): string[] {
  const messages: string[] = [];
  let xpForNext = Math.pow(pkmn.level + 1, 3);

  while (pkmn.currentXp >= xpForNext && pkmn.level < 100) {
    pkmn.level++;
    pkmn.currentXp -= xpForNext;
    const baseStats = pokemonService.extractBaseStats(pkmn.pokemon);
    const newStats = pokemonService.calcStats(baseStats, pkmn.level);
    const hpGain = newStats.hp - pkmn.maxHp;
    pkmn.maxHp = newStats.hp;
    pkmn.currentHp = Math.min(pkmn.maxHp, pkmn.currentHp + hpGain);
    pkmn.stats = newStats;
    messages.push(`${pkmn.pokemon.name} è salito al livello ${pkmn.level}!`);
    xpForNext = Math.pow(pkmn.level + 1, 3);
  }

  return messages;
}

import { Injectable } from '@angular/core';
import { Pokemon } from '../models/pokemon.model';
import { BattleMove, BattleStats } from '../models/battle.model';

const POKEAPI = 'https://pokeapi.co/api/v2';

const GEN1_BASE_IDS = new Set([
  1, 4, 7, 10, 13, 16, 19, 21, 23, 25, 27, 29, 32, 35, 37, 39, 41, 43, 46,
  48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 74, 77, 79, 81, 83, 84, 86,
  88, 90, 92, 95, 96, 98, 100, 102, 104, 106, 107, 108, 109, 111, 113, 114,
  115, 116, 118, 120, 122, 123, 124, 125, 126, 127, 128, 129, 131, 132, 133,
  137, 138, 140, 142, 143, 144, 145, 146, 147, 150, 151,
]);

const STAT_NAMES: Record<string, keyof BattleStats> = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
};

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private moveCache = new Map<string, BattleMove>();

  async getSpeciesByHabitat(habitatId: number): Promise<number[]> {
    const res = await fetch(`${POKEAPI}/pokemon-habitat/${habitatId}/`);
    const data = await res.json();
    return data.pokemon_species
      .map((s: { url: string }) => {
        const match = s.url.match(/\/pokemon-species\/(\d+)\//);
        return match ? +match[1] : null;
      })
      .filter(
        (id: number | null) =>
          id !== null && id <= 151 && GEN1_BASE_IDS.has(id),
      );
  }

  async getPokemonById(id: number, signal?: AbortSignal): Promise<Pokemon> {
    const res = await fetch(`${POKEAPI}/pokemon/${id}`, { signal });
    return res.json();
  }

  async getMoveDetails(name: string): Promise<BattleMove> {
    if (this.moveCache.has(name)) return this.moveCache.get(name)!;

    const res = await fetch(`${POKEAPI}/move/${name}/`);
    const data = await res.json();

    const move: BattleMove = {
      name: data.name,
      power: data.power ?? 0,
      accuracy: data.accuracy ?? 100,
      pp: data.pp ?? 10,
      maxPp: data.pp ?? 10,
      type: data.type?.name ?? 'normal',
      damageClass:
        data.damage_class?.name === 'physical'
          ? 'physical'
          : data.damage_class?.name === 'special'
            ? 'special'
            : 'status',
    };

    this.moveCache.set(name, move);
    return move;
  }

  async getLevelUpMoves(
    pokemon: Pokemon,
    level: number,
  ): Promise<BattleMove[]> {
    const movesList = pokemon.moves ?? [];
    const levelUpMoves = movesList
      .filter((m: { version_group_details: { move_learn_method: { name: string }; level_learned_at: number }[] }) =>
        m.version_group_details.some(
          (d: { move_learn_method: { name: string }; level_learned_at: number }) =>
            d.move_learn_method.name === 'level-up' &&
            d.level_learned_at <= level,
        ),
      )
      .map((m: { move: { name: string }; version_group_details: { move_learn_method: { name: string }; level_learned_at: number }[] }) => ({
        name: m.move.name,
        learnedAt: Math.max(
          ...m.version_group_details
            .filter((d: { move_learn_method: { name: string }; level_learned_at: number }) => d.move_learn_method.name === 'level-up')
            .map((d: { level_learned_at: number }) => d.level_learned_at),
        ),
      }))
      .sort((a: { learnedAt: number }, b: { learnedAt: number }) => b.learnedAt - a.learnedAt)
      .slice(0, 4);

    const moves = await Promise.all(
      levelUpMoves.map((m) => this.getMoveDetails(m.name)),
    );

    if (moves.length === 0) {
      moves.push({
        name: 'struggle',
        power: 50,
        accuracy: 100,
        pp: 99,
        maxPp: 99,
        type: 'normal',
        damageClass: 'physical',
      });
    }

    return moves;
  }

  calcStats(baseStats: BattleStats, level: number): BattleStats {
    const iv = 15;
    const calc = (base: number) =>
      Math.floor(((2 * base + iv) * level) / 100) + 5;
    const calcHp = (base: number) =>
      Math.floor(((2 * base + iv) * level) / 100) + level + 10;

    return {
      hp: calcHp(baseStats.hp),
      attack: calc(baseStats.attack),
      defense: calc(baseStats.defense),
      specialAttack: calc(baseStats.specialAttack),
      specialDefense: calc(baseStats.specialDefense),
      speed: calc(baseStats.speed),
    };
  }

  extractBaseStats(pokemon: Pokemon): BattleStats {
    const stats: Record<string, number> = {};
    for (const s of pokemon.stats ?? []) {
      stats[s.stat.name] = s.base_stat;
    }
    return {
      hp: stats['hp'] ?? 50,
      attack: stats['attack'] ?? 50,
      defense: stats['defense'] ?? 50,
      specialAttack: stats['special-attack'] ?? 50,
      specialDefense: stats['special-defense'] ?? 50,
      speed: stats['speed'] ?? 50,
    };
  }

  getTypeEffectiveness(
    moveType: string,
    defenderTypes: string[],
  ): number {
    const chart: Record<string, Record<string, number>> = {
      normal: { rock: 0.5, ghost: 0, steel: 0.5 },
      fire: {
        fire: 0.5,
        water: 0.5,
        grass: 2,
        ice: 2,
        bug: 2,
        rock: 0.5,
        dragon: 0.5,
        steel: 2,
      },
      water: {
        fire: 2,
        water: 0.5,
        grass: 0.5,
        ground: 2,
        rock: 2,
        dragon: 0.5,
      },
      electric: {
        water: 2,
        electric: 0.5,
        grass: 0.5,
        ground: 0,
        flying: 2,
        dragon: 0.5,
      },
      grass: {
        fire: 0.5,
        water: 2,
        grass: 0.5,
        poison: 0.5,
        ground: 2,
        flying: 0.5,
        bug: 0.5,
        rock: 2,
        dragon: 0.5,
        steel: 0.5,
      },
      ice: {
        fire: 0.5,
        water: 0.5,
        grass: 2,
        ice: 0.5,
        ground: 2,
        flying: 2,
        dragon: 2,
        steel: 0.5,
      },
      fighting: {
        normal: 2,
        ice: 2,
        poison: 0.5,
        flying: 0.5,
        psychic: 0.5,
        bug: 0.5,
        rock: 2,
        ghost: 0,
        steel: 2,
        fairy: 0.5,
      },
      poison: {
        grass: 2,
        poison: 0.5,
        ground: 0.5,
        rock: 0.5,
        ghost: 0.5,
        steel: 0,
        fairy: 2,
      },
      ground: {
        fire: 2,
        electric: 2,
        grass: 0.5,
        poison: 2,
        flying: 0,
        bug: 0.5,
        rock: 2,
        steel: 2,
      },
      flying: {
        electric: 0.5,
        grass: 2,
        fighting: 2,
        bug: 2,
        rock: 0.5,
        steel: 0.5,
      },
      psychic: {
        fighting: 2,
        poison: 2,
        psychic: 0.5,
        dark: 0,
        steel: 0.5,
      },
      bug: {
        fire: 0.5,
        grass: 2,
        fighting: 0.5,
        poison: 0.5,
        flying: 0.5,
        psychic: 2,
        ghost: 0.5,
        dark: 2,
        steel: 0.5,
        fairy: 0.5,
      },
      rock: {
        fire: 2,
        ice: 2,
        fighting: 0.5,
        ground: 0.5,
        flying: 2,
        bug: 2,
        steel: 0.5,
      },
      ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
      dragon: { dragon: 2, steel: 0.5, fairy: 0 },
      dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
      steel: {
        fire: 0.5,
        water: 0.5,
        electric: 0.5,
        ice: 2,
        rock: 2,
        steel: 0.5,
        fairy: 2,
      },
      fairy: {
        fire: 0.5,
        fighting: 2,
        poison: 0.5,
        dragon: 2,
        dark: 2,
        steel: 0.5,
      },
    };

    let multiplier = 1;
    const typeChart = chart[moveType];
    if (typeChart) {
      for (const defType of defenderTypes) {
        const m = typeChart[defType];
        if (m !== undefined) multiplier *= m;
      }
    }
    return multiplier;
  }
}

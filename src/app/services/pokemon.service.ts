import { Injectable } from '@angular/core';
import { Pokemon } from '../models/pokemon.model';

const POKEAPI = 'https://pokeapi.co/api/v2';

const GEN1_BASE_IDS = new Set([
  1, 4, 7, 10, 13, 16, 19, 21, 23, 25, 27, 29, 32, 35, 37, 39, 41, 43, 46,
  48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 74, 77, 79, 81, 83, 84, 86,
  88, 90, 92, 95, 96, 98, 100, 102, 104, 106, 107, 108, 109, 111, 113, 114,
  115, 116, 118, 120, 122, 123, 124, 125, 126, 127, 128, 129, 131, 132, 133,
  137, 138, 140, 142, 143, 144, 145, 146, 147, 150, 151,
]);

@Injectable({ providedIn: 'root' })
export class PokemonService {
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
}

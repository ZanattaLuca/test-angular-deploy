import { TeamPokemon } from './battle.model';

export interface Item {
  id: string;
  name: string;
  quantity: number;
}

export interface Trainer {
  name: string;
  pokemon: TeamPokemon[];
  inventory: Item[];
}

export function createDefaultTrainer(name: string = 'Trainer'): Trainer {
  return {
    name,
    pokemon: [],
    inventory: [
      { id: 'poke-ball', name: 'Poké Ball', quantity: 10 },
    ],
  };
}

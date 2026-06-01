import { Pokemon } from './pokemon.model';

export interface Item {
  id: string;
  name: string;
  quantity: number;
}

export interface Trainer {
  name: string;
  pokemon: Pokemon[];
  inventory: Item[];
}

export function createDefaultTrainer(name: string = 'Trainer'): Trainer {
  return {
    name,
    pokemon: [],
    inventory: [],
  };
}

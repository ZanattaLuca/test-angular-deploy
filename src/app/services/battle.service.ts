import { Injectable, signal, computed } from '@angular/core';
import { AREAS, Area } from '../models/area.model';
import { Pokemon } from '../models/pokemon.model';
import { Trainer, createDefaultTrainer } from '../models/trainer.model';

export type GamePhase =
  | 'intro'
  | 'area'
  | 'encounter'
  | 'action'
  | 'result';

@Injectable({ providedIn: 'root' })
export class BattleService {
  readonly phase = signal<GamePhase>('intro');
  readonly currentArea = signal<Area>(AREAS['forest']);
  readonly visitedAreas = signal<string[]>([]);
  readonly currentPokemon = signal<Pokemon | null>(null);
  readonly trainer = signal<Trainer>(createDefaultTrainer());
  readonly team = computed(() => this.trainer().pokemon);

  goToArea(areaId: string): void {
    const area = AREAS[areaId];
    if (!area) return;
    this.currentArea.set(area);
    this.visitedAreas.update((v) =>
      v.includes(areaId) ? v : [...v, areaId],
    );
    this.phase.set('area');
  }

  startEncounter(): void {
    this.currentPokemon.set(null);
    this.phase.set('encounter');
  }

  setPokemon(data: Pokemon | null): void {
    this.currentPokemon.set(data);
    if (data) this.phase.set('action');
  }

  setPhase(phase: GamePhase): void {
    this.phase.set(phase);
  }

  capturePokemon(pokemon: Pokemon): void {
    this.trainer.update((t) => {
      if (t.pokemon.find((p) => p.id === pokemon.id)) return t;
      return { ...t, pokemon: [...t.pokemon, pokemon] };
    });
  }

  hasPokemon(id: number): boolean {
    return this.trainer().pokemon.some((p) => p.id === id);
  }

  dismissPokemon(): void {
    this.currentPokemon.set(null);
    this.phase.set('encounter');
  }
}

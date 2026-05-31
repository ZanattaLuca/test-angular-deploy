import { Injectable, signal } from '@angular/core';
import { AREAS, Area } from '../models/area.model';
import { Pokemon } from '../models/pokemon.model';

export type GamePhase = 'intro' | 'area' | 'encounter' | 'action' | 'result';

@Injectable({ providedIn: 'root' })
export class BattleService {
  readonly phase = signal<GamePhase>('intro');
  readonly currentArea = signal<Area>(AREAS['forest']);
  readonly visitedAreas = signal<string[]>([]);
  readonly currentPokemon = signal<Pokemon | null>(null);

  goToArea(areaId: string): void {
    const area = AREAS[areaId];
    if (!area) return;
    this.currentArea.set(area);
    this.visitedAreas.update(v =>
      v.includes(areaId) ? v : [...v, areaId]
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
}

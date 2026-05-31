import { Component, inject, OnDestroy, signal } from '@angular/core';
import { BattleService } from '../../services/battle.service';
import { Pokemon } from '../../models/pokemon.model';
import { CoinComponent } from '../coin/coin';

const TYPE_COLORS: Record<string, string> = {
  normal:'#A8A77A',fire:'#EE8130',water:'#6390F0',
  electric:'#F7D02C',grass:'#7AC74C',ice:'#96D9D6',
  fighting:'#C22E28',poison:'#A33EA1',ground:'#E2BF65',
  flying:'#A98FF3',psychic:'#F95587',bug:'#A6B91A',
  rock:'#B6A136',ghost:'#735797',dragon:'#6F35FC',
  dark:'#705746',steel:'#B7B7CE',fairy:'#D685AD',
};

@Component({
  selector: 'app-encounter',
  standalone: true,
  imports: [CoinComponent],
  templateUrl: './encounter.html',
  styleUrl: './encounter.css',
})
export class EncounterComponent implements OnDestroy {
  private battle = inject(BattleService);

  readonly species = signal<number[]>([]);
  readonly loading = signal(false);
  readonly searching = signal(false);
  readonly error = signal('');
  private abortController: AbortController | null = null;

  readonly phase = this.battle.phase;
  readonly pokemon = this.battle.currentPokemon;

  constructor() {
    this.loadSpecies();
  }

  ngOnDestroy(): void {
    this.abortController?.abort();
  }

  private async loadSpecies(): Promise<void> {
    const area = this.battle.currentArea();
    if (!area) return;

    this.loading.set(true);
    this.error.set('');

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon-habitat/${area.habitat}/`);
      const data = await res.json();

      this.species.set(
        data.pokemon_species
          .map((s: { url: string }) => {
            const match = s.url.match(/\/pokemon-species\/(\d+)\//);
            return match ? +match[1] : null;
          })
          .filter((id: number | null) => id !== null && id <= 151)
      );

      if (this.species().length === 0) {
        this.error.set('Nessun Pokémon trovato in questa zona.');
      }
    } catch {
      this.error.set('Errore nel caricamento dei Pokémon.');
    } finally {
      this.loading.set(false);
    }
  }

  async search(): Promise<void> {
    if (this.searching() || this.species().length === 0) return;
    if (this.battle.phase() === 'action' || this.battle.phase() === 'result') return;

    this.searching.set(true);
    this.battle.setPokemon(null);

    const id = this.species()[Math.floor(Math.random() * this.species().length)];
    this.abortController = new AbortController();

    try {
      const [data] = await Promise.all([
        fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, {
          signal: this.abortController.signal,
        }).then(r => r.json() as Promise<Pokemon>),
        new Promise<void>(r => setTimeout(r, 2000)),
      ]);

      this.battle.setPokemon(data);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      this.error.set('Errore! Riprova.');
    } finally {
      this.searching.set(false);
      this.abortController = null;
    }
  }

  goBack(): void {
    this.battle.goToArea(this.battle.currentArea().id);
  }

  continueArea(): void {
    this.battle.goToArea(this.battle.currentArea().id);
  }

  getTypeColor(type: string): string {
    return TYPE_COLORS[type] || '#999';
  }
}

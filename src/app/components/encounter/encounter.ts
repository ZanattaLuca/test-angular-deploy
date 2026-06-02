import { Component, inject, OnDestroy, signal } from '@angular/core';
import { BattleService } from '../../services/battle';
import { PokemonService } from '../../services/pokemon.service';
import { Pokemon, TYPE_COLORS } from '../../models/pokemon.model';
import { CoinComponent } from '../coin/coin';

type PopupType =
  | 'capture_success'
  | 'capture_fail'
  | 'flee_success'
  | 'flee_fail';

@Component({
  selector: 'app-encounter',
  standalone: true,
  imports: [CoinComponent],
  templateUrl: './encounter.html',
  styleUrl: './encounter.css',
})
export class EncounterComponent implements OnDestroy {
  private battle = inject(BattleService);
  private pokemonService = inject(PokemonService);

  readonly species = signal<number[]>([]);
  readonly loading = signal(false);
  readonly searching = signal(false);
  readonly error = signal('');
  private abortController: AbortController | null = null;

  readonly phase = this.battle.phase;
  readonly pokemon = this.battle.currentPokemon;
  readonly team = this.battle.team;
  readonly playerHp = this.battle.playerHp;
  readonly playerMaxHp = this.battle.playerMaxHp;

  readonly popup = signal<PopupType | null>(null);
  readonly coinDisabled = signal(false);
  readonly wildLevel = signal(5);

  constructor() {
    this.loadSpecies();
  }

  ngOnDestroy(): void {
    this.abortController?.abort();
  }

  get isFirstEncounter(): boolean {
    return this.battle.isFirst;
  }

  private async loadSpecies(): Promise<void> {
    const area = this.battle.currentArea();
    if (!area) return;

    this.loading.set(true);
    this.error.set('');

    try {
      const ids = await this.pokemonService.getSpeciesByHabitat(area.habitat);
      this.species.set(ids);

      if (ids.length === 0) {
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
    if (
      this.battle.phase() === 'action' ||
      this.battle.phase() === 'result'
    )
      return;

    this.searching.set(true);
    this.battle.setPokemon(null);

    const id =
      this.species()[Math.floor(Math.random() * this.species().length)];
    this.abortController = new AbortController();

    try {
      const [data] = await Promise.all([
        this.pokemonService.getPokemonById(id, this.abortController.signal),
        new Promise<void>((r) => setTimeout(r, 2000)),
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

  async onCaptureResult(success: boolean): Promise<void> {
    this.coinDisabled.set(true);
    if (success) {
      const pkmn = this.pokemon()!;
      await this.battle.capturePokemonAsTeam(pkmn, this.wildLevel());
      this.popup.set('capture_success');
    } else {
      this.popup.set('capture_fail');
    }
  }

  onFleeResult(success: boolean): void {
    this.coinDisabled.set(true);
    this.popup.set(success ? 'flee_success' : 'flee_fail');
  }

  onFirstFleeResult(success: boolean): void {
    this.coinDisabled.set(true);
    if (success) {
      this.popup.set('flee_success');
    } else {
      const dmg = 4 + Math.floor(Math.random() * 5);
      this.battle.playerHp.update((h) => Math.max(0, h - dmg));
      if (this.battle.playerHp() <= 0) {
        this.battle.gameOver.set(true);
        this.battle.gameOverMessage.set(
          'Hai preso una bella botta e decidi che fare l\'allenatore non fa per te. Meglio fare il falegname.',
        );
        this.battle.phase.set('gameover');
      } else {
        this.popup.set('flee_fail');
      }
    }
  }

  dismissPopup(): void {
    const p = this.popup();
    this.popup.set(null);
    this.coinDisabled.set(false);

    if (p === 'capture_success') {
      this.battle.setPhase('result');
    } else if (p === 'capture_fail') {
      this.battle.dismissPokemon();
    } else {
      this.battle.setPhase('result');
    }
  }

  async goToBattle(): Promise<void> {
    const pkmn = this.pokemon();
    if (!pkmn) return;
    const aliveCount = this.team().filter((p) => p.currentHp > 0).length;
    if (aliveCount === 0) return;
    await this.battle.startBattle(pkmn, this.wildLevel());
  }

  goBack(): void {
    this.battle.goToArea(this.battle.currentArea().id);
  }

  continueArea(): void {
    this.battle.goToArea(this.battle.currentArea().id);
  }

  isAlreadyCaught(): boolean {
    return false;
  }

  getTypeColor(type: string): string {
    return TYPE_COLORS[type] || '#999';
  }
}

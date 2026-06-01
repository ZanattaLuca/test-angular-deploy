import { Component, inject, signal } from '@angular/core';
import { BattleService } from '../../services/battle.service';
import { TYPE_COLORS } from '../../models/pokemon.model';
import { STATUS_NAMES } from '../../models/battle.model';
import { CoinComponent } from '../coin/coin';
import { WheelComponent } from '../wheel/wheel';

@Component({
  selector: 'app-battle',
  standalone: true,
  imports: [CoinComponent, WheelComponent],
  templateUrl: './battle.html',
  styleUrl: './battle.css',
})
export class BattleComponent {
  private battle = inject(BattleService);

  readonly StatusNames = STATUS_NAMES;

  readonly enemyPkmn = this.battle.enemyPokemon;
  readonly activePkmn = this.battle.activePokemon;
  readonly activeIndex = this.battle.activePokemonIndex;
  readonly subPhase = this.battle.battleSubPhase;
  readonly busy = this.battle.battleBusy;
  readonly log = this.battle.battleLog;
  readonly team = this.battle.team;
  readonly pokeballs = this.battle.pokeballs;

  readonly catchSegments = signal(1);
  readonly showCatchWheel = signal(false);
  readonly catchingResult = signal<string | null>(null);
  readonly catching = signal(false);

  getTypeColor(type: string): string {
    return TYPE_COLORS[type] || '#999';
  }

  hpPercent(current: number, max: number): number {
    return max > 0 ? (current / max) * 100 : 0;
  }

  hpBarColor(percent: number): string {
    if (percent > 50) return '#2ecc71';
    if (percent > 20) return '#f39c12';
    return '#e74c3c';
  }

  xpPercent(): number {
    const p = this.activePkmn();
    if (!p) return 0;
    const needed = Math.pow(p.level + 1, 3);
    return Math.min(100, (p.currentXp / needed) * 100);
  }

  xpForNext(): number {
    const p = this.activePkmn();
    return p ? Math.pow(p.level + 1, 3) : 0;
  }

  onFight(): void {
    this.battle.battleSubPhase.set('fight');
  }

  onItem(): void {
    this.battle.battleSubPhase.set('item');
  }

  onPokemon(): void {
    this.battle.battleSubPhase.set('pokemon');
  }

  onFlee(): void {
    this.battle.battleSubPhase.set('flee');
  }

  onBack(): void {
    this.battle.battleSubPhase.set('idle');
    this.showCatchWheel.set(false);
    this.catchingResult.set(null);
  }

  async useMove(i: number): Promise<void> {
    await this.battle.useMove(i);
  }

  async switchTo(i: number): Promise<void> {
    await this.battle.switchPokemon(i);
  }

  openCatch(): void {
    const enemy = this.enemyPkmn();
    if (!enemy) return;
    const hpRemaining = 1 - enemy.currentHp / enemy.maxHp;
    let segs = Math.round(14 * hpRemaining * hpRemaining + 3 * hpRemaining + 1);
    if (enemy.status) segs = 18;
    segs = Math.min(20, Math.max(1, segs));
    this.catchSegments.set(segs);
    this.showCatchWheel.set(true);
    this.catching.set(true);
  }

  onCatchResult(success: boolean): void {
    this.catching.set(false);
    this.catchingResult.set(
      success ? 'Catturato!' : 'Sfuggito...',
    );
    if (success) {
      setTimeout(async () => {
        await this.battle.onPokeballResult(true);
      }, 1200);
    } else {
      setTimeout(() => {
        this.showCatchWheel.set(false);
        this.catchingResult.set(null);
        this.battle.onPokeballResult(false);
      }, 1200);
    }
  }

  onFleeCoinResult(success: boolean): void {
    if (success) {
      this.battle.addBattleLog('Sei scappato!', 'player');
      this.battle.endBattle();
      this.battle.setPhase('result');
    } else {
      this.battle.onFleeFailed();
    }
  }
}

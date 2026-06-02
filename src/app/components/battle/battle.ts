import { Component, inject, signal } from '@angular/core';
import { BattleService, TypeDiceRoll } from '../../services/battle';
import { TYPE_COLORS } from '../../models/pokemon.model';
import { STATUS_NAMES } from '../../models/battle.model';
import { DiceSize } from '../../models/evolution-data';
import { CoinComponent } from '../coin/coin';
import { WheelComponent } from '../wheel/wheel';
import { DiceRollComponent } from '../dice-roll/dice-roll';

@Component({
  selector: 'app-battle',
  standalone: true,
  imports: [CoinComponent, WheelComponent, DiceRollComponent],
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
  readonly phase = this.battle.phase;

  readonly catchSegments = signal(1);
  readonly showCatchWheel = signal(false);
  readonly catchingResult = signal<string | null>(null);
  readonly catching = signal(false);

  readonly dicePhase = signal<'hidden' | 'rolling' | 'revealed'>('hidden');
  readonly diceRolls = signal<TypeDiceRoll[] | null>(null);
  readonly diceOwner = signal<'none' | 'player' | 'enemy'>('none');

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

  diceLabel(size: DiceSize): string {
    return size.toUpperCase();
  }

  async onAttack(): Promise<void> {
    if (this.busy()) return;

    this.diceOwner.set('player');
    this.dicePhase.set('rolling');
    this.diceRolls.set(null);

    const minDelay = new Promise<void>((r) => setTimeout(r, 600));
    const [rolls] = await Promise.all([this.battle.playerAttack(), minDelay]);

    if (rolls) {
      this.diceRolls.set(rolls);
      this.dicePhase.set('revealed');
      return;
    }

    if (this.shouldEnemyAct()) {
      await this.runEnemyAttack();
    } else {
      this.dicePhase.set('hidden');
      this.diceOwner.set('none');
    }
  }

  async dismissDice(): Promise<void> {
    if (this.dicePhase() !== 'revealed') return;
    this.dicePhase.set('hidden');
    this.diceRolls.set(null);

    if (this.diceOwner() === 'player' && this.shouldEnemyAct()) {
      await this.runEnemyAttack();
      return;
    }

    this.diceOwner.set('none');
    this.battle.battleBusy.set(false);
  }

  private async runEnemyAttack(): Promise<void> {
    this.diceOwner.set('enemy');
    this.dicePhase.set('rolling');
    this.diceRolls.set(null);

    const minDelay = new Promise<void>((r) => setTimeout(r, 600));
    const [rolls] = await Promise.all([this.battle.enemyAttack(), minDelay]);

    if (rolls) {
      this.diceRolls.set(rolls);
      this.dicePhase.set('revealed');
    } else {
      this.dicePhase.set('hidden');
      this.diceOwner.set('none');
    }
  }

  private shouldEnemyAct(): boolean {
    return (
      this.enemyPkmn() !== null &&
      this.phase() === 'battle' &&
      !this.battle.gameOver()
    );
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

  async switchTo(i: number): Promise<void> {
    await this.battle.switchPokemon(i);
  }

  openCatch(): void {
    const enemy = this.enemyPkmn();
    if (!enemy) return;
    const hpRemaining = 1 - enemy.currentHp / enemy.maxHp;
    let segs = Math.round(
      14 * hpRemaining * hpRemaining + 3 * hpRemaining + 1,
    );
    if (enemy.status) segs = 18;
    segs = Math.min(20, Math.max(1, segs));
    this.catchSegments.set(segs);
    this.showCatchWheel.set(true);
    this.catching.set(true);
  }

  onCatchResult(success: boolean): void {
    this.catching.set(false);
    this.catchingResult.set(success ? 'Catturato!' : 'Sfuggito...');
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

  getCurrentDiceTypes(): string[] {
    if (this.diceOwner() === 'player') {
      const p = this.activePkmn();
      if (!p) return [];
      return p.pokemon.types.map((t) => t.type.name);
    }
    if (this.diceOwner() === 'enemy') {
      const e = this.enemyPkmn();
      if (!e) return [];
      return e.pokemon.types.map((t) => t.type.name);
    }
    return [];
  }

  getCurrentDiceSize(): DiceSize {
    if (this.diceOwner() === 'player') {
      return this.activePkmn()?.diceSize ?? 'd6';
    }
    if (this.diceOwner() === 'enemy') {
      return this.enemyPkmn()?.diceSize ?? 'd6';
    }
    return 'd6';
  }

  getActivePkmnTypes(): string[] {
    const p = this.activePkmn();
    if (!p) return [];
    return p.pokemon.types.map((t) => t.type.name);
  }
}

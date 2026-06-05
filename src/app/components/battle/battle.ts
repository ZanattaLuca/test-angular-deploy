import { Component, inject, signal, viewChild } from '@angular/core';
import { BattleService, TypeDiceRoll } from '../../services/battle';
import { PokemonService } from '../../services/pokemon.service';
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
  private pokemonService = inject(PokemonService);

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
  readonly switchAfterFaint = this.battle.switchAfterFaint;

  readonly catchSegments = signal(1);
  readonly showCatchWheel = signal(false);
  readonly catchingResult = signal<string | null>(null);
  readonly catching = signal(false);
  readonly wheelSpinning = signal(false);
  readonly catchWheel = viewChild(WheelComponent);

  readonly dicePhase = signal<'hidden' | 'rolling' | 'revealed'>('hidden');
  readonly diceRolls = signal<TypeDiceRoll[] | null>(null);
  readonly diceOwner = signal<'none' | 'player' | 'enemy'>('none');
  readonly advantageFlags = signal<boolean[]>([]);
  readonly disadvantageFlags = signal<boolean[]>([]);

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

  private computeFlags(atkTypes: string[], defTypes: string[]): void {
    this.advantageFlags.set(atkTypes.map((t) => this.pokemonService.isSuperEffective(t, defTypes)));
    this.disadvantageFlags.set(atkTypes.map((t) => this.pokemonService.isNotVeryEffective(t, defTypes)));
  }

  private getDefenderTypes(): string[] {
    if (this.diceOwner() === 'player') {
      const e = this.enemyPkmn();
      return e ? e.pokemon.types.map((t) => t.type.name) : [];
    }
    const p = this.activePkmn();
    return p ? p.pokemon.types.map((t) => t.type.name) : [];
  }

  async onAttack(): Promise<void> {
    if (this.busy()) return;

    this.diceOwner.set('player');
    const atkTypes = this.getCurrentDiceTypes();
    const defTypes = this.getDefenderTypes();
    this.computeFlags(atkTypes, defTypes);
    this.dicePhase.set('rolling');
    this.diceRolls.set(null);

    const minDelay = new Promise<void>((r) => setTimeout(r, 900));
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

    await this.battle.resolveAttack();

    if (this.phase() !== 'battle') return;

    if (this.diceOwner() === 'player' && this.shouldEnemyAct()) {
      await this.runEnemyAttack();
      return;
    }

    this.diceOwner.set('none');
    this.battle.battleBusy.set(false);
  }

  private async runEnemyAttack(): Promise<void> {
    this.diceOwner.set('enemy');
    const atkTypes = this.getCurrentDiceTypes();
    const defTypes = this.getDefenderTypes();
    this.computeFlags(atkTypes, defTypes);
    this.dicePhase.set('rolling');
    this.diceRolls.set(null);

    const minDelay = new Promise<void>((r) => setTimeout(r, 900));
    const [rolls] = await Promise.all([this.battle.deferredEnemyAttack(), minDelay]);

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
      this.enemyPkmn()!.currentHp > 0 &&
      this.activePkmn() !== null &&
      this.activePkmn()!.currentHp > 0 &&
      this.phase() === 'battle' &&
      !this.battle.gameOver()
    );
  }

  onCapture(): void {
    if (this.busy()) return;
    this.openCatch();
  }

  launchBall(): void {
    if (this.pokeballs() === 0 || this.wheelSpinning()) return;
    this.wheelSpinning.set(true);
    const wheel = this.catchWheel();
    if (wheel) wheel.spin();
  }

  exitCapture(): void {
    const result = this.catchingResult();
    if (result) {
      this.battle.onPokeballResult(result === 'Caught!');
    }
    this.showCatchWheel.set(false);
    this.catching.set(false);
    this.catchingResult.set(null);
    this.wheelSpinning.set(false);
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
    this.showCatchWheel.set(false);
    this.catching.set(false);
    this.catchingResult.set(null);
    this.wheelSpinning.set(false);
    this.battle.battleSubPhase.set('idle');
  }

  async switchTo(i: number): Promise<void> {
    const ok = await this.battle.switchPokemon(i);
    if (!ok) return;

    if (this.battle.switchAfterFaint()) {
      this.battle.switchAfterFaint.set(false);
      this.battle.battleSubPhase.set('idle');
      return;
    }

    if (this.shouldEnemyAct()) {
      await this.runEnemyAttack();
    }
  }

  openCatch(): void {
    const enemy = this.enemyPkmn();
    if (!enemy) return;
    const hpRemaining = 1 - enemy.currentHp / enemy.maxHp;
    let segs = Math.round(hpRemaining * 10) + 1;
    if (enemy.status) segs = 11;
    segs = Math.min(12, Math.max(1, segs));
    this.catchSegments.set(segs);
    this.showCatchWheel.set(true);
    this.catching.set(true);
    this.wheelSpinning.set(false);
    this.catchingResult.set(null);
  }

  onCatchResult(success: boolean): void {
    this.catching.set(false);
    this.wheelSpinning.set(false);
    this.catchingResult.set(success ? 'Caught!' : 'Escaped...');
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
      const types = p.pokemon.types.map((t) => t.type.name);
      return types.length === 1 ? [types[0], types[0]] : types;
    }
    if (this.diceOwner() === 'enemy') {
      const e = this.enemyPkmn();
      if (!e) return [];
      const types = e.pokemon.types.map((t) => t.type.name);
      return types.length === 1 ? [types[0], types[0]] : types;
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
    const types = p.pokemon.types.map((t) => t.type.name);
    return types.length === 1 ? [types[0], types[0]] : types;
  }

  getEnemyPkmnTypes(): string[] {
    const e = this.enemyPkmn();
    if (!e) return [];
    const types = e.pokemon.types.map((t) => t.type.name);
    return types.length === 1 ? [types[0], types[0]] : types;
  }
}

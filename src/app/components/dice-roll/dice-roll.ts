import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { TYPE_COLORS } from '../../models/pokemon.model';
import { DiceSize } from '../../models/evolution-data';

export interface DiceDisplayRoll {
  type: string;
  diceSize: DiceSize;
  advantage: boolean;
  disadvantage: boolean;
  result: number;
  rollA: number;
  rollB: number | null;
}

@Component({
  selector: 'app-dice-roll',
  standalone: true,
  imports: [],
  templateUrl: './dice-roll.html',
  styleUrl: './dice-roll.css',
})
export class DiceRollComponent implements OnChanges {
  @Input() rolls: DiceDisplayRoll[] | null = null;
  @Input() rolling = false;
  @Input() diceTypes: string[] = [];
  @Input() diceSize: DiceSize = 'd6';
  @Input() advantageFlags: boolean[] = [];
  @Input() disadvantageFlags: boolean[] = [];
  @Input() pokemonSprite: string | null = null;
  @Input() spriteBorder: 'ally' | 'enemy' | null = null;

  displayValues = signal<number[]>([]);
  private interval: ReturnType<typeof setInterval> | null = null;

  readonly DICE_MAX: Record<DiceSize, number> = { d6: 6, d8: 8, d10: 10, d12: 12 };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rolling']) {
      if (this.rolling) {
        this.startRolling();
      } else {
        this.stopRolling();
      }
    }
  }

  private startRolling(): void {
    this.stopRolling();
    const count = this.getDisplayDice().length;
    this.displayValues.set(new Array(count).fill(0));
    this.interval = setInterval(() => {
      this.displayValues.update((vals) =>
        vals.map(() => Math.floor(Math.random() * 12) + 1),
      );
    }, 80);
  }

  private stopRolling(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getTypeColor(type: string): string {
    return TYPE_COLORS[type] || '#999';
  }

  getDisplayDice(): DiceDisplayRoll[] {
    if (this.rolls) return this.rolls;
    if (this.rolling) {
      const result: DiceDisplayRoll[] = [];
      this.diceTypes.forEach((type, i) => {
        const adv = this.advantageFlags[i] || false;
        const dis = this.disadvantageFlags[i] || false;
        const paired = adv || dis;
        if (paired) {
          result.push({ type, diceSize: this.diceSize, advantage: adv, disadvantage: dis, result: 0, rollA: 0, rollB: null });
          result.push({ type, diceSize: this.diceSize, advantage: adv, disadvantage: dis, result: 0, rollA: 0, rollB: null });
        } else {
          result.push({ type, diceSize: this.diceSize, advantage: false, disadvantage: false, result: 0, rollA: 0, rollB: null });
        }
      });
      return result;
    }
    return [];
  }

  getTotalDamage(): number {
    if (!this.rolls) return 0;
    return this.rolls.reduce((s, r) => s + r.result, 0);
  }

  ngOnDestroy(): void {
    this.stopRolling();
  }
}

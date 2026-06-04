import { Component, inject, signal } from '@angular/core';
import { BattleService } from '../../services/battle';
import { TYPE_COLORS } from '../../models/pokemon.model';
import { TeamPokemon } from '../../models/battle.model';
import { DiceSize } from '../../models/evolution-data';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [],
  templateUrl: './team.html',
  styleUrl: './team.css',
})
export class TeamComponent {
  private battle = inject(BattleService);

  readonly trainer = this.battle.trainer;
  readonly team = this.battle.team;

  isOpen = signal(false);
  draggingIndex = signal<number | null>(null);
  dragOverIndex = signal<number | null>(null);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  getTypeColor(type: string): string {
    return TYPE_COLORS[type] || '#999';
  }

  diceLabel(size: DiceSize): string {
    return size.toUpperCase();
  }

  getPkmnDiceTypes(tp: TeamPokemon): string[] {
    const types = tp.pokemon.types.map((t) => t.type.name);
    return types.length === 1 ? [types[0], types[0]] : types;
  }

  hpPercent(current: number, max: number): number {
    return max > 0 ? (current / max) * 100 : 0;
  }

  hpBarColor(percent: number): string {
    if (percent > 50) return '#2ecc71';
    if (percent > 20) return '#f39c12';
    return '#e74c3c';
  }

  onDragStart(event: DragEvent, index: number): void {
    this.draggingIndex.set(index);
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', index.toString());
    const el = event.target as HTMLElement;
    el.classList.add('dragging');
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dragOverIndex.set(index);
  }

  onDrop(event: DragEvent, toIndex: number): void {
    event.preventDefault();
    this.dragOverIndex.set(null);
    const fromIndex = parseInt(event.dataTransfer!.getData('text/plain'), 10);
    if (isNaN(fromIndex) || fromIndex === toIndex) return;
    this.battle.reorderTeam(fromIndex, toIndex);
  }

  onDragEnd(): void {
    this.draggingIndex.set(null);
    this.dragOverIndex.set(null);
  }
}

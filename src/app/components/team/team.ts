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

  touchDragging = signal(false);
  touchFromIndex = signal<number | null>(null);
  private touchStartY = 0;
  private touchCardHeight = 0;
  private dragEl: HTMLElement | null = null;

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

  onTouchStart(event: TouchEvent, index: number): void {
    const touch = event.touches[0];
    this.touchStartY = touch.clientY;
    this.touchFromIndex.set(index);
    this.touchDragging.set(false);
    this.dragOverIndex.set(null);
    this.dragEl = (event.currentTarget as HTMLElement).closest('.team-card') as HTMLElement;
    if (this.dragEl) {
      this.touchCardHeight = this.dragEl.offsetHeight + 8; /* gap */
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (this.touchFromIndex() === null) return;

    const touch = event.touches[0];
    const deltaY = touch.clientY - this.touchStartY;

    if (!this.touchDragging()) {
      if (Math.abs(deltaY) > 8) {
        this.touchDragging.set(true);
        this.draggingIndex.set(this.touchFromIndex());
      } else {
        return;
      }
    }

    const fromIdx = this.touchFromIndex()!;
    const shift = Math.round(deltaY / this.touchCardHeight);
    let toIdx = fromIdx + shift;
    toIdx = Math.max(0, Math.min(this.team().length - 1, toIdx));

    this.dragOverIndex.set(toIdx !== fromIdx ? toIdx : null);

    if (this.dragEl) {
      this.dragEl.style.transform = `translateY(${deltaY}px)`;
      this.dragEl.style.zIndex = '10';
      this.dragEl.style.transition = 'none';
    }

    event.preventDefault();
  }

  onTouchEnd(): void {
    const fromIdx = this.touchFromIndex();
    const toIdx = this.dragOverIndex();

    if (this.dragEl) {
      this.dragEl.style.transform = '';
      this.dragEl.style.zIndex = '';
      this.dragEl.style.transition = '';
      this.dragEl = null;
    }

    if (this.touchDragging() && fromIdx !== null && toIdx !== null && fromIdx !== toIdx) {
      this.battle.reorderTeam(fromIdx, toIdx);
    }

    this.touchDragging.set(false);
    this.touchFromIndex.set(null);
    this.draggingIndex.set(null);
    this.dragOverIndex.set(null);
  }
}

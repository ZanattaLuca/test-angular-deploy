import { Component, inject } from '@angular/core';
import { BattleService } from '../../services/battle';
import { Choice } from '../../models/area.model';
import { TeamComponent } from '../team/team';
import { MapComponent } from '../map/map';

@Component({
  selector: 'app-area',
  standalone: true,
  imports: [TeamComponent, MapComponent],
  templateUrl: './area.html',
  styleUrl: './area.css',
})
export class AreaComponent {
  private battle = inject(BattleService);

  readonly area = this.battle.currentArea;

  get isAtPokeCenter(): boolean {
    return this.area().id === 'pokemon-center';
  }

  onMove(choice: Choice): void {
    this.battle.goToArea(choice.target);
  }

  onSearch(): void {
    this.battle.startEncounter();
  }

  async onDebug(): Promise<void> {
    await this.battle.debugAddRandomTeam();
  }
}

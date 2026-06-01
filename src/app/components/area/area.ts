import { Component, inject } from '@angular/core';
import { BattleService } from '../../services/battle.service';
import { Choice } from '../../models/area.model';
import { TeamComponent } from '../team/team';

@Component({
  selector: 'app-area',
  standalone: true,
  imports: [TeamComponent],
  templateUrl: './area.html',
  styleUrl: './area.css',
})
export class AreaComponent {
  private battle = inject(BattleService);

  readonly area = this.battle.currentArea;

  onMove(choice: Choice): void {
    this.battle.goToArea(choice.target);
  }

  onSearch(): void {
    this.battle.startEncounter();
  }
}

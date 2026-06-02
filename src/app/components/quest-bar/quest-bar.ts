import { Component, inject } from '@angular/core';
import { BattleService } from '../../services/battle';
import { QuestStatus } from '../../models/quest.model';

@Component({
  selector: 'app-quest-bar',
  standalone: true,
  imports: [],
  templateUrl: './quest-bar.html',
  styleUrl: './quest-bar.css',
})
export class QuestBarComponent {
  private battle = inject(BattleService);
  readonly quest = this.battle.activeQuest;

  questStatusClass(status: QuestStatus): string {
    return status;
  }
}

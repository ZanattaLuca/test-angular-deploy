import { Component, inject } from '@angular/core';
import { BattleService } from '../../services/battle';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [],
  templateUrl: './intro.html',
  styleUrl: './intro.css',
})
export class IntroComponent {
  private battle = inject(BattleService);

  start(): void {
    this.battle.goToArea('forest');
  }
}

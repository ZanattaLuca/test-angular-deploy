import { Component, inject } from '@angular/core';
import { BattleService } from './services/battle';
import { IntroComponent } from './components/intro/intro';
import { AreaComponent } from './components/area/area';
import { EncounterComponent } from './components/encounter/encounter';
import { BattleComponent } from './components/battle/battle';
import { QuestBarComponent } from './components/quest-bar/quest-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    IntroComponent,
    AreaComponent,
    EncounterComponent,
    BattleComponent,
    QuestBarComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly battle = inject(BattleService);
  readonly phase = this.battle.phase;
}

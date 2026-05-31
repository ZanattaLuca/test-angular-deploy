import { Component, inject } from '@angular/core';
import { BattleService } from './services/battle.service';
import { IntroComponent } from './components/intro/intro';
import { AreaComponent } from './components/area/area';
import { EncounterComponent } from './components/encounter/encounter';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IntroComponent, AreaComponent, EncounterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private battle = inject(BattleService);
  readonly phase = this.battle.phase;
}

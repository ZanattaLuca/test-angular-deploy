import { Component, inject } from '@angular/core';
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
}

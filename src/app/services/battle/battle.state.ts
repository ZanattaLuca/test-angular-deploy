import { signal, computed } from '@angular/core';
import { GamePhase } from './battle.service';
import { Trainer, createDefaultTrainer } from '../../models/trainer.model';
import { Pokemon } from '../../models/pokemon.model';
import { TeamPokemon, EnemyPokemonState, BattleSubPhase, BattleLogEntry } from '../../models/battle.model';
import { Quest, QuestName, QuestStatus, createDefaultQuests } from '../../models/quest.model';
import { AREAS, Area } from '../../models/area.model';
import { TypeDiceRoll } from './dice.engine';

export interface PendingAttack {
  attackerName: string;
  damage: number;
  target: 'enemy' | 'player';
  rolls: TypeDiceRoll[];
  side: 'player' | 'enemy';
}

export class BattleState {
  readonly phase = signal<GamePhase>('intro');
  readonly currentArea = signal<Area>(AREAS['forest']);
  readonly visitedAreas = signal<string[]>([]);
  readonly currentPokemon = signal<Pokemon | null>(null);
  readonly trainer = signal<Trainer>(createDefaultTrainer());
  readonly team = computed(() => this.trainer().pokemon);

  readonly quests = signal<Quest[]>(createDefaultQuests());
  readonly activeQuest = computed(
    () => this.quests().find((q) => q.status === QuestStatus.Doing) ?? null,
  );

  readonly enemyPokemon = signal<EnemyPokemonState | null>(null);
  readonly activePokemonIndex = signal(0);
  readonly activePokemon = computed(() => {
    const t = this.team();
    const i = this.activePokemonIndex();
    return i < t.length ? t[i] : null;
  });
  readonly battleSubPhase = signal<BattleSubPhase>('idle');
  readonly battleBusy = signal(false);
  readonly battleLog = signal<BattleLogEntry[]>([]);
  readonly gameOver = signal(false);
  readonly gameOverMessage = signal('');
  readonly playerHp = signal(20);
  readonly playerMaxHp = signal(20);
  readonly pokeballs = computed(
    () =>
      this.trainer().inventory.find((i) => i.id === 'poke-ball')?.quantity ?? 0,
  );

  readonly isFirstEncounter = signal(true);

  readonly pendingAttack = signal<PendingAttack | null>(null);

  readonly switchAfterFaint = signal(false);
}

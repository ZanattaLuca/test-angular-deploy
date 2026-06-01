import { Injectable, signal, computed, inject } from '@angular/core';
import { AREAS, Area } from '../models/area.model';
import { Pokemon } from '../models/pokemon.model';
import { Trainer, createDefaultTrainer } from '../models/trainer.model';
import {
  TeamPokemon,
  EnemyPokemonState,
  BattleSubPhase,
  StatusEffect,
  BattleLogEntry,
} from '../models/battle.model';
import {
  Quest,
  QuestName,
  QuestStatus,
  createDefaultQuests,
} from '../models/quest.model';
import { PokemonService } from './pokemon.service';

export type GamePhase =
  | 'intro'
  | 'area'
  | 'encounter'
  | 'action'
  | 'result'
  | 'battle'
  | 'gameover';

@Injectable({ providedIn: 'root' })
export class BattleService {
  private pokemonService = inject(PokemonService);

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
      this.trainer().inventory.find((i) => i.id === 'poke-ball')?.quantity ??
      0,
  );

  private isFirstEncounter = signal(true);

  goToArea(areaId: string): void {
    const area = AREAS[areaId];
    if (!area) return;
    this.currentArea.set(area);
    this.visitedAreas.update((v) =>
      v.includes(areaId) ? v : [...v, areaId],
    );
    this.phase.set('area');
  }

  startEncounter(): void {
    this.currentPokemon.set(null);
    this.phase.set('encounter');
  }

  setPokemon(data: Pokemon | null): void {
    this.currentPokemon.set(data);
    if (data) this.phase.set('action');
  }

  setPhase(phase: GamePhase): void {
    this.phase.set(phase);
  }

  get isFirst(): boolean {
    return this.isFirstEncounter();
  }

  async capturePokemonAsTeam(
    pokemon: Pokemon,
    level: number,
  ): Promise<TeamPokemon> {
    const svc = this.pokemonService;
    const baseStats = svc.extractBaseStats(pokemon);
    const stats = svc.calcStats(baseStats, level);
    const moves = await svc.getLevelUpMoves(pokemon, level);

    const teamPkmn: TeamPokemon = {
      pokemon,
      level,
      currentXp: 0,
      currentHp: stats.hp,
      maxHp: stats.hp,
      stats,
      moves,
      status: null,
    };

    this.trainer.update((t) => {
      if (t.pokemon.find((p) => p.pokemon.id === pokemon.id)) return t;
      return { ...t, pokemon: [...t.pokemon, teamPkmn] };
    });

    this.isFirstEncounter.set(false);
    this.updateQuestProgress();
    return teamPkmn;
  }

  hasPokemon(id: number): boolean {
    return this.trainer().pokemon.some((p) => p.pokemon.id === id);
  }

  dismissPokemon(): void {
    this.currentPokemon.set(null);
    this.phase.set('encounter');
  }

  private updateQuestProgress(): void {
    this.quests.update((qs) =>
      qs.map((q) => {
        if (
          q.name === QuestName.CatchThree &&
          q.status === QuestStatus.Doing
        ) {
          const progress = this.team().length;
          return {
            ...q,
            progress,
            status:
              progress >= q.target ? QuestStatus.Completed : q.status,
          };
        }
        return q;
      }),
    );
  }

  /* ---- BATTLE ---- */

  async startBattle(enemyPkmn: Pokemon, enemyLevel: number): Promise<void> {
    const svc = this.pokemonService;
    const baseStats = svc.extractBaseStats(enemyPkmn);
    const stats = svc.calcStats(baseStats, enemyLevel);
    const moves = await svc.getLevelUpMoves(enemyPkmn, enemyLevel);

    const enemy: EnemyPokemonState = {
      pokemon: enemyPkmn,
      level: enemyLevel,
      currentHp: stats.hp,
      maxHp: stats.hp,
      stats,
      moves,
      status: null,
      baseExperience: enemyPkmn.base_experience ?? 50,
    };

    this.enemyPokemon.set(enemy);
    this.activePokemonIndex.set(0);
    this.battleLog.set([
      { text: `Un ${enemy.pokemon.name} selvatico è apparso!`, side: 'enemy' },
    ]);
    this.battleSubPhase.set('idle');
    this.phase.set('battle');
  }

  addBattleLog(msg: string, side: 'player' | 'enemy' = 'player'): void {
    this.battleLog.update((l) => [...l.slice(-3), { text: msg, side }]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  async useMove(moveIndex: number): Promise<void> {
    const pkmn = this.activePokemon();
    const enemy = this.enemyPokemon();
    if (!pkmn || !enemy || pkmn.currentHp <= 0) return;

    const move = pkmn.moves[moveIndex];
    if (!move || move.pp <= 0) return;

    this.battleBusy.set(true);
    this.battleSubPhase.set('idle');
    move.pp--;

    if (pkmn.status === 'paralyzed' && Math.random() < 0.25) {
      this.addBattleLog(`${pkmn.pokemon.name} è paralizzato e non può attaccare!`, 'player');
      await this.delay(700);
    } else if (pkmn.status === 'frozen') {
      if (Math.random() < 0.2) {
        pkmn.status = null;
        this.addBattleLog(`${pkmn.pokemon.name} si è scongelato!`, 'player');
        await this.delay(700);
      } else {
        this.addBattleLog(`${pkmn.pokemon.name} è congelato!`, 'player');
        await this.delay(700);
        await this.enemyAttack();
        this.battleBusy.set(false);
        return;
      }
    } else if (pkmn.status === 'sleep') {
      this.addBattleLog(`${pkmn.pokemon.name} sta dormendo...`, 'player');
      await this.delay(700);
      await this.enemyAttack();
      this.battleBusy.set(false);
      return;
    }

    if (move.damageClass === 'status') {
      this.applyStatusMove(move, enemy);
      await this.delay(700);
    } else {
      const damage = this.calcDamage(pkmn, enemy, move);
      enemy.currentHp = Math.max(0, enemy.currentHp - damage);
      this.addBattleLog(
        `${pkmn.pokemon.name} usa ${move.name}! -${damage} HP`, 'player',
      );
      await this.delay(800);

      if (enemy.currentHp <= 0) {
        this.addBattleLog(`${enemy.pokemon.name} è esausto!`, 'player');
        await this.delay(600);
        await this.onEnemyDefeated();
        return;
      }
    }

    await this.enemyAttack();
    this.battleBusy.set(false);
  }

  private applyStatusMove(
    move: { type: string; name: string },
    enemy: EnemyPokemonState,
  ): void {
    const status = this.statusFromType(move.type);
    if (status && enemy.status === null && Math.random() < 0.5) {
      enemy.status = status;
      this.addBattleLog(`${enemy.pokemon.name} è stato ${status}!`, 'player');
    } else {
      this.addBattleLog(`${move.name} non ha avuto effetto.`, 'player');
    }
  }

  private statusFromType(type: string): StatusEffect | null {
    switch (type) {
      case 'poison': return 'poisoned';
      case 'fire': return 'burned';
      case 'ice': return 'frozen';
      case 'electric': return 'paralyzed';
      default: return null;
    }
  }

  private async enemyAttack(): Promise<void> {
    const pkmn = this.activePokemon();
    const enemy = this.enemyPokemon();
    if (!pkmn || !enemy || enemy.currentHp <= 0) return;

    const move = enemy.moves[Math.floor(Math.random() * enemy.moves.length)];
    if (!move) return;

    if (move.damageClass === 'status') {
      const status = this.statusFromType(move.type);
      if (status && pkmn.status === null && Math.random() < 0.4) {
        pkmn.status = status;
        this.addBattleLog(
          `${pkmn.pokemon.name} è stato ${status} da ${move.name}!`, 'enemy',
        );
      } else {
        this.addBattleLog(`${enemy.pokemon.name} usa ${move.name}.`, 'enemy');
      }
      await this.delay(700);
      return;
    }

    const damage = this.calcDamage(enemy, pkmn, move);
    pkmn.currentHp = Math.max(0, pkmn.currentHp - damage);
    this.addBattleLog(
      `${enemy.pokemon.name} usa ${move.name}! -${damage} HP`, 'enemy',
    );
    await this.delay(800);

    if (pkmn.currentHp <= 0) {
      this.addBattleLog(`${pkmn.pokemon.name} è esausto!`, 'enemy');
      await this.delay(600);
      await this.checkTeamStatus();
    }
  }

  private calcDamage(
    attacker: { stats: { attack: number; specialAttack: number }; level: number; status: StatusEffect | null },
    defender: { pokemon: Pokemon; stats: { defense: number; specialDefense: number } },
    move: { power: number; damageClass: string; type: string },
  ): number {
    const atkStat =
      move.damageClass === 'special'
        ? attacker.stats.specialAttack
        : attacker.stats.attack;
    const defStat =
      move.damageClass === 'special'
        ? defender.stats.specialDefense
        : defender.stats.defense;

    let atkMod = 1;
    if (attacker.status === 'burned' && move.damageClass === 'physical') atkMod = 0.5;

    const stab = 1.5;

    const typeEffect = this.pokemonService.getTypeEffectiveness(
      move.type,
      defender.pokemon.types.map((t) => t.type.name),
    );

    const base =
      ((2 * attacker.level) / 5 + 2) * move.power * (atkStat / defStat);
    const raw = Math.floor(base / 50 + 2) * atkMod * stab * typeEffect;
    const random = 0.85 + Math.random() * 0.15;

    return Math.max(1, Math.floor(raw * random));
  }

  private async checkTeamStatus(): Promise<void> {
    const team = this.team();
    const allKo = team.every((p) => p.currentHp <= 0);
    if (!allKo) return;

    const totalCaught = team.length;
    const noBalls =
      (this.trainer().inventory.find((i) => i.id === 'poke-ball')?.quantity ??
        0) === 0;

    if (totalCaught < 3 || noBalls) {
      this.gameOver.set(true);
      this.gameOverMessage.set(
        'Non sei riuscito a catturare 3 Pokémon. Ti iscrivi a filosofia per capire cosa sei senza tre Pokémon.',
      );
      this.phase.set('gameover');
      this.quests.update((qs) =>
        qs.map((q) =>
          q.name === QuestName.CatchThree && q.status === QuestStatus.Doing
            ? { ...q, status: QuestStatus.Failed }
            : q,
        ),
      );
    } else {
      team.forEach((p) => {
        p.currentHp = p.maxHp;
        p.status = null;
      });
      this.addBattleLog("Tutti i Pokémon sono esausti. Torna all'area.", 'player');
      await this.delay(800);
      this.battleBusy.set(false);
      this.endBattle();
      this.phase.set('area');
    }
  }

  private async onEnemyDefeated(): Promise<void> {
    const enemy = this.enemyPokemon()!;
    const team = this.team();
    const alive = team.filter((p) => p.currentHp > 0);
    if (alive.length === 0) {
      await this.checkTeamStatus();
      return;
    }

    const xpEach = Math.floor((enemy.baseExperience * enemy.level) / 7 / alive.length);
    for (const p of alive) {
      p.currentXp += xpEach;
      this.tryLevelUp(p);
    }

    this.addBattleLog(`XP guadagnata: +${xpEach}`, 'player');
    await this.delay(800);
    this.addBattleLog(`${enemy.pokemon.name} è stato sconfitto!`, 'player');
    await this.delay(600);
    this.battleBusy.set(false);
    this.endBattle();
    this.phase.set('result');
  }

  private tryLevelUp(pkmn: TeamPokemon): void {
    const xpForNext = Math.pow(pkmn.level + 1, 3);
    while (pkmn.currentXp >= xpForNext && pkmn.level < 100) {
      pkmn.level++;
      pkmn.currentXp -= xpForNext;
      const baseStats = this.pokemonService.extractBaseStats(pkmn.pokemon);
      const newStats = this.pokemonService.calcStats(baseStats, pkmn.level);
      const hpGain = newStats.hp - pkmn.maxHp;
      pkmn.maxHp = newStats.hp;
      pkmn.currentHp = Math.min(pkmn.maxHp, pkmn.currentHp + hpGain);
      pkmn.stats = newStats;
      this.addBattleLog(
        `${pkmn.pokemon.name} è salito al livello ${pkmn.level}!`, 'player',
      );
    }
  }

  usePokeball(): boolean {
    const enemy = this.enemyPokemon();
    if (!enemy) return false;

    const hpPercent = enemy.currentHp / enemy.maxHp;
    const hpRemaining = 1 - hpPercent;
    let catchSegments = Math.round(14 * hpRemaining * hpRemaining + 3 * hpRemaining + 1);

    if (enemy.status !== null) {
      catchSegments = 18;
    }

    catchSegments = Math.min(20, Math.max(1, catchSegments));

    const roll = Math.floor(Math.random() * 20);
    return roll < catchSegments;
  }

  async onPokeballResult(success: boolean): Promise<void> {
    if (!this.enemyPokemon()) return;

    this.trainer.update((t) => ({
      ...t,
      inventory: t.inventory.map((i) =>
        i.id === 'poke-ball' ? { ...i, quantity: i.quantity - 1 } : i,
      ),
    }));

    if (success) {
      const enemy = this.enemyPokemon()!;
      await this.capturePokemonAsTeam(enemy.pokemon, enemy.level);
      this.addBattleLog(`${enemy.pokemon.name} è stato catturato!`, 'player');
      this.enemyPokemon.set(null);
      this.phase.set('result');
    } else {
      this.battleBusy.set(true);
      this.addBattleLog('Oh no! Il Pokémon è uscito dalla Poké Ball!', 'player');
      await this.delay(700);
      await this.enemyAttack();
      this.battleBusy.set(false);
    }
  }

  async switchPokemon(index: number): Promise<void> {
    const team = this.team();
    if (index >= team.length || team[index].currentHp <= 0) return;
    this.battleBusy.set(true);
    this.activePokemonIndex.set(index);
    this.addBattleLog(`Vai, ${team[index].pokemon.name}!`, 'player');
    this.battleSubPhase.set('idle');
    await this.delay(700);
    await this.enemyAttack();
    this.battleBusy.set(false);
  }

  tryFlee(): boolean {
    const enemy = this.enemyPokemon();
    const pkmn = this.activePokemon();
    if (!enemy || !pkmn) return false;

    const fleeChance =
      ((pkmn.stats.speed * 32) / (enemy.stats.speed / 4) + 30) / 256;
    return Math.random() < fleeChance;
  }

  async onFleeFailed(): Promise<void> {
    this.battleBusy.set(true);
    this.addBattleLog('Non riesci a scappare!', 'player');
    this.battleSubPhase.set('idle');
    await this.delay(600);
    await this.enemyAttack();
    this.battleBusy.set(false);
  }

  endBattle(): void {
    this.enemyPokemon.set(null);
    this.battleLog.set([]);
    this.battleSubPhase.set('idle');
  }

  resetGame(): void {
    this.phase.set('intro');
    this.trainer.set(createDefaultTrainer());
    this.quests.set(createDefaultQuests());
    this.currentPokemon.set(null);
    this.currentArea.set(AREAS['forest']);
    this.visitedAreas.set([]);
    this.enemyPokemon.set(null);
    this.activePokemonIndex.set(0);
    this.battleLog.set([]);
    this.battleSubPhase.set('idle');
    this.gameOver.set(false);
    this.gameOverMessage.set('');
    this.playerHp.set(20);
    this.isFirstEncounter.set(true);
  }
}

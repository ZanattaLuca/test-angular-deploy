import { Injectable, inject } from '@angular/core';
import { BattleState, PendingAttack } from './battle.state';
import { AREAS, Area } from '../../models/area.model';
import { Pokemon } from '../../models/pokemon.model';
import { TeamPokemon, EnemyPokemonState } from '../../models/battle.model';
import { QuestName, QuestStatus, createDefaultQuests } from '../../models/quest.model';
import { createDefaultTrainer } from '../../models/trainer.model';
import { STATUS_NAMES } from '../../models/battle.model';
import { PokemonService, GEN1_BASE_IDS } from '../pokemon.service';
import { getDiceForPokemon, performAttack, TypeDiceRoll } from './dice.engine';
import { calculateCatchRate, rollCatch } from './pokeball';
import { tryLevelUp } from './xp-leveling';
import { tryFlee } from './flee';

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
  private state = new BattleState();

  readonly phase = this.state.phase;
  readonly currentArea = this.state.currentArea;
  readonly visitedAreas = this.state.visitedAreas;
  readonly currentPokemon = this.state.currentPokemon;
  readonly trainer = this.state.trainer;
  readonly team = this.state.team;
  readonly quests = this.state.quests;
  readonly activeQuest = this.state.activeQuest;
  readonly enemyPokemon = this.state.enemyPokemon;
  readonly activePokemonIndex = this.state.activePokemonIndex;
  readonly activePokemon = this.state.activePokemon;
  readonly battleSubPhase = this.state.battleSubPhase;
  readonly battleBusy = this.state.battleBusy;
  readonly battleLog = this.state.battleLog;
  readonly gameOver = this.state.gameOver;
  readonly gameOverMessage = this.state.gameOverMessage;
  readonly playerHp = this.state.playerHp;
  readonly playerMaxHp = this.state.playerMaxHp;
  readonly pokeballs = this.state.pokeballs;
  readonly pendingAttack = this.state.pendingAttack;
  readonly switchAfterFaint = this.state.switchAfterFaint;

  get isFirst(): boolean {
    return this.state.isFirstEncounter();
  }

  goToArea(areaId: string): void {
    const area = AREAS[areaId];
    if (!area) return;
    this.state.currentArea.set(area);
    this.state.visitedAreas.update((v) =>
      v.includes(areaId) ? v : [...v, areaId],
    );
    this.state.phase.set('area');
  }

  startEncounter(): void {
    this.state.currentPokemon.set(null);
    this.state.phase.set('encounter');
  }

  setPokemon(data: Pokemon | null): void {
    this.state.currentPokemon.set(data);
    if (data) this.state.phase.set('action');
  }

  setPhase(phase: GamePhase): void {
    this.state.phase.set(phase);
  }

  hasPokemon(id: number): boolean {
    return this.state.trainer().pokemon.some((p) => p.pokemon.id === id);
  }

  dismissPokemon(): void {
    this.state.currentPokemon.set(null);
    this.state.phase.set('encounter');
  }

  async capturePokemonAsTeam(
    pokemon: Pokemon,
    level: number,
  ): Promise<TeamPokemon> {
    const svc = this.pokemonService;
    const baseStats = svc.extractBaseStats(pokemon);
    const stats = svc.calcStats(baseStats, level);
    const diceSize = getDiceForPokemon(pokemon);

    const teamPkmn: TeamPokemon = {
      pokemon,
      level,
      currentXp: 0,
      currentHp: stats.hp,
      maxHp: stats.hp,
      stats,
      diceSize,
      status: null,
    };

    this.state.trainer.update((t) => {
      if (t.pokemon.find((p) => p.pokemon.id === pokemon.id)) return t;
      return { ...t, pokemon: [...t.pokemon, teamPkmn] };
    });

    this.state.isFirstEncounter.set(false);
    this.updateQuestProgress();
    return teamPkmn;
  }

  private updateQuestProgress(): void {
    this.state.quests.update((qs) =>
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

  async debugAddRandomTeam(): Promise<void> {
    const ids = Array.from(GEN1_BASE_IDS);
    const pick = () => ids[Math.floor(Math.random() * ids.length)];
    const [id1, id2] = [pick(), pick()];

    const [pkmn1, pkmn2] = await Promise.all([
      this.pokemonService.getPokemonById(id1),
      this.pokemonService.getPokemonById(id2),
    ]);

    await this.capturePokemonAsTeam(pkmn1, 10);
    await this.capturePokemonAsTeam(pkmn2, 10);
  }

  /* ---- BATTLE ---- */

  async startBattle(enemyPkmn: Pokemon, enemyLevel: number): Promise<void> {
    const svc = this.pokemonService;
    const baseStats = svc.extractBaseStats(enemyPkmn);
    const stats = svc.calcStats(baseStats, enemyLevel);
    const diceSize = getDiceForPokemon(enemyPkmn);

    const enemy: EnemyPokemonState = {
      pokemon: enemyPkmn,
      level: enemyLevel,
      currentHp: stats.hp,
      maxHp: stats.hp,
      stats,
      diceSize,
      status: null,
      baseExperience: enemyPkmn.base_experience ?? 50,
    };

    this.state.enemyPokemon.set(enemy);
    const team = this.team();
    const firstAlive = team.findIndex((p) => p.currentHp > 0);
    this.state.activePokemonIndex.set(firstAlive >= 0 ? firstAlive : 0);
    this.state.battleLog.set([
      { text: `Un ${enemy.pokemon.name} selvatico è apparso!`, side: 'enemy' },
    ]);
    this.state.battleSubPhase.set('idle');
    this.state.phase.set('battle');
  }

  addBattleLog(msg: string, side: 'player' | 'enemy' = 'player'): void {
    this.state.battleLog.update((l) => [...l.slice(-3), { text: msg, side }]);
  }

  delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  async playerAttack(): Promise<TypeDiceRoll[] | null> {
    const pkmn = this.state.activePokemon();
    const enemy = this.state.enemyPokemon();
    if (!pkmn || !enemy || pkmn.currentHp <= 0) return null;

    this.state.battleBusy.set(true);
    this.state.battleSubPhase.set('idle');

    if (pkmn.status === 'paralyzed' && Math.random() < 0.25) {
      this.addBattleLog(`${pkmn.pokemon.name} è paralizzato e non può attaccare!`, 'player');
      this.state.battleBusy.set(false);
      return null;
    }

    if (pkmn.status === 'frozen') {
      if (Math.random() < 0.2) {
        pkmn.status = null;
        this.addBattleLog(`${pkmn.pokemon.name} si è scongelato!`, 'player');
      } else {
        this.addBattleLog(`${pkmn.pokemon.name} è congelato!`, 'player');
        this.state.battleBusy.set(false);
        return null;
      }
    }

    const defenderTypes = enemy.pokemon.types.map((t) => t.type.name);
    const result = performAttack(pkmn.pokemon, pkmn.diceSize, defenderTypes, this.pokemonService);

    this.state.pendingAttack.set({
      attackerName: pkmn.pokemon.name,
      damage: result.damage,
      target: 'enemy',
      rolls: result.rolls,
      side: 'player',
    });

    return result.rolls;
  }

  async deferredEnemyAttack(): Promise<TypeDiceRoll[] | null> {
    const pkmn = this.state.activePokemon();
    const enemy = this.state.enemyPokemon();
    if (!pkmn || !enemy || enemy.currentHp <= 0 || pkmn.currentHp <= 0) return null;

    const pkmnTypes = pkmn.pokemon.types.map((t) => t.type.name);
    const result = performAttack(enemy.pokemon, enemy.diceSize, pkmnTypes, this.pokemonService);

    this.state.pendingAttack.set({
      attackerName: enemy.pokemon.name,
      damage: result.damage,
      target: 'player',
      rolls: result.rolls,
      side: 'enemy',
    });

    return result.rolls;
  }

  async enemyAttack(): Promise<TypeDiceRoll[] | null> {
    const pkmn = this.state.activePokemon();
    const enemy = this.state.enemyPokemon();
    if (!pkmn || !enemy || enemy.currentHp <= 0 || pkmn.currentHp <= 0) {
      return null;
    }

    const pkmnTypes = pkmn.pokemon.types.map((t) => t.type.name);
    const result = performAttack(enemy.pokemon, enemy.diceSize, pkmnTypes, this.pokemonService);

    this.buildAttackLog(enemy.pokemon.name, result.rolls, 'enemy');

    for (const r of result.rolls) {
      if (r.statusInflicted) {
        if (pkmn.status === null) {
          pkmn.status = r.statusInflicted;
        }
        this.addBattleLog(`${pkmn.pokemon.name} è ${STATUS_NAMES[r.statusInflicted]}!`, 'enemy');
      }
    }

    pkmn.currentHp = Math.max(0, pkmn.currentHp - result.damage);

    if (pkmn.currentHp <= 0) {
      this.addBattleLog(`${pkmn.pokemon.name} è esausto!`, 'enemy');
      await this.checkTeamStatus();
      return null;
    }

    return result.rolls;
  }

  private buildAttackLog(
    name: string,
    rolls: TypeDiceRoll[],
    side: 'player' | 'enemy',
  ): void {
    const parts = rolls.map((r) => {
      let s = `dado ${r.type}(${r.diceSize}): ${r.result}`;
      if (r.advantage) s += ' [vantaggio]';
      if (r.disadvantage) s += ' [svantaggio]';
      return s;
    });
    const damage = rolls.reduce((s, r) => s + r.result, 0);
    this.addBattleLog(`${name} attacca! ${parts.join(' + ')} = -${damage} HP`, side);

    if (side === 'player') {
      for (const r of rolls) {
        if (r.statusInflicted) {
          this.addBattleLog(`${STATUS_NAMES[r.statusInflicted]}!`, 'player');
        }
      }
    }
  }

  async resolveAttack(): Promise<void> {
    const pending = this.state.pendingAttack();
    if (!pending) return;

    const pkmn = this.state.activePokemon();
    const enemy = this.state.enemyPokemon();
    if (!pkmn || !enemy) {
      this.state.pendingAttack.set(null);
      return;
    }

    const { attackerName, damage, rolls, side, target } = pending;

    const parts = rolls.map((r) => {
      let s = `dado ${r.type}(${r.diceSize}): ${r.result}`;
      if (r.advantage) s += ' [vantaggio]';
      if (r.disadvantage) s += ' [svantaggio]';
      return s;
    });
    const totalDamage = rolls.reduce((s, r) => s + r.result, 0);
    this.addBattleLog(`${attackerName} attacca! ${parts.join(' + ')} = -${totalDamage} HP`, side);

    if (target === 'enemy') {
      enemy.currentHp = Math.max(0, enemy.currentHp - damage);

      for (const r of rolls) {
        if (r.statusInflicted) {
          this.addBattleLog(`${STATUS_NAMES[r.statusInflicted]}!`, 'player');
        }
      }

      if (pkmn.status === 'burned') {
        pkmn.currentHp = Math.max(0, pkmn.currentHp - 1);
        this.addBattleLog(`${pkmn.pokemon.name} subisce danno da scottatura! -1 HP`, 'player');
      }
      if (enemy.status === 'burned') {
        enemy.currentHp = Math.max(0, enemy.currentHp - 1);
        this.addBattleLog(`${enemy.pokemon.name} subisce danno da scottatura! -1 HP`, 'enemy');
      }
    } else {
      pkmn.currentHp = Math.max(0, pkmn.currentHp - damage);

      for (const r of rolls) {
        if (r.statusInflicted) {
          if (pkmn.status === null) {
            pkmn.status = r.statusInflicted;
          }
          this.addBattleLog(`${pkmn.pokemon.name} è ${STATUS_NAMES[r.statusInflicted]}!`, 'enemy');
        }
      }
    }

    this.state.pendingAttack.set(null);

    if (enemy.currentHp <= 0) {
      this.addBattleLog(`${enemy.pokemon.name} è esausto!`, 'player');
      await this.onEnemyDefeated();
      return;
    }

    if (pkmn.currentHp <= 0) {
      this.addBattleLog(`${pkmn.pokemon.name} è esausto!`, 'enemy');
      await this.checkTeamStatus();
      if (this.state.phase() === 'battle') {
        this.state.battleBusy.set(false);
        this.state.battleSubPhase.set('pokemon');
        this.state.switchAfterFaint.set(true);
      }
      return;
    }

    this.state.battleBusy.set(false);
  }

  private async checkTeamStatus(): Promise<void> {
    const team = this.team();
    const allKo = team.every((p) => p.currentHp <= 0);
    if (!allKo) return;

    const totalCaught = team.length;
    const noBalls =
      (this.state.trainer().inventory.find((i) => i.id === 'poke-ball')
        ?.quantity ?? 0) === 0;

    if (totalCaught < 3 || noBalls) {
      this.state.gameOver.set(true);
      this.state.gameOverMessage.set(
        'Non sei riuscito a catturare 3 Pokémon. Ti iscrivi a filosofia per capire cosa sei senza tre Pokémon.',
      );
      this.state.phase.set('gameover');
      this.state.quests.update((qs) =>
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
      this.addBattleLog(
        "Tutti i Pokémon sono esausti. Torna all'area.",
        'player',
      );
      await this.delay(800);
      this.state.battleBusy.set(false);
      this.endBattle();
      this.state.phase.set('area');
    }
  }

  private async onEnemyDefeated(): Promise<void> {
    const enemy = this.state.enemyPokemon()!;
    const team = this.team();
    const alive = team.filter((p) => p.currentHp > 0);
    if (alive.length === 0) {
      await this.checkTeamStatus();
      return;
    }

    const xpEach = Math.floor(
      (enemy.baseExperience * enemy.level) / 7 / alive.length,
    );
    for (const p of alive) {
      p.currentXp += xpEach;
      for (const msg of tryLevelUp(p, this.pokemonService)) {
        this.addBattleLog(msg, 'player');
      }
    }

    this.addBattleLog(`XP guadagnata: +${xpEach}`, 'player');
    await this.delay(800);
    this.addBattleLog(`${enemy.pokemon.name} è stato sconfitto!`, 'player');
    await this.delay(600);
    this.state.battleBusy.set(false);
    this.endBattle();
    this.state.phase.set('result');
  }

  usePokeball(): boolean {
    const enemy = this.state.enemyPokemon();
    if (!enemy) return false;
    return rollCatch(calculateCatchRate(enemy));
  }

  async onPokeballResult(success: boolean): Promise<void> {
    if (!this.state.enemyPokemon()) return;

    this.state.trainer.update((t) => ({
      ...t,
      inventory: t.inventory.map((i) =>
        i.id === 'poke-ball' ? { ...i, quantity: i.quantity - 1 } : i,
      ),
    }));

    if (success) {
      const enemy = this.state.enemyPokemon()!;
      await this.capturePokemonAsTeam(enemy.pokemon, enemy.level);
      this.addBattleLog(`${enemy.pokemon.name} è stato catturato!`, 'player');
      this.state.enemyPokemon.set(null);
      this.state.phase.set('result');
    } else {
      this.state.battleBusy.set(true);
      this.addBattleLog(
        'Oh no! Il Pokémon è uscito dalla Poké Ball!',
        'player',
      );
      await this.delay(700);
      await this.enemyAttack();
      this.state.battleBusy.set(false);
    }
  }

  async switchPokemon(index: number): Promise<boolean> {
    const team = this.team();
    if (index >= team.length || team[index].currentHp <= 0) return false;
    this.state.battleBusy.set(true);
    this.state.activePokemonIndex.set(index);
    this.addBattleLog(`Vai, ${team[index].pokemon.name}!`, 'player');
    this.state.battleSubPhase.set('idle');
    await this.delay(700);
    this.state.battleBusy.set(false);
    return true;
  }

  tryFlee(): boolean {
    const enemy = this.state.enemyPokemon();
    const pkmn = this.state.activePokemon();
    if (!enemy || !pkmn) return false;
    return tryFlee(pkmn.stats.speed, enemy.stats.speed);
  }

  async onFleeFailed(): Promise<void> {
    this.state.battleBusy.set(true);
    this.addBattleLog('Non riesci a scappare!', 'player');
    this.state.battleSubPhase.set('idle');
    await this.delay(600);
    await this.enemyAttack();
    this.state.battleBusy.set(false);
  }

  endBattle(): void {
    this.state.enemyPokemon.set(null);
    this.state.battleLog.set([]);
    this.state.battleSubPhase.set('idle');
  }

  resetGame(): void {
    this.state.phase.set('intro');
    this.state.trainer.set(createDefaultTrainer());
    this.state.quests.set(createDefaultQuests());
    this.state.currentPokemon.set(null);
    this.state.currentArea.set(AREAS['forest']);
    this.state.visitedAreas.set([]);
    this.state.enemyPokemon.set(null);
    this.state.activePokemonIndex.set(0);
    this.state.battleLog.set([]);
    this.state.battleSubPhase.set('idle');
    this.state.gameOver.set(false);
    this.state.gameOverMessage.set('');
    this.state.playerHp.set(20);
    this.state.isFirstEncounter.set(true);
  }
}

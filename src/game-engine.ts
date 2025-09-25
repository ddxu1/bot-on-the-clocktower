// Core Game Logic Engine
import { v4 as uuidv4 } from 'uuid';
import { GameState, Player, Nomination, Role, Alignment, Phase, GameAction, NightAction, PlayerInfo } from './types';
import { GameDatabase } from './database';
import { getRoleAlignment } from './roles';
import { RoleAbilities } from './role-abilities';

export class ClockTowerEngine {
  private db: GameDatabase;

  constructor(db: GameDatabase) {
    this.db = db;
  }

  // Create a new game
  async createGame(): Promise<GameState> {
    const gameState: GameState = {
      id: uuidv4(),
      phase: 'LOBBY',
      day_number: 0,
      players: [],
      night_actions: [],
      player_info: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.saveGameState(gameState);
    await this.logAction(gameState.id, 'CREATE_GAME', {});

    return gameState;
  }

  // Add player to game
  async addPlayer(gameId: string, playerName: string): Promise<GameState> {
    const game = await this.loadGame(gameId);

    if (game.phase !== 'LOBBY') {
      throw new Error('Cannot add players after lobby phase');
    }

    const newPlayer: Player = {
      id: uuidv4(),
      name: playerName,
      seat: game.players.length + 1,
      alive: true
    };

    game.players.push(newPlayer);
    game.updated_at = new Date().toISOString();

    await this.saveGameState(game);
    await this.logAction(gameId, 'JOIN_GAME', { player: newPlayer });

    return game;
  }

  // Assign roles to players
  async assignRoles(gameId: string, roleAssignments: Record<string, Role>): Promise<GameState> {
    const game = await this.loadGame(gameId);

    if (game.phase !== 'LOBBY') {
      throw new Error('Cannot assign roles after lobby phase');
    }

    // Assign roles
    for (const player of game.players) {
      if (roleAssignments[player.id]) {
        player.role = roleAssignments[player.id];
        player.alignment = getRoleAlignment(player.role);
      }
    }

    // Process setup abilities (Washerwoman, Investigator, Chef, Baron)
    await this.processSetupAbilities(game);

    game.updated_at = new Date().toISOString();
    await this.saveGameState(game);
    await this.logAction(gameId, 'ASSIGN_ROLES', { assignments: roleAssignments });

    return game;
  }

  // Start the game (move to first night)
  async startGame(gameId: string): Promise<GameState> {
    const game = await this.loadGame(gameId);

    if (game.phase !== 'LOBBY') {
      throw new Error('Game already started');
    }

    // Validate all players have roles
    if (game.players.some(p => !p.role)) {
      throw new Error('All players must have roles assigned');
    }

    game.phase = 'NIGHT';
    game.day_number = 1;
    game.updated_at = new Date().toISOString();

    await this.saveGameState(game);
    await this.logAction(gameId, 'START_GAME', {});

    return game;
  }

  // Advance to day phase
  async openDay(gameId: string): Promise<GameState> {
    const game = await this.loadGame(gameId);

    if (game.phase !== 'NIGHT') {
      throw new Error('Can only open day from night phase');
    }

    game.phase = 'DAY';
    game.updated_at = new Date().toISOString();

    await this.saveGameState(game);
    await this.logAction(gameId, 'ADVANCE_PHASE', { to: 'DAY' });

    return game;
  }

  // Create nomination
  async nominate(gameId: string, nominatorId: string, nomineeId: string): Promise<GameState> {
    const game = await this.loadGame(gameId);

    if (game.phase !== 'DAY') {
      throw new Error('Can only nominate during day phase');
    }

    if (game.current_nomination && !game.current_nomination.closed) {
      throw new Error('Another nomination is open');
    }

    const nominator = game.players.find(p => p.id === nominatorId);
    const nominee = game.players.find(p => p.id === nomineeId);

    if (!nominator?.alive || !nominee?.alive) {
      throw new Error('Both nominator and nominee must be alive');
    }

    const nomination: Nomination = {
      id: uuidv4(),
      nominator_id: nominatorId,
      nominee_id: nomineeId,
      votes: {},
      closed: false
    };

    game.current_nomination = nomination;
    game.updated_at = new Date().toISOString();

    await this.saveGameState(game);
    await this.logAction(gameId, 'NOMINATE', { nomination });

    return game;
  }

  // Cast vote on current nomination
  async vote(gameId: string, voterId: string, vote: boolean): Promise<GameState> {
    const game = await this.loadGame(gameId);

    if (!game.current_nomination || game.current_nomination.closed) {
      throw new Error('No open nomination to vote on');
    }

    const voter = game.players.find(p => p.id === voterId);
    if (!voter?.alive) {
      throw new Error('Only alive players can vote');
    }

    game.current_nomination.votes[voterId] = vote;
    game.updated_at = new Date().toISOString();

    await this.saveGameState(game);
    await this.logAction(gameId, 'VOTE', { voter_id: voterId, vote });

    return game;
  }

  // Close current nomination
  async closeNomination(gameId: string): Promise<GameState> {
    const game = await this.loadGame(gameId);

    if (!game.current_nomination || game.current_nomination.closed) {
      throw new Error('No open nomination to close');
    }

    const votes = game.current_nomination.votes;
    const yesVotes = Object.values(votes).filter(v => v === true).length;
    const noVotes = Object.values(votes).filter(v => v === false).length;
    const alivePlayers = game.players.filter(p => p.alive).length;
    const qualifies = yesVotes >= Math.ceil(alivePlayers / 2);

    game.current_nomination.closed = true;
    game.updated_at = new Date().toISOString();

    await this.saveGameState(game);
    await this.logAction(gameId, 'CLOSE_NOMINATION', {
      nomination_id: game.current_nomination.id,
      yes_votes: yesVotes,
      no_votes: noVotes,
      qualifies
    });

    return game;
  }

  // Execute a player
  async executePlayer(gameId: string, playerId: string): Promise<GameState> {
    const game = await this.loadGame(gameId);

    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Check for Saint execution - Evil wins immediately
    if (RoleAbilities.saintExecutionCheck(game, playerId)) {
      game.winner = 'EVIL';
      game.phase = 'ENDED';
      game.updated_at = new Date().toISOString();

      await this.saveGameState(game);
      await this.logAction(gameId, 'EXECUTE_PLAYER', {
        player_id: playerId,
        saint_executed: true,
        winner: 'EVIL'
      });

      return game;
    }

    player.alive = false;

    // Store execution info for Undertaker
    if (player.role) {
      game.last_execution = {
        player_id: playerId,
        role: player.role,
        day: game.day_number
      };
    }

    // Process Scarlet Woman passive ability
    const scarletWoman = game.players.find(p => p.role === 'SCARLET_WOMAN' && p.alive);
    if (scarletWoman && player.role === 'IMP') {
      RoleAbilities.scarletWomanPassive(game, scarletWoman.id);
    }

    game.updated_at = new Date().toISOString();

    // Check win conditions
    const winner = this.checkWinConditions(game);
    if (winner) {
      game.winner = winner;
      game.phase = 'ENDED';
    }

    await this.saveGameState(game);
    await this.logAction(gameId, 'EXECUTE_PLAYER', { player_id: playerId, winner });

    return game;
  }

  // Advance to next night
  async openNight(gameId: string): Promise<GameState> {
    const game = await this.loadGame(gameId);

    if (game.phase !== 'DAY') {
      throw new Error('Can only open night from day phase');
    }

    game.phase = 'NIGHT';
    game.day_number += 1;
    game.current_nomination = undefined;
    game.night_actions = []; // Clear previous night actions

    // Process night abilities (Empath, Undertaker)
    await this.processNightAbilities(game);

    game.updated_at = new Date().toISOString();

    await this.saveGameState(game);
    await this.logAction(gameId, 'ADVANCE_PHASE', { to: 'NIGHT', day: game.day_number });

    return game;
  }

  // Get current game state
  async getGameState(gameId: string): Promise<GameState> {
    return this.loadGame(gameId);
  }

  // Get all games
  async getAllGames(): Promise<GameState[]> {
    return this.db.getAllGames();
  }

  // Get game history
  async getGameHistory(gameId: string): Promise<GameAction[]> {
    return this.db.getGameHistory(gameId);
  }

  // Handle night action (Poisoner, Imp, Monk, Butler, Fortune Teller)
  async performNightAction(gameId: string, playerId: string, role: Role, targets?: string[]): Promise<GameState> {
    const game = await this.loadGame(gameId);

    if (game.phase !== 'NIGHT') {
      throw new Error('Can only perform night actions during night phase');
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player || !player.alive || player.role !== role) {
      throw new Error('Invalid player or role mismatch');
    }

    let action: NightAction | null = null;
    let info: PlayerInfo | null = null;

    switch (role) {
      case 'POISONER':
        if (!targets || targets.length !== 1) throw new Error('Poisoner must target exactly 1 player');
        action = RoleAbilities.poisonerNightAction(game, playerId, targets[0]);
        break;

      case 'IMP':
        if (!targets || targets.length !== 1) throw new Error('Imp must target exactly 1 player');
        action = RoleAbilities.impNightActionEnhanced(game, playerId, targets[0]);
        break;

      case 'MONK':
        if (!targets || targets.length !== 1) throw new Error('Monk must target exactly 1 player');
        action = RoleAbilities.monkNightAction(game, playerId, targets[0]);
        break;

      case 'BUTLER':
        if (!targets || targets.length !== 1) throw new Error('Butler must choose exactly 1 master');
        action = RoleAbilities.butlerNightAction(game, playerId, targets[0]);
        break;

      case 'FORTUNE_TELLER':
        if (!targets || targets.length !== 2) throw new Error('Fortune Teller must target exactly 2 players');
        info = RoleAbilities.fortuneTellerNightAction(game, playerId, targets);
        break;

      case 'RAVENKEEPER':
        // Ravenkeeper only acts if killed by Demon - handled separately
        if (!targets || targets.length !== 1) throw new Error('Ravenkeeper must target exactly 1 player');
        info = RoleAbilities.ravenkeeperNightAction(game, playerId, targets[0]);
        break;

      default:
        throw new Error(`${role} cannot perform interactive night actions`);
    }

    if (action) {
      game.night_actions.push(action);
    }

    if (info) {
      game.player_info.push(info);
    }

    game.updated_at = new Date().toISOString();

    await this.saveGameState(game);
    await this.logAction(gameId, 'NIGHT_ACTION', {
      player_id: playerId,
      role,
      targets,
      result: action?.result || info?.information
    });

    return game;
  }

  // Handle Slayer shot (day action)
  async slayerShot(gameId: string, playerId: string, targetId: string): Promise<GameState> {
    const game = await this.loadGame(gameId);

    if (game.phase !== 'DAY') {
      throw new Error('Slayer can only shoot during day phase');
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player || !player.alive || player.role !== 'SLAYER') {
      throw new Error('Invalid player or not the Slayer');
    }

    const result = RoleAbilities.slayerDayAction(game, playerId, targetId);

    // Check win conditions if Imp was killed
    if (result.success) {
      const winner = this.checkWinConditions(game);
      if (winner) {
        game.winner = winner;
        game.phase = 'ENDED';
      }
    }

    game.updated_at = new Date().toISOString();

    await this.saveGameState(game);
    await this.logAction(gameId, 'SLAYER_SHOT', {
      player_id: playerId,
      target_id: targetId,
      success: result.success,
      message: result.message
    });

    return game;
  }

  // Get player info (what information a player has learned)
  async getPlayerInfo(gameId: string, playerId: string): Promise<PlayerInfo[]> {
    const game = await this.loadGame(gameId);
    return game.player_info.filter(info => info.player_id === playerId);
  }

  // Handle Virgin trigger when nominated
  async virginTrigger(gameId: string, virginId: string, nominatorId: string): Promise<GameState> {
    const game = await this.loadGame(gameId);

    if (game.phase !== 'DAY') {
      throw new Error('Virgin can only trigger during day phase');
    }

    const result = RoleAbilities.virginDayAction(game, virginId, nominatorId);

    // Check win conditions if someone was executed
    if (result.success && result.message.includes('executed immediately')) {
      const winner = this.checkWinConditions(game);
      if (winner) {
        game.winner = winner;
        game.phase = 'ENDED';
      }
    }

    game.updated_at = new Date().toISOString();

    await this.saveGameState(game);
    await this.logAction(gameId, 'VIRGIN_TRIGGER', {
      virgin_id: virginId,
      nominator_id: nominatorId,
      success: result.success,
      message: result.message
    });

    return game;
  }

  // Private helper methods
  private async loadGame(gameId: string): Promise<GameState> {
    const game = await this.db.loadGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    return game;
  }

  private async saveGameState(game: GameState): Promise<void> {
    await this.db.saveGame(game);
  }

  private async logAction(gameId: string, type: GameAction['type'], payload: any): Promise<void> {
    const action: GameAction = {
      type,
      payload,
      game_id: gameId,
      timestamp: new Date().toISOString()
    };
    await this.db.saveAction(action);
  }

  // Process setup abilities when roles are assigned
  private async processSetupAbilities(game: GameState): Promise<void> {
    for (const player of game.players) {
      if (!player.role) continue;

      switch (player.role) {
        case 'WASHERWOMAN':
          const washerwomanInfo = RoleAbilities.washerwomanSetup(game, player.id);
          game.player_info.push(washerwomanInfo);
          break;

        case 'LIBRARIAN':
          const librarianInfo = RoleAbilities.librarianSetup(game, player.id);
          game.player_info.push(librarianInfo);
          break;

        case 'INVESTIGATOR':
          const investigatorInfo = RoleAbilities.investigatorSetup(game, player.id);
          game.player_info.push(investigatorInfo);
          break;

        case 'CHEF':
          const chefInfo = RoleAbilities.chefSetup(game, player.id);
          game.player_info.push(chefInfo);
          break;

        case 'FORTUNE_TELLER':
          RoleAbilities.fortuneTellerSetup(game, player.id);
          break;

        case 'DRUNK':
          RoleAbilities.drunkSetup(game, player.id);
          break;

        case 'BARON':
          // Baron effect handled during game setup - adds outsiders
          // For MVP, we'll just log it
          await this.logAction(game.id, 'NIGHT_ACTION', {
            role: 'BARON',
            effect: 'Baron in play - adds outsiders'
          });
          break;
      }
    }
  }

  // Process night abilities
  private async processNightAbilities(game: GameState): Promise<void> {
    for (const player of game.players.filter(p => p.alive)) {
      if (!player.role) continue;

      switch (player.role) {
        case 'EMPATH':
          const empathInfo = RoleAbilities.empathNightAction(game, player.id);
          game.player_info.push(empathInfo);
          break;

        case 'UNDERTAKER':
          if (game.day_number > 1) { // Undertaker doesn't act first night
            const undertakerInfo = RoleAbilities.undertakerNightAction(game, player.id);
            if (undertakerInfo) {
              game.player_info.push(undertakerInfo);
            }
          }
          break;

        case 'SPY':
          const spyInfo = RoleAbilities.spyNightAction(game, player.id);
          game.player_info.push(spyInfo);
          break;
      }
    }
  }

  private checkWinConditions(game: GameState): Alignment | null {
    const alivePlayers = game.players.filter(p => p.alive);
    let aliveGood = 0;
    let aliveEvil = 0;
    let impAlive = false;

    for (const player of alivePlayers) {
      if (player.alignment === 'GOOD') {
        aliveGood++;
      } else if (player.alignment === 'EVIL') {
        aliveEvil++;
        if (player.role === 'IMP') {
          impAlive = true;
        }
      }
    }

    // Evil wins if they have parity or more
    if (aliveEvil >= aliveGood) {
      return 'EVIL';
    }

    // Good wins if Imp is dead
    if (!impAlive) {
      return 'GOOD';
    }

    return null; // Game continues
  }
}
// Simple REST API for Game Engine
import Fastify from 'fastify';
import { ClockTowerEngine } from './game-engine';
import { GameDatabase } from './database';

const fastify = Fastify({ logger: true });

// Initialize database and engine
const db = new GameDatabase();
const engine = new ClockTowerEngine(db);

// API Routes

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Create new game
fastify.post<{ Reply: { game_id: string } }>('/api/games', async (request, reply) => {
  try {
    const game = await engine.createGame();
    return { game_id: game.id };
  } catch (error) {
    reply.code(500).send({ error: (error as Error).message });
  }
});

// Get game state
fastify.get<{ Params: { gameId: string } }>('/api/games/:gameId', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const game = await engine.getGameState(gameId);
    return game;
  } catch (error) {
    reply.code(404).send({ error: (error as Error).message });
  }
});

// Get all games
fastify.get('/api/games', async (request, reply) => {
  try {
    const games = await engine.getAllGames();
    return { games };
  } catch (error) {
    reply.code(500).send({ error: (error as Error).message });
  }
});

// Add player to game
fastify.post<{
  Params: { gameId: string };
  Body: { playerName: string };
}>('/api/games/:gameId/players', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const { playerName } = request.body;
    const game = await engine.addPlayer(gameId, playerName);
    return game;
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

// Assign roles
fastify.post<{
  Params: { gameId: string };
  Body: { roleAssignments: Record<string, string> };
}>('/api/games/:gameId/assign-roles', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const { roleAssignments } = request.body;
    const game = await engine.assignRoles(gameId, roleAssignments as any);
    return game;
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

// Start game
fastify.post<{ Params: { gameId: string } }>('/api/games/:gameId/start', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const game = await engine.startGame(gameId);
    return game;
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

// Open day
fastify.post<{ Params: { gameId: string } }>('/api/games/:gameId/open-day', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const game = await engine.openDay(gameId);
    return game;
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

// Create nomination
fastify.post<{
  Params: { gameId: string };
  Body: { nominatorId: string; nomineeId: string };
}>('/api/games/:gameId/nominate', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const { nominatorId, nomineeId } = request.body;
    const game = await engine.nominate(gameId, nominatorId, nomineeId);
    return game;
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

// Cast vote
fastify.post<{
  Params: { gameId: string };
  Body: { voterId: string; vote: boolean };
}>('/api/games/:gameId/vote', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const { voterId, vote } = request.body;
    const game = await engine.vote(gameId, voterId, vote);
    return game;
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

// Close nomination
fastify.post<{ Params: { gameId: string } }>('/api/games/:gameId/close-nomination', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const game = await engine.closeNomination(gameId);
    return game;
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

// Execute player
fastify.post<{
  Params: { gameId: string };
  Body: { playerId: string };
}>('/api/games/:gameId/execute', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const { playerId } = request.body;
    const game = await engine.executePlayer(gameId, playerId);
    return game;
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

// Open night
fastify.post<{ Params: { gameId: string } }>('/api/games/:gameId/open-night', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const game = await engine.openNight(gameId);
    return game;
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

// Get game history
fastify.get<{ Params: { gameId: string } }>('/api/games/:gameId/history', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const history = await engine.getGameHistory(gameId);
    return { history };
  } catch (error) {
    reply.code(404).send({ error: (error as Error).message });
  }
});

// Perform night action
fastify.post<{
  Params: { gameId: string };
  Body: { playerId: string; role: string; targets?: string[] };
}>('/api/games/:gameId/night-action', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const { playerId, role, targets } = request.body;
    const game = await engine.performNightAction(gameId, playerId, role as any, targets);
    return game;
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

// Slayer shot
fastify.post<{
  Params: { gameId: string };
  Body: { playerId: string; targetId: string };
}>('/api/games/:gameId/slayer-shot', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const { playerId, targetId } = request.body;
    const game = await engine.slayerShot(gameId, playerId, targetId);
    return game;
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

// Get player information
fastify.get<{
  Params: { gameId: string; playerId: string };
}>('/api/games/:gameId/player/:playerId/info', async (request, reply) => {
  try {
    const { gameId, playerId } = request.params;
    const info = await engine.getPlayerInfo(gameId, playerId);
    return { info };
  } catch (error) {
    reply.code(404).send({ error: (error as Error).message });
  }
});

// Virgin nomination trigger
fastify.post<{
  Params: { gameId: string };
  Body: { virginId: string; nominatorId: string };
}>('/api/games/:gameId/virgin-trigger', async (request, reply) => {
  try {
    const { gameId } = request.params;
    const { virginId, nominatorId } = request.body;
    const game = await engine.virginTrigger(gameId, virginId, nominatorId);
    return game;
  } catch (error) {
    reply.code(400).send({ error: (error as Error).message });
  }
});

export { fastify, db };
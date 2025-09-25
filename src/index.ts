// Simple Clocktower Game Engine Server
import { fastify, db } from './api';

const start = async () => {
  try {
    await fastify.listen({ port: 3002, host: '0.0.0.0' });
    console.log('🎲 Clocktower Game Engine running on http://localhost:3002');
    console.log('📊 Using SQLite database for persistence');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  db.close();
  process.exit(0);
});

start();
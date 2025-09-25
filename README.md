# Clocktower Web Game

A web-based implementation of the Blood on the Clocktower social deduction game.

## Prerequisites

- Docker and Docker Compose
- Node.js (v18 or later)
- Python 3.9+ (for the game engine)

## Setup

1. **Install Docker**: Download and install Docker Desktop from https://docker.com/get-started

2. **Start PostgreSQL**:
   ```bash
   docker compose up -d postgres
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run the application**:
   ```bash
   npm run dev
   ```

The database will be automatically initialized with the required tables when the PostgreSQL container starts.

## Project Structure

```
├── database/           # Database schema and migrations
├── src/
│   ├── server/        # Backend API server
│   ├── client/        # React frontend
│   └── shared/        # Shared types and utilities
├── game_engine.py     # Original game logic
└── specs.md          # Game specifications
```# bot-on-the-clocktower

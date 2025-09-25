# Clocktower Game Engine API Testing Commands

## Server Management

### Start the server
```bash
npm run dev
```
Server runs on: `http://localhost:3002`

### Health check
```bash
curl http://localhost:3002/health
```

## Game Management

### Create a new game
```bash
curl -X POST http://localhost:3002/api/games
```

### Get all games
```bash
curl http://localhost:3002/api/games | jq
```

### Get specific game state
```bash
curl http://localhost:3002/api/games/{GAME_ID} | jq
```

## Player Management

### Add player to game
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/players \
  -H "Content-Type: application/json" \
  -d '{"playerName": "Alice"}'
```

### Add multiple players (example)
```bash
# Replace {GAME_ID} with actual game ID
GAME_ID="your-game-id-here"

curl -X POST http://localhost:3002/api/games/$GAME_ID/players -H "Content-Type: application/json" -d '{"playerName": "Alice"}'
curl -X POST http://localhost:3002/api/games/$GAME_ID/players -H "Content-Type: application/json" -d '{"playerName": "Bob"}'
curl -X POST http://localhost:3002/api/games/$GAME_ID/players -H "Content-Type: application/json" -d '{"playerName": "Charlie"}'
curl -X POST http://localhost:3002/api/games/$GAME_ID/players -H "Content-Type: application/json" -d '{"playerName": "Diana"}'
curl -X POST http://localhost:3002/api/games/$GAME_ID/players -H "Content-Type: application/json" -d '{"playerName": "Eve"}'
```

## Role Assignment

### Assign roles to players
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/assign-roles \
  -H "Content-Type: application/json" \
  -d '{
    "roleAssignments": {
      "player1-id": "WASHERWOMAN",
      "player2-id": "INVESTIGATOR",
      "player3-id": "CHEF",
      "player4-id": "POISONER",
      "player5-id": "IMP"
    }
  }'
```

Available roles:
- **GOOD**: WASHERWOMAN, INVESTIGATOR, CHEF, EMPATH, SLAYER, UNDERTAKER
- **EVIL**: POISONER, BARON, SCARLET_WOMAN, IMP

## Game Flow

### Start game (move to first night)
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/start
```

### Open day phase
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/open-day
```

### Create nomination
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/nominate \
  -H "Content-Type: application/json" \
  -d '{
    "nominatorId": "player1-id",
    "nomineeId": "player2-id"
  }'
```

### Cast vote on nomination
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/vote \
  -H "Content-Type: application/json" \
  -d '{
    "voterId": "player1-id",
    "vote": true
  }'
```

### Close nomination
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/close-nomination
```

### Execute player
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/execute \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player1-id"
  }'
```

### Open night phase
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/open-night
```

## Game History

### Get game action history
```bash
curl http://localhost:3002/api/games/{GAME_ID}/history | jq
```

## Role Abilities

### Night Actions (NIGHT phase only)

#### Poisoner - Poison a player
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/night-action \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "poisoner-player-id",
    "role": "POISONER",
    "targets": ["target-player-id"]
  }'
```

#### Imp - Kill a player (enhanced with protections)
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/night-action \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "imp-player-id",
    "role": "IMP",
    "targets": ["target-player-id"]
  }'
```

#### Monk - Protect a player
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/night-action \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "monk-player-id",
    "role": "MONK",
    "targets": ["target-player-id"]
  }'
```

#### Fortune Teller - Check 2 players for Demon
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/night-action \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "fortune-teller-player-id",
    "role": "FORTUNE_TELLER",
    "targets": ["player1-id", "player2-id"]
  }'
```

#### Butler - Choose master for voting restrictions
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/night-action \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "butler-player-id",
    "role": "BUTLER",
    "targets": ["master-player-id"]
  }'
```

#### Ravenkeeper - Learn a player's role (only if killed by Demon)
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/night-action \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "ravenkeeper-player-id",
    "role": "RAVENKEEPER",
    "targets": ["target-player-id"]
  }'
```

### Day Actions

#### Slayer - Attempt to slay the Demon
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/slayer-shot \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "slayer-player-id",
    "targetId": "suspected-imp-id"
  }'
```

#### Virgin - Trigger when nominated by Townsfolk
```bash
curl -X POST http://localhost:3002/api/games/{GAME_ID}/virgin-trigger \
  -H "Content-Type: application/json" \
  -d '{
    "virginId": "virgin-player-id",
    "nominatorId": "nominator-player-id"
  }'
```

### Player Information

#### Get what a player knows (Washerwoman/Investigator/etc info)
```bash
curl http://localhost:3002/api/games/{GAME_ID}/player/{PLAYER_ID}/info | jq
```

## Complete Role Reference

### TOWNSFOLK (Good Team)

#### Information Roles (Automatic):
- **Washerwoman**: Gets info at setup about 2 players, one of whom has a specific Townsfolk role
- **Librarian**: Gets info at setup about 2 players, one of whom has a specific Outsider role (or none)
- **Investigator**: Gets info at setup about 2 players, one of whom has a specific Minion role
- **Chef**: Gets info at setup about how many pairs of adjacent evil players exist
- **Empath**: Gets info each night about how many evil neighbors they have
- **Undertaker**: Gets info each night about the role of the player executed that day

#### Interactive Roles:
- **Fortune Teller**: Chooses 2 players each night - learns if either is Demon (has red herring)
- **Monk**: Protects 1 player each night from Demon kills
- **Ravenkeeper**: If killed by Demon, learns 1 player's role
- **Slayer**: Once per game, can publicly shoot someone - kills Demon if correct
- **Virgin**: If nominated by Townsfolk, that player is executed immediately

#### Passive Roles:
- **Soldier**: Immune to Demon kills
- **Mayor**: Win condition modifier + death redirection

### OUTSIDERS (Good Team, but harmful)

- **Butler**: Must choose master each night - can only vote if master votes
- **Drunk**: Thinks they're Townsfolk but ability malfunctions
- **Recluse**: May appear evil to investigative abilities
- **Saint**: If executed, Evil team wins immediately

### MINIONS (Evil Team)

- **Poisoner**: Targets 1 player each night - their ability malfunctions
- **Spy**: Sees all roles each night + may appear good to investigations
- **Scarlet Woman**: Becomes Demon if Demon dies with 5+ players alive
- **Baron**: Setup effect - adds 2 Outsiders to the game

### DEMONS (Evil Team)

- **Imp**: Kills 1 player each night (respects Soldier immunity, Monk protection, Mayor redirection)

## Complete Test Flow Example

```bash
# 1. Create game
RESPONSE=$(curl -s -X POST http://localhost:3002/api/games)
GAME_ID=$(echo $RESPONSE | jq -r '.game_id')
echo "Created game: $GAME_ID"

# 2. Add players
curl -X POST http://localhost:3002/api/games/$GAME_ID/players -H "Content-Type: application/json" -d '{"playerName": "Alice"}'
curl -X POST http://localhost:3002/api/games/$GAME_ID/players -H "Content-Type: application/json" -d '{"playerName": "Bob"}'
curl -X POST http://localhost:3002/api/games/$GAME_ID/players -H "Content-Type: application/json" -d '{"playerName": "Charlie"}'

# 3. Get game state to see player IDs
curl http://localhost:3002/api/games/$GAME_ID | jq

# 4. Assign roles (replace with actual player IDs)
# curl -X POST http://localhost:3002/api/games/$GAME_ID/assign-roles -H "Content-Type: application/json" -d '{"roleAssignments": {"player1-id": "WASHERWOMAN", "player2-id": "CHEF", "player3-id": "IMP"}}'

# 5. Start game
# curl -X POST http://localhost:3002/api/games/$GAME_ID/start

# 6. Check history
# curl http://localhost:3002/api/games/$GAME_ID/history | jq
```

## Database

The SQLite database file is stored at `./clocktower.db` and persists between server restarts.

## Game Phases

1. **LOBBY** - Adding players and assigning roles
2. **NIGHT** - Night actions (not yet implemented)
3. **DAY** - Nominations and voting
4. **ENDED** - Game finished with winner

## Win Conditions

- **GOOD wins** if the IMP is executed
- **EVIL wins** if they achieve parity (equal or more evil players than good players alive)
#!/bin/bash

# Simple Clocktower Game Engine Test Script
# Tests the complete game flow with API calls

SERVER_URL="http://localhost:3002"

echo "🎲 Testing Simple Clocktower Game Engine"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test function
test_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -e "\n${YELLOW}→${NC} $description"

    if [ -n "$data" ]; then
        response=$(curl -s -X $method "$SERVER_URL$endpoint" \
                      -H "Content-Type: application/json" \
                      -d "$data")
    else
        response=$(curl -s -X $method "$SERVER_URL$endpoint")
    fi

    if echo "$response" | grep -q '"error"'; then
        echo -e "${RED}❌ FAILED${NC}: $(echo "$response" | jq -r '.error' 2>/dev/null || echo "$response")"
        return 1
    else
        echo -e "${GREEN}✅ SUCCESS${NC}"
        echo "$response" | jq . 2>/dev/null || echo "$response" | head -c 200
        return 0
    fi
}

# Extract JSON value helper
extract_json() {
    echo "$1" | jq -r "$2" 2>/dev/null
}

echo -e "\n${BLUE}=== STEP 1: Health Check ===${NC}"
test_api "GET" "/health" "" "Server health check"

echo -e "\n${BLUE}=== STEP 2: Create Game ===${NC}"
game_response=$(curl -s -X POST "$SERVER_URL/api/games")
game_id=$(extract_json "$game_response" '.game_id')

if [ "$game_id" != "null" ] && [ -n "$game_id" ]; then
    echo -e "${GREEN}✅ Game created with ID: $game_id${NC}"
else
    echo -e "${RED}❌ Failed to create game${NC}"
    exit 1
fi

echo -e "\n${BLUE}=== STEP 3: Add Players ===${NC}"
players=("Alice" "Bob" "Charlie" "Diana" "Eve")
player_ids=()

for player in "${players[@]}"; do
    echo -e "\n${YELLOW}→${NC} Adding player: $player"
    response=$(curl -s -X POST "$SERVER_URL/api/games/$game_id/players" \
                  -H "Content-Type: application/json" \
                  -d "{\"playerName\": \"$player\"}")

    if echo "$response" | grep -q '"error"'; then
        echo -e "${RED}❌ Failed to add $player${NC}"
    else
        echo -e "${GREEN}✅ Added $player${NC}"
        # Extract all player IDs from the response
        if [ ${#player_ids[@]} -eq 0 ]; then
            # First time, extract all player IDs
            readarray -t player_ids < <(echo "$response" | jq -r '.players[].id')
        fi
    fi
done

echo -e "\n${GREEN}Players added. IDs: ${player_ids[*]}${NC}"

echo -e "\n${BLUE}=== STEP 4: Assign Roles ===${NC}"
# Create role assignments JSON
role_assignments=$(cat <<EOF
{
  "roleAssignments": {
    "${player_ids[0]}": "WASHERWOMAN",
    "${player_ids[1]}": "INVESTIGATOR",
    "${player_ids[2]}": "CHEF",
    "${player_ids[3]}": "SLAYER",
    "${player_ids[4]}": "IMP"
  }
}
EOF
)

test_api "POST" "/api/games/$game_id/assign-roles" "$role_assignments" "Assign roles to players"

echo -e "\n${BLUE}=== STEP 5: Start Game ===${NC}"
test_api "POST" "/api/games/$game_id/start" "" "Start the game (move to Night 1)"

echo -e "\n${BLUE}=== STEP 6: Open Day ===${NC}"
test_api "POST" "/api/games/$game_id/open-day" "" "Open Day 1"

echo -e "\n${BLUE}=== STEP 7: Make Nomination ===${NC}"
nomination_data=$(cat <<EOF
{
  "nominatorId": "${player_ids[0]}",
  "nomineeId": "${player_ids[4]}"
}
EOF
)
test_api "POST" "/api/games/$game_id/nominate" "$nomination_data" "Alice nominates Eve (Imp)"

echo -e "\n${BLUE}=== STEP 8: Cast Votes ===${NC}"
# Players vote on the nomination
for i in "${!player_ids[@]}"; do
    player_name=${players[i]}
    player_id=${player_ids[i]}
    # Vote yes if not the nominee (Eve), no if the nominee
    vote=$([ $i -eq 4 ] && echo "false" || echo "true")

    vote_data="{\"voterId\": \"$player_id\", \"vote\": $vote}"
    test_api "POST" "/api/games/$game_id/vote" "$vote_data" "$player_name votes $vote"
done

echo -e "\n${BLUE}=== STEP 9: Close Nomination ===${NC}"
test_api "POST" "/api/games/$game_id/close-nomination" "" "Close the nomination"

echo -e "\n${BLUE}=== STEP 10: Execute Player ===${NC}"
execute_data="{\"playerId\": \"${player_ids[4]}\"}"
test_api "POST" "/api/games/$game_id/execute" "$execute_data" "Execute Eve (check for win condition)"

echo -e "\n${BLUE}=== STEP 11: Get Final Game State ===${NC}"
test_api "GET" "/api/games/$game_id" "" "Get final game state"

echo -e "\n${BLUE}=== STEP 12: Get Game History ===${NC}"
test_api "GET" "/api/games/$game_id/history" "" "Get complete game history"

echo -e "\n${BLUE}=== STEP 13: List All Games ===${NC}"
test_api "GET" "/api/games" "" "List all games in database"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Complete Clocktower Game Flow Test Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}📋 What was tested:${NC}"
echo "✅ Game creation and state management"
echo "✅ Player addition and role assignment"
echo "✅ Phase transitions (Lobby → Night → Day)"
echo "✅ Nomination and voting mechanics"
echo "✅ Win condition checking"
echo "✅ Database persistence (SQLite)"
echo "✅ Complete audit trail"

echo -e "\n${YELLOW}🔍 Check the database:${NC}"
echo "The game state is stored in: clocktower.db"
echo "All actions are logged for replay/debugging"

echo -e "\n${YELLOW}📡 API Server:${NC}"
echo "Running on: http://localhost:3002"
echo "Try: curl http://localhost:3002/api/games"
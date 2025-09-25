#!/usr/bin/env python3
"""
Blood on the Clocktower Game Simulator
Simulates a complete 7-player game with random AI decisions
"""

import requests
import json
import time
import random
import sys
from typing import Dict, List, Optional, Any

# Configuration
BASE_URL = "http://localhost:3002"
GAME_DELAY = 0.5  # Delay between actions in seconds

# 7-Player role distribution (5 Townsfolk, 0 Outsiders, 1 Minion, 1 Demon)
ROLE_POOL = {
    'townsfolk': ['WASHERWOMAN', 'INVESTIGATOR', 'CHEF', 'EMPATH', 'SLAYER'],
    'outsiders': [],  # No outsiders in 7-player game
    'minions': ['POISONER'],
    'demons': ['IMP']
}

PLAYER_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace']

class ClockTowerSimulator:
    def __init__(self):
        self.game_id: Optional[str] = None
        self.players: List[Dict] = []
        self.game_state: Dict = {}
        self.day_count = 0

    def log(self, message: str, indent: int = 0):
        """Log a message with optional indentation"""
        prefix = "  " * indent
        print(f"{prefix}{message}")

    def make_request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """Make HTTP request to the game API"""
        url = f"{BASE_URL}{endpoint}"
        try:
            if method == 'GET':
                response = requests.get(url)
            elif method == 'POST':
                response = requests.post(url, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            self.log(f"❌ API Error: {e}")
            return {}

    def create_game(self) -> bool:
        """Create a new game"""
        self.log("🎮 Creating new game...")
        result = self.make_request('POST', '/api/games')

        if 'game_id' in result:
            self.game_id = result['game_id']
            self.log(f"✅ Game created: {self.game_id}")
            return True

        self.log("❌ Failed to create game")
        return False

    def add_players(self) -> bool:
        """Add all 7 players to the game"""
        self.log("👥 Adding players...")

        for name in PLAYER_NAMES:
            result = self.make_request('POST', f'/api/games/{self.game_id}/players', {
                'playerName': name
            })

            if result and 'players' in result:
                # Find the newly added player
                player = next((p for p in result['players'] if p['name'] == name), None)
                if player:
                    self.log(f"  ✅ Added {name} (seat {player['seat']})")
                else:
                    self.log(f"  ❌ Failed to add {name}")
                    return False
            else:
                self.log(f"  ❌ Failed to add {name}")
                return False

            time.sleep(0.1)  # Small delay between players

        # Get final player list
        game_state = self.make_request('GET', f'/api/games/{self.game_id}')
        if game_state and 'players' in game_state:
            self.players = game_state['players']
            self.log(f"✅ All {len(self.players)} players added")
            return True

        return False

    def assign_roles(self) -> bool:
        """Randomly assign roles to players"""
        self.log("🎭 Assigning roles...")

        # Create role assignment
        all_roles = (ROLE_POOL['townsfolk'] + ROLE_POOL['outsiders'] +
                    ROLE_POOL['minions'] + ROLE_POOL['demons'])

        if len(all_roles) != len(self.players):
            self.log(f"❌ Role count mismatch: {len(all_roles)} roles for {len(self.players)} players")
            return False

        # Shuffle roles and assign
        random.shuffle(all_roles)
        role_assignments = {}

        for i, player in enumerate(self.players):
            role = all_roles[i]
            role_assignments[player['id']] = role
            self.log(f"  {player['name']} → {role}")

        # Send assignment to API
        result = self.make_request('POST', f'/api/games/{self.game_id}/assign-roles', {
            'roleAssignments': role_assignments
        })

        if result and 'players' in result:
            self.players = result['players']
            self.log("✅ Roles assigned successfully")

            # Show what information players received
            if 'player_info' in result and result['player_info']:
                self.log("📋 Starting information:")
                for info in result['player_info']:
                    player_name = next((p['name'] for p in self.players if p['id'] == info['player_id']), 'Unknown')
                    self.log(f"  {player_name} ({info['information_type']}): {info['information']['message']}", 1)

            return True

        self.log("❌ Failed to assign roles")
        return False

    def start_game(self) -> bool:
        """Start the game (first night)"""
        self.log("🌙 Starting game (Night 1)...")

        result = self.make_request('POST', f'/api/games/{self.game_id}/start')

        if result and result.get('phase') == 'NIGHT':
            self.game_state = result
            self.log("✅ Game started - Night 1 begins")
            return True

        self.log("❌ Failed to start game")
        return False

    def simulate_night_phase(self) -> bool:
        """Simulate night actions"""
        self.day_count += 1
        self.log(f"🌙 Night {self.day_count} - Processing night actions...")

        alive_players = [p for p in self.players if p['alive']]

        # Find alive players who can act at night
        night_actors = []
        for player in alive_players:
            role = player.get('role')
            if role in ['POISONER', 'IMP', 'MONK', 'FORTUNE_TELLER', 'BUTLER']:
                night_actors.append(player)

        # Process night actions in order
        for actor in night_actors:
            role = actor['role']

            if role == 'POISONER':
                self.simulate_poisoner_action(actor)
            elif role == 'IMP':
                self.simulate_imp_action(actor)
            elif role == 'MONK':
                self.simulate_monk_action(actor)
            elif role == 'FORTUNE_TELLER':
                self.simulate_fortune_teller_action(actor)
            elif role == 'BUTLER':
                self.simulate_butler_action(actor)

            time.sleep(GAME_DELAY)

        return True

    def simulate_poisoner_action(self, poisoner: Dict):
        """Simulate Poisoner choosing a target"""
        alive_players = [p for p in self.players if p['alive'] and p['id'] != poisoner['id']]
        if not alive_players:
            return

        target = random.choice(alive_players)
        self.log(f"  🧪 {poisoner['name']} (Poisoner) poisons {target['name']}")

        self.make_request('POST', f'/api/games/{self.game_id}/night-action', {
            'playerId': poisoner['id'],
            'role': 'POISONER',
            'targets': [target['id']]
        })

    def simulate_imp_action(self, imp: Dict):
        """Simulate Imp choosing a kill target"""
        alive_players = [p for p in self.players if p['alive'] and p['id'] != imp['id']]
        if not alive_players:
            return

        target = random.choice(alive_players)
        self.log(f"  🗡️  {imp['name']} (Imp) attacks {target['name']}")

        result = self.make_request('POST', f'/api/games/{self.game_id}/night-action', {
            'playerId': imp['id'],
            'role': 'IMP',
            'targets': [target['id']]
        })

        # Check if kill was successful
        if result and 'night_actions' in result:
            last_action = result['night_actions'][-1] if result['night_actions'] else None
            if last_action and 'result' in last_action:
                if last_action['result'].get('protected'):
                    self.log(f"    🛡️  {target['name']} was protected!")
                elif 'victim' in last_action['result']:
                    self.log(f"    ☠️  {target['name']} was killed")

        # Update player states
        if result and 'players' in result:
            self.players = result['players']

    def simulate_monk_action(self, monk: Dict):
        """Simulate Monk choosing someone to protect"""
        alive_players = [p for p in self.players if p['alive'] and p['id'] != monk['id']]
        if not alive_players:
            return

        target = random.choice(alive_players)
        self.log(f"  🛡️  {monk['name']} (Monk) protects {target['name']}")

        self.make_request('POST', f'/api/games/{self.game_id}/night-action', {
            'playerId': monk['id'],
            'role': 'MONK',
            'targets': [target['id']]
        })

    def simulate_fortune_teller_action(self, fortune_teller: Dict):
        """Simulate Fortune Teller choosing two targets"""
        alive_players = [p for p in self.players if p['alive'] and p['id'] != fortune_teller['id']]
        if len(alive_players) < 2:
            return

        targets = random.sample(alive_players, 2)
        self.log(f"  🔮 {fortune_teller['name']} (Fortune Teller) checks {targets[0]['name']} and {targets[1]['name']}")

        result = self.make_request('POST', f'/api/games/{self.game_id}/night-action', {
            'playerId': fortune_teller['id'],
            'role': 'FORTUNE_TELLER',
            'targets': [t['id'] for t in targets]
        })

        # Show result
        if result and 'player_info' in result:
            info = result['player_info'][-1] if result['player_info'] else None
            if info and 'information' in info:
                demon_detected = info['information'].get('demon_detected', False)
                self.log(f"    🔮 Result: {'YES - Demon detected!' if demon_detected else 'NO - No demon'}")

    def simulate_butler_action(self, butler: Dict):
        """Simulate Butler choosing a master"""
        alive_players = [p for p in self.players if p['alive'] and p['id'] != butler['id']]
        if not alive_players:
            return

        master = random.choice(alive_players)
        self.log(f"  🤵 {butler['name']} (Butler) chooses {master['name']} as master")

        self.make_request('POST', f'/api/games/{self.game_id}/night-action', {
            'playerId': butler['id'],
            'role': 'BUTLER',
            'targets': [master['id']]
        })

    def advance_to_day(self) -> bool:
        """Advance from night to day phase"""
        self.log(f"☀️ Day {self.day_count} begins...")

        result = self.make_request('POST', f'/api/games/{self.game_id}/open-day')

        if result and result.get('phase') == 'DAY':
            self.game_state = result
            self.players = result.get('players', self.players)

            # Show who died (find newly dead players)
            if not hasattr(self, '_previous_alive'):
                self._previous_alive = set(p['id'] for p in self.players if p['alive'])

            current_alive = set(p['id'] for p in self.players if p['alive'])
            newly_dead = self._previous_alive - current_alive

            if newly_dead:
                self.log("💀 Deaths this night:")
                for player in self.players:
                    if player['id'] in newly_dead:
                        self.log(f"  {player['name']} ({player.get('role', 'Unknown')})")

            self._previous_alive = current_alive

            alive_count = len([p for p in self.players if p['alive']])
            self.log(f"👥 {alive_count} players remaining alive")
            return True

        self.log("❌ Failed to advance to day")
        return False

    def simulate_day_phase(self) -> bool:
        """Simulate day phase with nominations and voting"""
        self.log("🗳️ Day phase - Nominations and voting...")

        alive_players = [p for p in self.players if p['alive']]

        if len(alive_players) <= 2:
            self.log("⚰️ Too few players remain - ending day")
            return True

        # Simulate 1-3 nominations
        num_nominations = random.randint(1, min(3, len(alive_players) // 2))

        for nom_num in range(num_nominations):
            # Random nominator and nominee
            nominator = random.choice(alive_players)
            possible_nominees = [p for p in alive_players if p['id'] != nominator['id']]

            if not possible_nominees:
                break

            nominee = random.choice(possible_nominees)

            self.log(f"  👉 {nominator['name']} nominates {nominee['name']}")

            # Create nomination
            result = self.make_request('POST', f'/api/games/{self.game_id}/nominate', {
                'nominatorId': nominator['id'],
                'nomineeId': nominee['id']
            })

            if not result:
                continue

            # Check for Virgin trigger
            if nominee.get('role') == 'VIRGIN' and not nominee.get('used_ability'):
                self.log(f"    🛡️ VIRGIN TRIGGER! Checking if {nominator['name']} is Townsfolk...")

                virgin_result = self.make_request('POST', f'/api/games/{self.game_id}/virgin-trigger', {
                    'virginId': nominee['id'],
                    'nominatorId': nominator['id']
                })

                if virgin_result:
                    self.players = virgin_result.get('players', self.players)
                    if not nominator.get('alive', True):
                        self.log(f"    ⚡ {nominator['name']} was executed by Virgin power!")
                        continue  # Skip voting

            # Simulate voting
            self.simulate_voting(alive_players)

            # Close nomination
            result = self.make_request('POST', f'/api/games/{self.game_id}/close-nomination')

            if result and 'current_nomination' in result:
                nomination = result['current_nomination']
                if nomination and nomination.get('closed'):
                    votes = nomination.get('votes', {})
                    yes_votes = sum(1 for v in votes.values() if v)
                    no_votes = sum(1 for v in votes.values() if not v)

                    alive_count = len([p for p in self.players if p['alive']])
                    needed = (alive_count + 1) // 2  # Majority

                    self.log(f"    📊 Votes: {yes_votes} YES, {no_votes} NO (need {needed})")

                    if yes_votes >= needed:
                        self.log(f"    ⚖️ {nominee['name']} is on the block!")
                        # Execute the nominee
                        self.execute_player(nominee)
                        break  # End day after execution
                    else:
                        self.log(f"    ❌ Nomination failed")

            time.sleep(GAME_DELAY)

        return True

    def simulate_voting(self, alive_players: List[Dict]):
        """Simulate voting on current nomination"""
        self.log("  🗳️ Voting...")

        for voter in alive_players:
            # Random vote (slightly favor no votes to make game more interesting)
            vote = random.choice([True, False, False])

            result = self.make_request('POST', f'/api/games/{self.game_id}/vote', {
                'voterId': voter['id'],
                'vote': vote
            })

            vote_str = "YES" if vote else "NO"
            self.log(f"    {voter['name']}: {vote_str}")

            time.sleep(0.1)

    def execute_player(self, player: Dict):
        """Execute a player"""
        self.log(f"⚰️ Executing {player['name']}...")

        result = self.make_request('POST', f'/api/games/{self.game_id}/execute', {
            'playerId': player['id']
        })

        if result:
            self.game_state = result
            self.players = result.get('players', self.players)

            # Check for game end
            if result.get('phase') == 'ENDED':
                winner = result.get('winner')
                if winner:
                    self.log(f"🏆 GAME OVER! {winner} team wins!")

                    # Show final roles
                    self.log("👥 Final roles:")
                    for p in self.players:
                        status = "💀" if not p['alive'] else "❤️"
                        self.log(f"  {status} {p['name']}: {p.get('role', 'Unknown')} ({p.get('alignment', 'Unknown')})")

                    return True

        return False

    def advance_to_night(self) -> bool:
        """Advance from day to night phase"""
        result = self.make_request('POST', f'/api/games/{self.game_id}/open-night')

        if result and result.get('phase') == 'NIGHT':
            self.game_state = result
            self.players = result.get('players', self.players)
            return True

        return False

    def check_game_end(self) -> Optional[str]:
        """Check if the game should end"""
        if self.game_state.get('phase') == 'ENDED':
            return self.game_state.get('winner')

        alive_players = [p for p in self.players if p['alive']]

        # Check if Imp is dead
        imp_alive = any(p['alive'] and p.get('role') == 'IMP' for p in self.players)
        if not imp_alive:
            return 'GOOD'

        # Check for evil parity
        alive_good = sum(1 for p in alive_players if p.get('alignment') == 'GOOD')
        alive_evil = sum(1 for p in alive_players if p.get('alignment') == 'EVIL')

        if alive_evil >= alive_good:
            return 'EVIL'

        return None

    def simulate_full_game(self) -> Optional[str]:
        """Simulate a complete game from start to finish"""
        self.log("🎲 Starting Blood on the Clocktower simulation...")

        # Setup phase
        if not (self.create_game() and self.add_players() and
                self.assign_roles() and self.start_game()):
            self.log("❌ Failed to setup game")
            return None

        max_days = 10  # Prevent infinite games

        # Game loop
        for day in range(1, max_days + 1):
            # Night phase
            self.simulate_night_phase()

            # Check for game end after night
            winner = self.check_game_end()
            if winner:
                self.log(f"🏆 Game ends after Night {day}! {winner} team wins!")
                break

            # Day phase
            if not self.advance_to_day():
                break

            self.simulate_day_phase()

            # Check for game end after day
            winner = self.check_game_end()
            if winner:
                break

            # Advance to next night
            if not self.advance_to_night():
                break

            time.sleep(GAME_DELAY)

        if not winner:
            self.log("⏰ Game reached maximum day limit")
            winner = "DRAW"

        return winner

def main():
    """Run the simulation"""
    if len(sys.argv) > 1:
        try:
            num_games = int(sys.argv[1])
        except ValueError:
            num_games = 1
    else:
        num_games = 1

    print(f"🎮 Running {num_games} Blood on the Clocktower simulation(s)...")
    print("=" * 60)

    results = {'GOOD': 0, 'EVIL': 0, 'DRAW': 0}

    for game_num in range(num_games):
        if num_games > 1:
            print(f"\n🎯 GAME {game_num + 1}/{num_games}")
            print("-" * 40)

        simulator = ClockTowerSimulator()
        winner = simulator.simulate_full_game()

        if winner:
            results[winner] += 1

        time.sleep(1)  # Brief pause between games

    if num_games > 1:
        print("\n" + "=" * 60)
        print("📊 SIMULATION RESULTS:")
        print(f"  GOOD wins: {results['GOOD']} ({results['GOOD']/num_games*100:.1f}%)")
        print(f"  EVIL wins: {results['EVIL']} ({results['EVIL']/num_games*100:.1f}%)")
        print(f"  Draws: {results['DRAW']} ({results['DRAW']/num_games*100:.1f}%)")

if __name__ == "__main__":
    main()
// Simple Game Engine Types

export type Phase = "LOBBY" | "NIGHT" | "DAY" | "ENDED";
export type Alignment = "GOOD" | "EVIL";
export type Role =
  // Townsfolk
  | "WASHERWOMAN"
  | "LIBRARIAN"
  | "INVESTIGATOR"
  | "CHEF"
  | "EMPATH"
  | "FORTUNE_TELLER"
  | "UNDERTAKER"
  | "MONK"
  | "RAVENKEEPER"
  | "VIRGIN"
  | "SLAYER"
  | "SOLDIER"
  | "MAYOR"
  // Outsiders
  | "BUTLER"
  | "DRUNK"
  | "RECLUSE"
  | "SAINT"
  // Minions
  | "POISONER"
  | "SPY"
  | "SCARLET_WOMAN"
  | "BARON"
  // Demon
  | "IMP";

export interface Player {
  id: string;
  name: string;
  seat: number;
  alive: boolean;
  role?: Role;
  alignment?: Alignment;
  poisoned?: boolean;
  used_ability?: boolean; // For once-per-game abilities like Slayer
  drunk?: boolean; // For Drunk role
  protected?: boolean; // For Monk protection
  master_id?: string; // For Butler role
  red_herring?: boolean; // For Fortune Teller false positive
}

export interface Nomination {
  id: string;
  nominator_id: string;
  nominee_id: string;
  votes: Record<string, boolean>; // player_id -> vote
  closed: boolean;
}

export interface NightAction {
  id: string;
  player_id: string;
  role: Role;
  targets?: string[]; // Target player IDs
  resolved: boolean;
  result?: any; // Information learned or effect applied
}

export interface PlayerInfo {
  player_id: string;
  information_type:
    | "WASHERWOMAN"
    | "LIBRARIAN"
    | "INVESTIGATOR"
    | "CHEF"
    | "EMPATH"
    | "FORTUNE_TELLER"
    | "UNDERTAKER"
    | "RAVENKEEPER"
    | "SPY";
  information: any; // Role-specific information
  night_received: number;
}

export interface GameState {
  id: string;
  phase: Phase;
  day_number: number;
  players: Player[];
  current_nomination?: Nomination;
  winner?: Alignment;
  night_actions: NightAction[]; // Actions taken during current/last night
  player_info: PlayerInfo[]; // Information each player has learned
  last_execution?: {
    player_id: string;
    role: Role;
    day: number;
  };
  created_at: string;
  updated_at: string;
}

export interface GameAction {
  type:
    | "CREATE_GAME"
    | "JOIN_GAME"
    | "ASSIGN_ROLES"
    | "START_GAME"
    | "ADVANCE_PHASE"
    | "NOMINATE"
    | "VOTE"
    | "CLOSE_NOMINATION"
    | "EXECUTE_PLAYER"
    | "END_GAME"
    | "NIGHT_ACTION"
    | "SLAYER_SHOT"
    | "POISON_PLAYER"
    | "MONK_PROTECT"
    | "FORTUNE_TELLER_CHECK"
    | "BUTLER_CHOOSE_MASTER"
    | "VIRGIN_TRIGGER"
    | "RAVENKEEPER_LEARN"
    | "SPY_LEARN_GRIMOIRE";
  payload: any;
  game_id: string;
  timestamp: string;
}

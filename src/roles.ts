// Role Definitions and Abilities System
import { Role, Alignment, GameState, Player } from "./types";

export type ActionTiming = "SETUP" | "NIGHT" | "DAY" | "EXECUTION" | "PASSIVE";
export type ActionType =
  | "INFORMATION"
  | "TARGETED"
  | "KILL"
  | "PROTECT"
  | "MODIFY";

export interface RoleAction {
  type: ActionType;
  timing: ActionTiming;
  targets?: number; // Number of targets required (0 = no targets, -1 = any number)
  description: string;
}

export interface RoleDefinition {
  code: Role;
  name: string;
  alignment: Alignment;
  description: string;
  actions: RoleAction[];
  setupEffect?: (game: GameState) => void;
  nightAction?: (game: GameState, playerId: string, targets?: string[]) => any;
  dayAction?: (game: GameState, playerId: string, targets?: string[]) => any;
  passiveEffect?: (game: GameState, playerId: string) => any;
}

// Role Registry
export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  // TOWNSFOLK ROLES
  WASHERWOMAN: {
    code: "WASHERWOMAN",
    name: "Washerwoman",
    alignment: "GOOD",
    description:
      "You start knowing that 1 of 2 players is a particular Townsfolk.",
    actions: [
      {
        type: "INFORMATION",
        timing: "SETUP",
        targets: 0,
        description: "Learn 1 of 2 players is a particular Townsfolk",
      },
    ],
    setupEffect: (game: GameState) => {
      // Implementation will be added when we extend game state
    },
  },

  INVESTIGATOR: {
    code: "INVESTIGATOR",
    name: "Investigator",
    alignment: "GOOD",
    description:
      "You start knowing that 1 of 2 players is a particular Minion.",
    actions: [
      {
        type: "INFORMATION",
        timing: "SETUP",
        targets: 0,
        description: "Learn 1 of 2 players is a particular Minion",
      },
    ],
    setupEffect: (game: GameState) => {
      // Implementation will be added when we extend game state
    },
  },

  CHEF: {
    code: "CHEF",
    name: "Chef",
    alignment: "GOOD",
    description: "You start knowing how many pairs of evil players there are.",
    actions: [
      {
        type: "INFORMATION",
        timing: "SETUP",
        targets: 0,
        description: "Learn number of pairs of adjacent evil players",
      },
    ],
    setupEffect: (game: GameState) => {
      // Implementation will be added when we extend game state
    },
  },

  EMPATH: {
    code: "EMPATH",
    name: "Empath",
    alignment: "GOOD",
    description:
      "Each night, you learn how many of your 2 alive neighbours are evil.",
    actions: [
      {
        type: "INFORMATION",
        timing: "NIGHT",
        targets: 0,
        description: "Learn how many living neighbors are evil",
      },
    ],
    nightAction: (game: GameState, playerId: string) => {
      // Implementation will be added when we extend game state
    },
  },

  SLAYER: {
    code: "SLAYER",
    name: "Slayer",
    alignment: "GOOD",
    description:
      "Once per game, during the day, publicly choose a player: if they are the Demon, they die.",
    actions: [
      {
        type: "KILL",
        timing: "DAY",
        targets: 1,
        description:
          "Once per game, publicly target a player - if Demon, they die",
      },
    ],
    dayAction: (game: GameState, playerId: string, targets?: string[]) => {
      // Implementation will be added when we extend game state
    },
  },

  UNDERTAKER: {
    code: "UNDERTAKER",
    name: "Undertaker",
    alignment: "GOOD",
    description:
      "Each night*, you learn which character died by execution today.",
    actions: [
      {
        type: "INFORMATION",
        timing: "NIGHT",
        targets: 0,
        description: "Learn the role of player executed during the day",
      },
    ],
    nightAction: (game: GameState, playerId: string) => {
      // Implementation will be added when we extend game state
    },
  },

  LIBRARIAN: {
    code: "LIBRARIAN",
    name: "Librarian",
    alignment: "GOOD",
    description:
      "You start knowing that 1 of 2 players is a particular Outsider, or that none are.",
    actions: [
      {
        type: "INFORMATION",
        timing: "SETUP",
        targets: 0,
        description: "Learn 1 of 2 players is a particular Outsider",
      },
    ],
    setupEffect: (game: GameState) => {
      // Implementation will be added when we extend game state
    },
  },

  FORTUNE_TELLER: {
    code: "FORTUNE_TELLER",
    name: "Fortune Teller",
    alignment: "GOOD",
    description:
      "Each night, choose 2 players: you learn if either is a Demon. There is a good player that registers as a Demon to you.",
    actions: [
      {
        type: "INFORMATION",
        timing: "NIGHT",
        targets: 2,
        description:
          "Check 2 players for Demon (may get false positive from red herring)",
      },
    ],
    nightAction: (game: GameState, playerId: string, targets?: string[]) => {
      // Implementation will be added when we extend game state
    },
  },

  MONK: {
    code: "MONK",
    name: "Monk",
    alignment: "GOOD",
    description:
      "Each night*, choose a player (not yourself): they are safe from the Demon tonight.",
    actions: [
      {
        type: "PROTECT",
        timing: "NIGHT",
        targets: 1,
        description: "Protect a player from Demon kills",
      },
    ],
    nightAction: (game: GameState, playerId: string, targets?: string[]) => {
      // Implementation will be added when we extend game state
    },
  },

  RAVENKEEPER: {
    code: "RAVENKEEPER",
    name: "Ravenkeeper",
    alignment: "GOOD",
    description:
      "If you die at night, you may choose a player: you learn their character.",
    actions: [
      {
        type: "INFORMATION",
        timing: "NIGHT",
        targets: 1,
        description: "If killed by Demon, learn one players role",
      },
    ],
    nightAction: (game: GameState, playerId: string, targets?: string[]) => {
      // Implementation will be added when we extend game state
    },
  },

  VIRGIN: {
    code: "VIRGIN",
    name: "Virgin",
    alignment: "GOOD",
    description:
      "The first time you are nominated, if the nominator is a Townsfolk, they are executed immediately.",
    actions: [
      {
        type: "KILL",
        timing: "DAY",
        targets: 0,
        description: "Execute nominator if they are Townsfolk",
      },
    ],
    dayAction: (game: GameState, playerId: string) => {
      // Implementation will be added when we extend game state
    },
  },

  SOLDIER: {
    code: "SOLDIER",
    name: "Soldier",
    alignment: "GOOD",
    description: "You are safe from the Demon.",
    actions: [
      {
        type: "PROTECT",
        timing: "PASSIVE",
        targets: 0,
        description: "Immune to Demon kills",
      },
    ],
    passiveEffect: (game: GameState, playerId: string) => {
      // Implementation will be added when we extend game state
    },
  },

  MAYOR: {
    code: "MAYOR",
    name: "Mayor",
    alignment: "GOOD",
    description:
      "If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead.",
    actions: [
      {
        type: "MODIFY",
        timing: "PASSIVE",
        targets: 0,
        description: "Win condition modifier and death redirection",
      },
    ],
    passiveEffect: (game: GameState, playerId: string) => {
      // Implementation will be added when we extend game state
    },
  },

  // OUTSIDER ROLES
  BUTLER: {
    code: "BUTLER",
    name: "Butler",
    alignment: "GOOD",
    description:
      "Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too.",
    actions: [
      {
        type: "MODIFY",
        timing: "NIGHT",
        targets: 1,
        description: "Choose master for voting restriction",
      },
    ],
    nightAction: (game: GameState, playerId: string, targets?: string[]) => {
      // Implementation will be added when we extend game state
    },
  },

  DRUNK: {
    code: "DRUNK",
    name: "Drunk",
    alignment: "GOOD",
    description:
      "You do not know you are the Drunk. You think you are a Townsfolk character, but your ability malfunctions.",
    actions: [
      {
        type: "MODIFY",
        timing: "PASSIVE",
        targets: 0,
        description: "Ability malfunctions, gives false information",
      },
    ],
    passiveEffect: (game: GameState, playerId: string) => {
      // Implementation will be added when we extend game state
    },
  },

  RECLUSE: {
    code: "RECLUSE",
    name: "Recluse",
    alignment: "GOOD",
    description:
      "You might register as evil & as a Minion or Demon, even if dead.",
    actions: [
      {
        type: "MODIFY",
        timing: "PASSIVE",
        targets: 0,
        description: "May appear evil to investigative roles",
      },
    ],
    passiveEffect: (game: GameState, playerId: string) => {
      // Implementation will be added when we extend game state
    },
  },

  SAINT: {
    code: "SAINT",
    name: "Saint",
    alignment: "GOOD",
    description: "If you die by execution, your team loses.",
    actions: [
      {
        type: "MODIFY",
        timing: "EXECUTION",
        targets: 0,
        description: "Evil wins if Saint is executed",
      },
    ],
    passiveEffect: (game: GameState, playerId: string) => {
      // Implementation will be added when we extend game state
    },
  },

  // MINION ROLES
  POISONER: {
    code: "POISONER",
    name: "Poisoner",
    alignment: "EVIL",
    description:
      "Each night, choose a player: they are poisoned tonight and tomorrow day.",
    actions: [
      {
        type: "MODIFY",
        timing: "NIGHT",
        targets: 1,
        description: "Poison a player - their ability malfunctions",
      },
    ],
    nightAction: (game: GameState, playerId: string, targets?: string[]) => {
      // Implementation will be added when we extend game state
    },
  },

  SPY: {
    code: "SPY",
    name: "Spy",
    alignment: "EVIL",
    description:
      "Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead.",
    actions: [
      {
        type: "INFORMATION",
        timing: "NIGHT",
        targets: 0,
        description: "Learn all roles in the game",
      },
    ],
    nightAction: (game: GameState, playerId: string) => {
      // Implementation will be added when we extend game state
    },
  },

  BARON: {
    code: "BARON",
    name: "Baron",
    alignment: "EVIL",
    description: "There are extra Outsiders in play. [+2 Outsiders]",
    actions: [
      {
        type: "MODIFY",
        timing: "SETUP",
        targets: 0,
        description: "Add 2 extra Outsiders to the game",
      },
    ],
    setupEffect: (game: GameState) => {
      // Implementation will be added when we extend game state
    },
  },

  SCARLET_WOMAN: {
    code: "SCARLET_WOMAN",
    name: "Scarlet Woman",
    alignment: "EVIL",
    description:
      "If there are 5 or more players alive & the Demon dies, you become the Demon.",
    actions: [
      {
        type: "MODIFY",
        timing: "PASSIVE",
        targets: 0,
        description: "Become Demon if Demon dies with 5+ players alive",
      },
    ],
    passiveEffect: (game: GameState, playerId: string) => {
      // Implementation will be added when we extend game state
    },
  },

  // DEMON ROLE
  IMP: {
    code: "IMP",
    name: "Imp",
    alignment: "EVIL",
    description:
      "Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp.",
    actions: [
      {
        type: "KILL",
        timing: "NIGHT",
        targets: 1,
        description: "Kill a player each night",
      },
    ],
    nightAction: (game: GameState, playerId: string, targets?: string[]) => {
      // Implementation will be added when we extend game state
    },
  },
};

// Helper functions
export function getRoleDefinition(role: Role): RoleDefinition {
  return ROLE_DEFINITIONS[role];
}

export function getRoleAlignment(role: Role): Alignment {
  return ROLE_DEFINITIONS[role].alignment;
}

export function getRolesByType(
  type: "TOWNSFOLK" | "OUTSIDER" | "MINION" | "DEMON"
): Role[] {
  const townsfolk: Role[] = [
    "WASHERWOMAN",
    "LIBRARIAN",
    "INVESTIGATOR",
    "CHEF",
    "EMPATH",
    "FORTUNE_TELLER",
    "UNDERTAKER",
    "MONK",
    "RAVENKEEPER",
    "VIRGIN",
    "SLAYER",
    "SOLDIER",
    "MAYOR",
  ];
  const outsiders: Role[] = ["BUTLER", "DRUNK", "RECLUSE", "SAINT"];
  const minions: Role[] = ["POISONER", "SPY", "SCARLET_WOMAN", "BARON"];
  const demons: Role[] = ["IMP"];

  switch (type) {
    case "TOWNSFOLK":
      return townsfolk;
    case "OUTSIDER":
      return outsiders;
    case "MINION":
      return minions;
    case "DEMON":
      return demons;
    default:
      return [];
  }
}

export function getRolesByAlignment(alignment: Alignment): Role[] {
  return Object.keys(ROLE_DEFINITIONS).filter(
    (role) => ROLE_DEFINITIONS[role as Role].alignment === alignment
  ) as Role[];
}

export function getRolesByTiming(timing: ActionTiming): Role[] {
  return Object.keys(ROLE_DEFINITIONS).filter((role) =>
    ROLE_DEFINITIONS[role as Role].actions.some(
      (action) => action.timing === timing
    )
  ) as Role[];
}

export function canRoleActAt(role: Role, timing: ActionTiming): boolean {
  return ROLE_DEFINITIONS[role].actions.some(
    (action) => action.timing === timing
  );
}

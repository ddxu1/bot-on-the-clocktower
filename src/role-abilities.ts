// Role Ability Implementations
import { v4 as uuidv4 } from "uuid";
import { GameState, Player, Role, NightAction, PlayerInfo } from "./types";
import { getRoleDefinition } from "./roles";

// Helper function to get neighbors of a player
function getNeighbors(game: GameState, playerId: string): Player[] {
  const alivePlayers = game.players
    .filter((p) => p.alive)
    .sort((a, b) => a.seat - b.seat);
  const playerIndex = alivePlayers.findIndex((p) => p.id === playerId);

  if (playerIndex === -1 || alivePlayers.length < 3) {
    return [];
  }

  const leftIndex =
    (playerIndex - 1 + alivePlayers.length) % alivePlayers.length;
  const rightIndex = (playerIndex + 1) % alivePlayers.length;

  return [alivePlayers[leftIndex], alivePlayers[rightIndex]];
}

// Helper function to get random players
function getRandomPlayers(players: Player[], count: number): Player[] {
  const shuffled = [...players].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Helper function to count evil pairs
function countEvilPairs(game: GameState): number {
  const alivePlayers = game.players
    .filter((p) => p.alive && p.alignment === "EVIL")
    .sort((a, b) => a.seat - b.seat);
  let pairs = 0;

  for (let i = 0; i < alivePlayers.length - 1; i++) {
    const current = alivePlayers[i];
    const next = alivePlayers[i + 1];

    // Check if seats are adjacent (considering wraparound)
    const allPlayers = game.players
      .filter((p) => p.alive)
      .sort((a, b) => a.seat - b.seat);
    const currentIndex = allPlayers.findIndex((p) => p.id === current.id);
    const nextIndex = allPlayers.findIndex((p) => p.id === next.id);

    if (
      Math.abs(currentIndex - nextIndex) === 1 ||
      (currentIndex === 0 && nextIndex === allPlayers.length - 1) ||
      (currentIndex === allPlayers.length - 1 && nextIndex === 0)
    ) {
      pairs++;
    }
  }

  return pairs;
}

export class RoleAbilities {
  // TOWNSFOLK INFORMATION GATHERING ROLES

  static washerwomanSetup(game: GameState, playerId: string): PlayerInfo {
    const townsFolk: Role[] = [
      "WASHERWOMAN",
      "INVESTIGATOR",
      "CHEF",
      "EMPATH",
      "SLAYER",
      "UNDERTAKER",
    ];
    const townsFolkPlayers = game.players.filter(
      (p) => p.role && townsFolk.includes(p.role) && p.id !== playerId
    );

    if (townsFolkPlayers.length === 0) {
      return {
        player_id: playerId,
        information_type: "WASHERWOMAN",
        information: { message: "No Townsfolk to detect" },
        night_received: 0,
      };
    }

    const targetRole = townsFolkPlayers[0].role!;
    const targetPlayer = townsFolkPlayers[0];
    const randomPlayers = getRandomPlayers(
      game.players.filter((p) => p.id !== playerId),
      2
    );

    // Ensure one of the two players actually has the role
    const candidates = [
      targetPlayer,
      randomPlayers.find((p) => p.id !== targetPlayer.id) || randomPlayers[0],
    ];

    return {
      player_id: playerId,
      information_type: "WASHERWOMAN",
      information: {
        role: targetRole,
        candidates: candidates.map((p) => ({ id: p.id, name: p.name })),
        message: `One of these players is the ${targetRole}: ${candidates
          .map((p) => p.name)
          .join(", ")}`,
      },
      night_received: 0,
    };
  }

  static investigatorSetup(game: GameState, playerId: string): PlayerInfo {
    const minions: Role[] = ["POISONER", "BARON", "SCARLET_WOMAN"];
    const minionPlayers = game.players.filter(
      (p) => p.role && minions.includes(p.role)
    );

    if (minionPlayers.length === 0) {
      return {
        player_id: playerId,
        information_type: "INVESTIGATOR",
        information: { message: "No Minions to detect" },
        night_received: 0,
      };
    }

    const targetRole = minionPlayers[0].role!;
    const targetPlayer = minionPlayers[0];
    const randomPlayers = getRandomPlayers(
      game.players.filter((p) => p.id !== playerId),
      2
    );

    // Ensure one of the two players actually has the role
    const candidates = [
      targetPlayer,
      randomPlayers.find((p) => p.id !== targetPlayer.id) || randomPlayers[0],
    ];

    return {
      player_id: playerId,
      information_type: "INVESTIGATOR",
      information: {
        role: targetRole,
        candidates: candidates.map((p) => ({ id: p.id, name: p.name })),
        message: `One of these players is the ${targetRole}: ${candidates
          .map((p) => p.name)
          .join(", ")}`,
      },
      night_received: 0,
    };
  }

  static chefSetup(game: GameState, playerId: string): PlayerInfo {
    const evilPairs = countEvilPairs(game);

    return {
      player_id: playerId,
      information_type: "CHEF",
      information: {
        pairs: evilPairs,
        message: `${evilPairs} pair(s) of evil players are sitting next to each other`,
      },
      night_received: 0,
    };
  }

  static empathNightAction(game: GameState, playerId: string): PlayerInfo {
    const neighbors = getNeighbors(game, playerId);
    const evilNeighbors = neighbors.filter(
      (p) => p.alignment === "EVIL"
    ).length;

    return {
      player_id: playerId,
      information_type: "EMPATH",
      information: {
        evil_neighbors: evilNeighbors,
        neighbors: neighbors.map((p) => ({ id: p.id, name: p.name })),
        message: `${evilNeighbors} of your living neighbors are evil`,
      },
      night_received: game.day_number,
    };
  }

  static undertakerNightAction(
    game: GameState,
    playerId: string
  ): PlayerInfo | null {
    if (!game.last_execution) {
      return {
        player_id: playerId,
        information_type: "UNDERTAKER",
        information: {
          message: "No execution occurred today",
        },
        night_received: game.day_number,
      };
    }

    const executedPlayer = game.players.find(
      (p) => p.id === game.last_execution!.player_id
    );

    return {
      player_id: playerId,
      information_type: "UNDERTAKER",
      information: {
        executed_player: executedPlayer
          ? { id: executedPlayer.id, name: executedPlayer.name }
          : null,
        role: game.last_execution.role,
        message: `${executedPlayer?.name || "Unknown"} was the ${
          game.last_execution.role
        }`,
      },
      night_received: game.day_number,
    };
  }

  // ACTION ROLES

  static slayerDayAction(
    game: GameState,
    playerId: string,
    targetId: string
  ): { success: boolean; message: string } {
    const player = game.players.find((p) => p.id === playerId);
    const target = game.players.find((p) => p.id === targetId);

    if (!player || !target) {
      return { success: false, message: "Invalid player or target" };
    }

    if (player.used_ability) {
      return { success: false, message: "Slayer has already used their shot" };
    }

    if (!target.alive) {
      return { success: false, message: "Cannot target dead players" };
    }

    player.used_ability = true;

    if (target.role === "IMP") {
      target.alive = false;
      return {
        success: true,
        message: `${target.name} was the Imp and has been slain!`,
      };
    } else {
      return {
        success: true,
        message: `${target.name} was not the Imp. The shot failed.`,
      };
    }
  }

  static poisonerNightAction(
    game: GameState,
    playerId: string,
    targetId: string
  ): NightAction {
    const target = game.players.find((p) => p.id === targetId);

    if (target) {
      // Clear previous poisoning
      game.players.forEach((p) => (p.poisoned = false));

      // Apply new poisoning
      target.poisoned = true;
    }

    return {
      id: uuidv4(),
      player_id: playerId,
      role: "POISONER",
      targets: [targetId],
      resolved: true,
      result: {
        target_name: target?.name,
        message: `${target?.name || "Unknown"} has been poisoned`,
      },
    };
  }

  static impNightAction(
    game: GameState,
    playerId: string,
    targetId: string
  ): NightAction {
    const target = game.players.find((p) => p.id === targetId);
    const imp = game.players.find((p) => p.id === playerId);

    if (!target || !imp) {
      return {
        id: uuidv4(),
        player_id: playerId,
        role: "IMP",
        targets: [targetId],
        resolved: false,
        result: { message: "Invalid target" },
      };
    }

    // If Imp kills themselves, a minion becomes the new Imp
    if (targetId === playerId) {
      const minions = game.players.filter(
        (p) => p.alive && p.alignment === "EVIL" && p.role !== "IMP"
      );

      if (minions.length > 0) {
        const newImp = minions[0];
        newImp.role = "IMP";
        imp.alive = false;

        return {
          id: uuidv4(),
          player_id: playerId,
          role: "IMP",
          targets: [targetId],
          resolved: true,
          result: {
            killed_self: true,
            new_imp: newImp.id,
            message: `${imp.name} killed themselves. ${newImp.name} is now the Imp!`,
          },
        };
      }
    }

    target.alive = false;

    return {
      id: uuidv4(),
      player_id: playerId,
      role: "IMP",
      targets: [targetId],
      resolved: true,
      result: {
        victim: target.id,
        message: `${target.name} was killed by the Imp`,
      },
    };
  }

  static scarletWomanPassive(game: GameState, playerId: string): void {
    const player = game.players.find((p) => p.id === playerId);
    const alivePlayers = game.players.filter((p) => p.alive);
    const impPlayer = game.players.find((p) => p.role === "IMP");

    // If Imp is dead and there are 5+ players alive, Scarlet Woman becomes Imp
    if (
      player &&
      !impPlayer?.alive &&
      alivePlayers.length >= 5 &&
      player.role === "SCARLET_WOMAN"
    ) {
      player.role = "IMP";
    }
  }

  // NEW TOWNSFOLK ROLES

  static librarianSetup(game: GameState, playerId: string): PlayerInfo {
    const outsiders: Role[] = ["BUTLER", "DRUNK", "RECLUSE", "SAINT"];
    const outsiderPlayers = game.players.filter(
      (p) => p.role && outsiders.includes(p.role)
    );

    if (outsiderPlayers.length === 0) {
      return {
        player_id: playerId,
        information_type: "LIBRARIAN",
        information: { message: "There are no Outsiders in play" },
        night_received: 0,
      };
    }

    const targetRole = outsiderPlayers[0].role!;
    const targetPlayer = outsiderPlayers[0];
    const randomPlayers = getRandomPlayers(
      game.players.filter((p) => p.id !== playerId),
      2
    );

    const candidates = [
      targetPlayer,
      randomPlayers.find((p) => p.id !== targetPlayer.id) || randomPlayers[0],
    ];

    return {
      player_id: playerId,
      information_type: "LIBRARIAN",
      information: {
        role: targetRole,
        candidates: candidates.map((p) => ({ id: p.id, name: p.name })),
        message: `One of these players is the ${targetRole}: ${candidates
          .map((p) => p.name)
          .join(", ")}`,
      },
      night_received: 0,
    };
  }

  static fortuneTellerSetup(game: GameState, playerId: string): void {
    // Assign red herring to a random good player
    const goodPlayers = game.players.filter(
      (p) => p.alignment === "GOOD" && p.id !== playerId
    );
    if (goodPlayers.length > 0) {
      const redHerring = getRandomPlayers(goodPlayers, 1)[0];
      redHerring.red_herring = true;
    }
  }

  static fortuneTellerNightAction(
    game: GameState,
    playerId: string,
    targetIds: string[]
  ): PlayerInfo {
    if (targetIds.length !== 2) {
      return {
        player_id: playerId,
        information_type: "FORTUNE_TELLER",
        information: { message: "Must choose exactly 2 players" },
        night_received: game.day_number,
      };
    }

    const targets = targetIds
      .map((id) => game.players.find((p) => p.id === id))
      .filter(Boolean) as Player[];
    const hasRealDemon = targets.some((p) => p.role === "IMP");
    const hasRedHerring = targets.some((p) => p.red_herring);

    const isDemonDetected = hasRealDemon || hasRedHerring;

    return {
      player_id: playerId,
      information_type: "FORTUNE_TELLER",
      information: {
        targets: targets.map((p) => ({ id: p.id, name: p.name })),
        demon_detected: isDemonDetected,
        message: isDemonDetected
          ? "YES - at least one is a Demon"
          : "NO - neither is a Demon",
      },
      night_received: game.day_number,
    };
  }

  static monkNightAction(
    game: GameState,
    playerId: string,
    targetId: string
  ): NightAction {
    const target = game.players.find((p) => p.id === targetId);

    if (!target || targetId === playerId || !target.alive) {
      return {
        id: uuidv4(),
        player_id: playerId,
        role: "MONK",
        targets: [targetId],
        resolved: false,
        result: { message: "Invalid target" },
      };
    }

    // Clear all protections first
    game.players.forEach((p) => (p.protected = false));

    // Apply new protection
    target.protected = true;

    return {
      id: uuidv4(),
      player_id: playerId,
      role: "MONK",
      targets: [targetId],
      resolved: true,
      result: {
        target_name: target.name,
        message: `${target.name} is protected tonight`,
      },
    };
  }

  static ravenkeeperNightAction(
    game: GameState,
    playerId: string,
    targetId: string
  ): PlayerInfo {
    const target = game.players.find((p) => p.id === targetId);

    if (!target) {
      return {
        player_id: playerId,
        information_type: "RAVENKEEPER",
        information: { message: "Invalid target" },
        night_received: game.day_number,
      };
    }

    return {
      player_id: playerId,
      information_type: "RAVENKEEPER",
      information: {
        target: { id: target.id, name: target.name },
        role: target.role,
        message: `${target.name} is the ${target.role}`,
      },
      night_received: game.day_number,
    };
  }

  static virginDayAction(
    game: GameState,
    playerId: string,
    nominatorId: string
  ): { success: boolean; message: string } {
    const virgin = game.players.find((p) => p.id === playerId);
    const nominator = game.players.find((p) => p.id === nominatorId);

    if (!virgin || !nominator) {
      return { success: false, message: "Invalid players" };
    }

    if (virgin.used_ability) {
      return { success: false, message: "Virgin ability already triggered" };
    }

    virgin.used_ability = true;

    // Check if nominator is Townsfolk
    const townsFolk: Role[] = [
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

    if (nominator.role && townsFolk.includes(nominator.role)) {
      nominator.alive = false;
      return {
        success: true,
        message: `${nominator.name} (${nominator.role}) nominated the Virgin and is executed immediately!`,
      };
    } else {
      return {
        success: true,
        message: `${nominator.name} nominated the Virgin, but nothing happens (they are not Townsfolk)`,
      };
    }
  }

  // NEW OUTSIDER ROLES

  static butlerNightAction(
    game: GameState,
    playerId: string,
    masterId: string
  ): NightAction {
    const butler = game.players.find((p) => p.id === playerId);
    const master = game.players.find((p) => p.id === masterId);

    if (!butler || !master || masterId === playerId || !master.alive) {
      return {
        id: uuidv4(),
        player_id: playerId,
        role: "BUTLER",
        targets: [masterId],
        resolved: false,
        result: { message: "Invalid master choice" },
      };
    }

    butler.master_id = masterId;

    return {
      id: uuidv4(),
      player_id: playerId,
      role: "BUTLER",
      targets: [masterId],
      resolved: true,
      result: {
        master_name: master.name,
        message: `${master.name} is your master tomorrow`,
      },
    };
  }

  static drunkSetup(game: GameState, playerId: string): void {
    const player = game.players.find((p) => p.id === playerId);
    if (player) {
      player.drunk = true;
    }
  }

  static reclusePassive(game: GameState, playerId: string): boolean {
    // Return true if Recluse should appear evil (random chance)
    return Math.random() < 0.5;
  }

  static saintExecutionCheck(game: GameState, playerId: string): boolean {
    const player = game.players.find((p) => p.id === playerId);
    return player?.role === "SAINT";
  }

  // NEW MINION ROLES

  static spyNightAction(game: GameState, playerId: string): PlayerInfo {
    const allRoles = game.players
      .filter((p) => p.role)
      .map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        alignment: p.alignment,
        alive: p.alive,
      }));

    return {
      player_id: playerId,
      information_type: "SPY",
      information: {
        grimoire: allRoles,
        message: "You see the complete Grimoire (all player roles)",
      },
      night_received: game.day_number,
    };
  }

  // ENHANCED IMP WITH SOLDIER/MONK PROTECTION

  static impNightActionEnhanced(
    game: GameState,
    playerId: string,
    targetId: string
  ): NightAction {
    const target = game.players.find((p) => p.id === targetId);
    const imp = game.players.find((p) => p.id === playerId);

    if (!target || !imp) {
      return {
        id: uuidv4(),
        player_id: playerId,
        role: "IMP",
        targets: [targetId],
        resolved: false,
        result: { message: "Invalid target" },
      };
    }

    // Check for Soldier immunity
    if (target.role === "SOLDIER") {
      return {
        id: uuidv4(),
        player_id: playerId,
        role: "IMP",
        targets: [targetId],
        resolved: true,
        result: {
          victim: target.id,
          protected: true,
          message: `${target.name} is protected by Soldier ability`,
        },
      };
    }

    // Check for Monk protection
    if (target.protected) {
      return {
        id: uuidv4(),
        player_id: playerId,
        role: "IMP",
        targets: [targetId],
        resolved: true,
        result: {
          victim: target.id,
          protected: true,
          message: `${target.name} is protected by the Monk`,
        },
      };
    }

    // Check for Mayor redirection
    if (target.role === "MAYOR") {
      const otherPlayers = game.players.filter(
        (p) => p.alive && p.id !== targetId && p.id !== playerId
      );
      if (otherPlayers.length > 0) {
        const redirectTarget = getRandomPlayers(otherPlayers, 1)[0];
        redirectTarget.alive = false;

        return {
          id: uuidv4(),
          player_id: playerId,
          role: "IMP",
          targets: [targetId],
          resolved: true,
          result: {
            victim: redirectTarget.id,
            redirected: true,
            original_target: target.id,
            message: `Attack on ${target.name} redirected to ${redirectTarget.name}`,
          },
        };
      }
    }

    // Handle Imp suicide
    if (targetId === playerId) {
      const minions = game.players.filter(
        (p) => p.alive && p.alignment === "EVIL" && p.role !== "IMP"
      );

      if (minions.length > 0) {
        const newImp = minions[0];
        newImp.role = "IMP";
        imp.alive = false;

        return {
          id: uuidv4(),
          player_id: playerId,
          role: "IMP",
          targets: [targetId],
          resolved: true,
          result: {
            killed_self: true,
            new_imp: newImp.id,
            message: `${imp.name} killed themselves. ${newImp.name} is now the Imp!`,
          },
        };
      }
    }

    // Normal kill
    target.alive = false;

    return {
      id: uuidv4(),
      player_id: playerId,
      role: "IMP",
      targets: [targetId],
      resolved: true,
      result: {
        victim: target.id,
        message: `${target.name} was killed by the Imp`,
      },
    };
  }
}

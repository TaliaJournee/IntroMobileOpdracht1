import { MatchPlayer, MatchSetScore } from "@/types";
import { clampSkillLevel } from "@/lib/userProfiles";

export type WinningTeam = 1 | 2;

export function normalizePlayers(raw: unknown): MatchPlayer[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as { uid?: unknown; skillLevel?: unknown };

      if (typeof candidate.uid !== "string") {
        return null;
      }

      const skillLevel =
        typeof candidate.skillLevel === "number" &&
        !Number.isNaN(candidate.skillLevel)
          ? candidate.skillLevel
          : 1.5;

      return {
        uid: candidate.uid,
        skillLevel,
      };
    })
    .filter((player): player is MatchPlayer => player !== null);
}

export function normalizeCompetitiveSets(raw: unknown): MatchSetScore[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as { team1?: unknown; team2?: unknown };

      if (
        typeof candidate.team1 !== "number" ||
        typeof candidate.team2 !== "number"
      ) {
        return null;
      }

      return {
        team1: candidate.team1,
        team2: candidate.team2,
      };
    })
    .filter((set): set is MatchSetScore => set !== null);
}

export function validateCompetitiveSets(sets: MatchSetScore[]): {
  valid: boolean;
  message?: string;
  winnerTeam?: WinningTeam;
} {
  if (sets.length < 2 || sets.length > 3) {
    return {
      valid: false,
      message: "Enter 2 or 3 completed sets.",
    };
  }

  let team1Wins = 0;
  let team2Wins = 0;

  for (let index = 0; index < sets.length; index += 1) {
    if (team1Wins >= 2 || team2Wins >= 2) {
      return {
        valid: false,
        message: "Remove extra sets after the match winner was decided.",
      };
    }

    const currentSet = sets[index];
    const values = [currentSet.team1, currentSet.team2];

    const numbersAreInvalid = values.some(
      (value) => !Number.isInteger(value) || Number.isNaN(value) || value < 0,
    );

    if (numbersAreInvalid) {
      return {
        valid: false,
        message: `Set ${index + 1} must contain whole numbers of 0 or more.`,
      };
    }

    if (currentSet.team1 === currentSet.team2) {
      return {
        valid: false,
        message: `Set ${index + 1} cannot end in a tie.`,
      };
    }

    const winnerScore = Math.max(currentSet.team1, currentSet.team2);
    const loserScore = Math.min(currentSet.team1, currentSet.team2);

    if (winnerScore < 6) {
      return {
        valid: false,
        message: `Set ${index + 1} must be won with at least 6 games.`,
      };
    }

    if (winnerScore - loserScore < 2) {
      return {
        valid: false,
        message: `Set ${index + 1} must be won by 2 games.`,
      };
    }

    if (currentSet.team1 > currentSet.team2) {
      team1Wins += 1;
    } else {
      team2Wins += 1;
    }
  }

  if (team1Wins < 2 && team2Wins < 2) {
    return {
      valid: false,
      message: "A team must win at least 2 sets.",
    };
  }

  if (team1Wins >= 2 && team2Wins >= 2) {
    return {
      valid: false,
      message: "Only one team can win the match.",
    };
  }

  return {
    valid: true,
    winnerTeam: team1Wins >= 2 ? 1 : 2,
  };
}

export function getTeamPlayers(
  players: MatchPlayer[],
  team: WinningTeam,
): MatchPlayer[] {
  return team === 1 ? players.slice(0, 2) : players.slice(2, 4);
}

export function calculateWinLevelDelta(
  winnerLevel: number,
  opponentLevels: number[],
): number {
  if (opponentLevels.length === 0) {
    return 0;
  }

  const highestOpponentLevel = Math.max(...opponentLevels);

  if (highestOpponentLevel >= winnerLevel + 2) {
    return 1;
  }

  if (highestOpponentLevel > winnerLevel) {
    return 0.5;
  }

  if (Math.abs(highestOpponentLevel - winnerLevel) <= 1.5) {
    return 0.5;
  }

  return 0;
}

export function buildWinnerLevelUpdates(
  players: MatchPlayer[],
  winnerTeam: WinningTeam,
) {
  const winners = getTeamPlayers(players, winnerTeam);
  const losers = getTeamPlayers(players, winnerTeam === 1 ? 2 : 1);
  const opponentLevels = losers.map((player) => player.skillLevel);

  return winners.map((winner) => {
    const delta = calculateWinLevelDelta(winner.skillLevel, opponentLevels);

    return {
      uid: winner.uid,
      previousSkillLevel: winner.skillLevel,
      delta,
      nextSkillLevel: clampSkillLevel(winner.skillLevel + delta),
    };
  });
}

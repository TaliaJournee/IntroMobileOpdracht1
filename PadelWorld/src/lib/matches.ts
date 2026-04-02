import { CompetitiveScore, Match } from "@/types";
import dayjs from "dayjs";
import { normalizeCompetitiveSets, normalizePlayers } from "@/lib/competitive";

export const MATCH_COLLECTION = "tbl_matches";

export function parseScore(raw: unknown): CompetitiveScore | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as {
    winnerTeam?: unknown;
    sets?: unknown;
    submittedByUid?: unknown;
    levelsApplied?: unknown;
  };

  if (candidate.winnerTeam !== 1 && candidate.winnerTeam !== 2) {
    return null;
  }

  return {
    winnerTeam: candidate.winnerTeam,
    sets: normalizeCompetitiveSets(candidate.sets),
    submittedByUid:
      typeof candidate.submittedByUid === "string"
        ? candidate.submittedByUid
        : null,
    levelsApplied:
      typeof candidate.levelsApplied === "boolean"
        ? candidate.levelsApplied
        : false,
  };
}

export function buildMatchFromDoc(
  id: string,
  data: Record<string, unknown>,
): Match {
  const players = normalizePlayers(data.players);
  const totalSlots = typeof data.totalSlots === "number" ? data.totalSlots : 4;
  const takenSlots = players.length;

  return {
    id,
    club: (data.club as Match["club"]) ?? null,
    clubId: (data.clubId as string | undefined) ?? undefined,
    genders: (data.genders as string) ?? "",
    name: (data.name as string) ?? "",
    takenSlots,
    totalSlots,
    date: data.date
      ? dayjs((data.date as { toDate: () => Date }).toDate()).format(
          "DD/MM/YYYY HH:mm",
        )
      : "",
    level: typeof data.level === "number" ? data.level : null,
    levelMin: typeof data.levelMin === "number" ? data.levelMin : null,
    levelMax: typeof data.levelMax === "number" ? data.levelMax : null,
    competitive:
      typeof data.competitive === "boolean" ? data.competitive : false,
    createdByUid:
      typeof data.createdByUid === "string" ? data.createdByUid : null,
    players,
    playerUids: players.map((player) => player.uid),
    score: parseScore(data.score),
  };
}

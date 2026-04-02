export interface Club {
  id: string;
  name: string;
  url: string;
  place: string;
  address: string;
  province: string;
}

export interface MatchPlayer {
  uid: string;
  skillLevel: number;
}

export interface MatchSetScore {
  team1: number;
  team2: number;
}

export interface CompetitiveScore {
  winnerTeam: 1 | 2;
  sets: MatchSetScore[];
  submittedByUid?: string | null;
  levelsApplied?: boolean;
}

export interface Match {
  id: string;
  club: Club | null;
  clubId: string;
  name: string;
  date: string;
  takenSlots: number;
  totalSlots: number;
  genders: string;
  level?: number | null;
  levelMin?: number | null;
  levelMax?: number | null;
  competitive: boolean;
  createdByUid?: string | null;
  players?: MatchPlayer[];
  playerUids?: string[];
  score?: CompetitiveScore | null;
}

export interface AppUserProfile {
  uid: string;
  skillLevel: number;
}
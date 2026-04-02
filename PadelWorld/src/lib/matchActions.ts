import {
  DEFAULT_SKILL_LEVEL,
  clampSkillLevel,
  getUserProfile,
} from "@/lib/userProfiles";
import { MATCH_COLLECTION } from "@/lib/matches";
import { MatchPlayer } from "@/types";
import { normalizePlayers } from "@/lib/competitive";
import { db } from "../../firebaseConfig";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import dayjs from "dayjs";

export type CreateMatchParams = {
  clubId: string;
  userUid: string;
  date: string;
  time: string;
  gender: string;
  competitive: boolean;
  competitiveBand?: number;
};

function buildSlotDateTime(dateValue: string, timeValue: string) {
  return dayjs(
    `${dateValue.trim()} ${timeValue.trim()}`,
    "YYYY-MM-DD HH:mm",
    true,
  );
}

export async function createMatchWithOptions({
  clubId,
  userUid,
  date,
  time,
  gender,
  competitive,
  competitiveBand,
}: CreateMatchParams): Promise<string> {
  const parsedDateTime = buildSlotDateTime(date, time);

  if (!parsedDateTime.isValid()) {
    throw new Error("INVALID_DATE_TIME");
  }

  if (!parsedDateTime.isAfter(dayjs())) {
    throw new Error("MATCH_PAST");
  }

  const clubRef = doc(db, "tbl_clubs", clubId);
  const clubSnap = await getDoc(clubRef);

  if (!clubSnap.exists()) {
    throw new Error("CLUB_NOT_FOUND");
  }

  const clubData = clubSnap.data();
  const club = {
    id: clubSnap.id,
    name: clubData.name ?? "",
    place: clubData.place ?? "",
    address: clubData.address ?? "",
    url: clubData.url ?? "",
    province: clubData.province ?? "",
  };

  const slotStart = Timestamp.fromDate(parsedDateTime.toDate());
  const slotEnd = Timestamp.fromDate(parsedDateTime.add(1, "hour").toDate());

  const slotMatchesQuery = query(
    collection(db, MATCH_COLLECTION),
    where("clubId", "==", club.id),
    where("date", ">=", slotStart),
    where("date", "<", slotEnd),
  );

  const snapshot = await getDocs(slotMatchesQuery);

  if (!snapshot.empty) {
    throw new Error("SLOT_TAKEN");
  }

  const profile = await getUserProfile(userUid);
  const playerSkillLevel = profile?.skillLevel ?? DEFAULT_SKILL_LEVEL;
  const savedLevelMin = competitive
    ? clampSkillLevel(playerSkillLevel - (competitiveBand ?? 0.5))
    : null;
  const savedLevelMax = competitive
    ? clampSkillLevel(playerSkillLevel + (competitiveBand ?? 0.5))
    : null;

  const matchName = `${club.name} ${competitive ? "Competitive" : "Friendly"} Match`;

  const docRef = await addDoc(collection(db, MATCH_COLLECTION), {
    name: matchName,
    club,
    clubId: club.id,
    date: slotStart,
    genders: gender,
    level: playerSkillLevel,
    levelMin: savedLevelMin,
    levelMax: savedLevelMax,
    competitive,
    players: [{ uid: userUid, skillLevel: playerSkillLevel }],
    playerUids: [userUid],
    totalSlots: 4,
    createdByUid: userUid,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function joinMatchAfterPayment({
  matchId,
  userUid,
}: {
  matchId: string;
  userUid: string;
}): Promise<void> {
  const profile = await getUserProfile(userUid);
  const playerSkillLevel = profile?.skillLevel ?? DEFAULT_SKILL_LEVEL;
  const matchRef = doc(db, MATCH_COLLECTION, matchId);

  await runTransaction(db, async (transaction) => {
    const matchSnap = await transaction.get(matchRef);

    if (!matchSnap.exists()) {
      throw new Error("MATCH_NOT_FOUND");
    }

    const data = matchSnap.data() as Record<string, unknown>;
    const players = normalizePlayers(data.players);
    const currentTotalSlots =
      typeof data.totalSlots === "number" ? data.totalSlots : 4;
    const hasScore = !!data.score;

    if (players.some((player: MatchPlayer) => player.uid === userUid)) {
      throw new Error("ALREADY_JOINED");
    }

    if (players.length >= currentTotalSlots) {
      throw new Error("MATCH_FULL");
    }

    if (hasScore) {
      throw new Error("MATCH_CLOSED");
    }

    const rawDate = data.date as { toDate?: () => Date } | undefined;
    const matchDate = rawDate?.toDate ? dayjs(rawDate.toDate()) : null;

    if (!matchDate || !matchDate.isAfter(dayjs())) {
      throw new Error("MATCH_PAST");
    }

    const isCompetitive =
      typeof data.competitive === "boolean" ? data.competitive : false;
    const levelMin = typeof data.levelMin === "number" ? data.levelMin : null;
    const levelMax = typeof data.levelMax === "number" ? data.levelMax : null;

    if (isCompetitive && levelMin !== null && levelMax !== null) {
      if (playerSkillLevel < levelMin || playerSkillLevel > levelMax) {
        throw new Error("LEVEL_OUT_OF_RANGE");
      }
    }

    transaction.update(matchRef, {
      players: [...players, { uid: userUid, skillLevel: playerSkillLevel }],
      playerUids: [...players.map((player) => player.uid), userUid],
    });
  });
}

import { AppUserProfile } from "@/types";
import { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export const USER_COLLECTION = "tbl_user";
export const SKILL_MIN = 0.5;
export const SKILL_MAX = 7.0;
export const SKILL_STEP = 0.5;
export const DEFAULT_SKILL_LEVEL = 3.0;

export function clampSkillLevel(value: number) {
  const rounded = Math.round(value * 2) / 2;
  return Math.min(SKILL_MAX, Math.max(SKILL_MIN, rounded));
}

export function formatSkillLevel(value: number) {
  return clampSkillLevel(value).toFixed(1);
}

export function parseSkillLevel(raw: unknown) {
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return DEFAULT_SKILL_LEVEL;
  }

  return clampSkillLevel(raw);
}

export async function ensureUserProfile(user: User): Promise<AppUserProfile> {
  const userRef = doc(db, USER_COLLECTION, user.uid);
  const existingSnap = await getDoc(userRef);

  if (!existingSnap.exists()) {
    const profile: AppUserProfile = {
      uid: user.uid,
      skillLevel: DEFAULT_SKILL_LEVEL,
    };

    await setDoc(userRef, {
      skillLevel: profile.skillLevel,
    });

    return profile;
  }

  const data = existingSnap.data();

  return {
    uid: user.uid,
    skillLevel: parseSkillLevel(data.skillLevel),
  };
}

export async function getUserProfile(
  uid: string,
): Promise<AppUserProfile | null> {
  const userRef = doc(db, USER_COLLECTION, uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data();

  return {
    uid,
    skillLevel: parseSkillLevel(data.skillLevel),
  };
}

export async function saveUserSkillLevel(uid: string, skillLevel: number) {
  const normalizedSkillLevel = clampSkillLevel(skillLevel);
  const userRef = doc(db, USER_COLLECTION, uid);

  await setDoc(
    userRef,
    {
      skillLevel: normalizedSkillLevel,
    },
    { merge: true },
  );

  return normalizedSkillLevel;
}

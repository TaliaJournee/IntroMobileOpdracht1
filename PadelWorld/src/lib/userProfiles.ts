import { AppUserProfile } from "@/types";
import { User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export const USER_COLLECTION = "tbl_user";
export const SKILL_MIN = 0.5;
export const SKILL_MAX = 7.0;
export const SKILL_STEP = 0.5;
export const DEFAULT_SKILL_LEVEL = 1.5;
export const PROVINCE_OPTIONS = [
  "Antwerpen",
  "Brussels",
  "Henegouwen",
  "Luik",
  "Limburg",
  "Luxemburg",
  "Namen",
  "Oost-Vlaanderen",
  "Vlaams-Brabant",
  "Waals-Brabant",
  "West-Vlaanderen",
] as const;

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

export function normalizeProvince(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getProvinceKey(raw: unknown): string | null {
  const normalizedProvince = normalizeProvince(raw);
  return normalizedProvince ? normalizedProvince.toLowerCase() : null;
}

export async function ensureUserProfile(user: User): Promise<AppUserProfile> {
  const userRef = doc(db, USER_COLLECTION, user.uid);
  const existingSnap = await getDoc(userRef);

  if (!existingSnap.exists()) {
    const profile: AppUserProfile = {
      uid: user.uid,
      skillLevel: DEFAULT_SKILL_LEVEL,
      homeProvince: null,
    };

    await setDoc(userRef, {
      skillLevel: profile.skillLevel,
      homeProvince: profile.homeProvince,
    });

    return profile;
  }

  const data = existingSnap.data();

  return {
    uid: user.uid,
    skillLevel: parseSkillLevel(data.skillLevel),
    homeProvince: normalizeProvince(data.homeProvince),
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
    homeProvince: normalizeProvince(data.homeProvince),
  };
}

export async function updateUserHomeProvince(
  uid: string,
  homeProvince: string,
): Promise<string> {
  const normalizedProvince = normalizeProvince(homeProvince);

  if (!normalizedProvince) {
    throw new Error("Please choose a valid home province.");
  }

  const userRef = doc(db, USER_COLLECTION, uid);
  await updateDoc(userRef, {
    homeProvince: normalizedProvince,
  });

  return normalizedProvince;
}

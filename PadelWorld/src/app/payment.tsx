import React, { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_SKILL_LEVEL, clampSkillLevel, getUserProfile } from "@/lib/userProfiles";
import { db } from "../../firebaseConfig";
import { MATCH_COLLECTION } from "@/lib/matches";
import { joinMatchAfterPayment } from "@/lib/matchActions";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildSlotDateTime(dateValue: string, timeValue: string) {
  return dayjs(
    `${dateValue.trim()} ${timeValue.trim()}`,
    "YYYY-MM-DD HH:mm",
    true,
  );
}

const PaymentPage = () => {
  const params = useLocalSearchParams<{
    action?: string | string[];
    matchId?: string | string[];
    clubId?: string | string[];
    date?: string | string[];
    time?: string | string[];
    gender?: string | string[];
    competitiveBand?: string | string[];
  }>();

  const { user } = useAuth();

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const action = firstParam(params.action);
  const matchId = firstParam(params.matchId);
  const clubId = firstParam(params.clubId);
  const date = firstParam(params.date);
  const time = firstParam(params.time);
  const gender = firstParam(params.gender);
  const competitiveBandRaw = firstParam(params.competitiveBand);

  const helperText = useMemo(() => {
    if (action === "join") {
      return "You need to pay before you can join this competitive match.";
    }

    if (action === "create") {
      return "You need to pay before you can create this competitive match.";
    }

    return "This payment page was opened without a valid action.";
  }, [action]);

  const handlePay = async () => {
    if (!user) {
      setError("You must be signed in first.");
      return;
    }

    try {
      setPaying(true);
      setError("");

      if (action === "join") {
        if (!matchId) {
          throw new Error("MISSING_MATCH_ID");
        }

        await joinMatchAfterPayment({
          matchId: matchId,
          userUid: user.uid,
        });

        router.replace({
          pathname: "/matchPage/[idString]",
          params: { idString: matchId },
        });
        return;
      }

      if (action === "create") {
        if (!clubId || !date || !time || !gender) {
          throw new Error("MISSING_CREATE_PARAMS");
        }

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

        const profile = await getUserProfile(user.uid);
        const playerSkillLevel = profile?.skillLevel ?? DEFAULT_SKILL_LEVEL;
        const competitiveBand = Number(competitiveBandRaw ?? "0.5");

        const savedLevelMin = clampSkillLevel(playerSkillLevel - competitiveBand);
        const savedLevelMax = clampSkillLevel(playerSkillLevel + competitiveBand);
        const matchName = `${club.name} Competitive Match`;

        const docRef = await addDoc(collection(db, MATCH_COLLECTION), {
          name: matchName,
          club,
          clubId: club.id,
          date: slotStart,
          genders: gender,
          level: playerSkillLevel,
          levelMin: savedLevelMin,
          levelMax: savedLevelMax,
          competitive: true,
          players: [{ uid: user.uid, skillLevel: playerSkillLevel }],
          playerUids: [user.uid],
          totalSlots: 4,
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
        });

        router.replace({
          pathname: "/matchPage/[idString]",
          params: { idString: docRef.id },
        });
        return;
      }

      throw new Error("INVALID_ACTION");
    } catch (err) {
      console.error("Error during simulated payment:", err);

      if (err instanceof Error) {
        switch (err.message) {
          case "MISSING_MATCH_ID":
            setError("No match was selected for payment.");
            break;
          case "MISSING_CREATE_PARAMS":
            setError("Some match details are missing.");
            break;
          case "MATCH_NOT_FOUND":
            setError("Match not found.");
            break;
          case "CLUB_NOT_FOUND":
            setError("Club not found.");
            break;
          case "ALREADY_JOINED":
            setError("You are already part of this match.");
            break;
          case "MATCH_FULL":
            setError("This match is already full.");
            break;
          case "MATCH_CLOSED":
            setError("This match already has a submitted result.");
            break;
          case "MATCH_PAST":
            setError("You cannot continue with a match that is in the past.");
            break;
          case "LEVEL_OUT_OF_RANGE":
            setError("Your level is outside the allowed competitive range.");
            break;
          case "INVALID_DATE_TIME":
            setError("The selected date or time is invalid.");
            break;
          case "SLOT_TAKEN":
            setError("This club already has a match in that hourly slot.");
            break;
          case "INVALID_ACTION":
            setError("This payment page was opened without a valid action.");
            break;
          default:
            setError("Something went wrong while processing the payment.");
        }
      } else {
        setError("Something went wrong while processing the payment.");
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Please pay the fee</Text>
        <Text style={styles.subtitle}>{helperText}</Text>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={handlePay}
          disabled={paying}
          style={({ pressed }) => [
            styles.payButton,
            pressed && styles.payButtonPressed,
            paying && styles.payButtonDisabled,
          ]}
        >
          {paying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.payButtonText}>pay</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F8FC",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  errorText: {
    color: "#DC2626",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  payButton: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonPressed: {
    opacity: 0.9,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default PaymentPage;
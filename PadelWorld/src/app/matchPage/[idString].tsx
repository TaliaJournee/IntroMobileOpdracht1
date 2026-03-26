import { useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import dayjs from "dayjs";
import { db } from "../../../firebaseConfig";
import { Match } from "@/types";

const MatchPage = () => {
  const { idString } = useLocalSearchParams<{ idString: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMatch = async () => {
      if (!idString) {
        setError("No match ID was provided.");
        setLoading(false);
        return;
      }

      try {
        const matchRef = doc(db, "tbl_matches", idString);
        const matchSnap = await getDoc(matchRef);

        if (!matchSnap.exists()) {
          setError("Match not found.");
          setLoading(false);
          return;
        }

        const data = matchSnap.data();

        setMatch({
          id: matchSnap.id,
          club: data.club ?? null,
          genders: data.genders ?? "",
          name: data.name ?? "",
          takenSlots: data.takenSlots ?? 0,
          totalSlots: data.totalSlots ?? 0,
          date: data.date
            ? dayjs(data.date.toDate()).format("DD/MM/YYYY HH:mm")
            : "",
        });
      } catch (err) {
        console.error("Error loading match:", err);
        setError("Something went wrong while loading the match.");
      } finally {
        setLoading(false);
      }
    };

    loadMatch();
  }, [idString]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.helperText}>Loading match...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No match data available.</Text>
      </View>
    );
  }

  const openSlots = (match.totalSlots ?? 0) - (match.takenSlots ?? 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{openSlots} spots left</Text>
        </View>

        <Text style={styles.title}>{match.name || "Unnamed match"}</Text>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{match.date || "Unknown"}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Gender</Text>
          <Text style={styles.value}>{match.genders || "Unknown"}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Taken slots</Text>
          <Text style={styles.value}>{match.takenSlots ?? 0}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Total slots</Text>
          <Text style={styles.value}>{match.totalSlots ?? 0}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Club</Text>
          <Text style={styles.value}>
            {match.club?.name || "Unknown club"}
            {match.club?.place ? ` • ${match.club.place}` : ""}
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Club address</Text>
          <Text style={styles.value}>
            {match.club?.address || "Unknown"}
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Province</Text>
          <Text style={styles.value}>
            {match.club?.province || "Unknown"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default MatchPage;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F7F8FC",
    padding: 16,
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F7F8FC",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 16,
  },
  badgeText: {
    color: "#166534",
    fontWeight: "700",
    fontSize: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 20,
  },
  infoBlock: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: "#7C8493",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#1F2A44",
    fontWeight: "500",
  },
  helperText: {
    marginTop: 10,
    color: "#6B7280",
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: "600",
    textAlign: "center",
  },
});
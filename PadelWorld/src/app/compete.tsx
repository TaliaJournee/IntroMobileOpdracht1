import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Match } from "@/types";
import { Link } from "expo-router";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";
import { buildMatchFromDoc, MATCH_COLLECTION } from "@/lib/matches";

const Compete = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    const loadCompetitiveMatches = async () => {
      if (!user) {
        setMatches([]);
        setLoading(false);
        return;
      }

      try {
        const matchesQuery = query(
          collection(db, MATCH_COLLECTION),
          where("competitive", "==", true),
          where("playerUids", "array-contains", user.uid),
          orderBy("date", "asc"),
        );

        const snapshot = await getDocs(matchesQuery);
        const competitiveMatches = snapshot.docs.map((docSnap) =>
          buildMatchFromDoc(docSnap.id, docSnap.data() as Record<string, unknown>),
        );

        setMatches(competitiveMatches);
      } catch (error) {
        console.error("Error loading competitive matches:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCompetitiveMatches();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.helperText}>Loading your competitive games...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>My competitive games</Text>
      <Text style={styles.subtitle}>
        These are the competitive matches you already joined. Open one to add a
        result when the match is finished.
      </Text>

      {matches.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No competitive matches yet</Text>
          <Text style={styles.emptyText}>
            Join or create a competitive match first.
          </Text>
        </View>
      ) : (
        matches.map((match) => {
          const isFinished = !!match.score;
          const playersJoined = match.players?.length ?? 0;

          return (
            <Link
              key={match.id}
              href={{
                pathname: "/matchPage/[idString]",
                params: { idString: match.id },
              }}
              asChild
            >
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.dateText}>{match.date}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      isFinished ? styles.statusBadgeFinished : styles.statusBadgeOpen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isFinished
                          ? styles.statusBadgeTextFinished
                          : styles.statusBadgeTextOpen,
                      ]}
                    >
                      {isFinished ? "Finished" : "Awaiting score"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{match.name}</Text>
                <Text style={styles.cardClub}>
                  {match.club?.name || "Unknown club"}
                  {match.club?.place ? ` • ${match.club.place}` : ""}
                </Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>Players: {playersJoined}/4</Text>
                  <Text style={styles.infoText}>Gender: {match.genders}</Text>
                </View>

                {match.score ? (
                  <Text style={styles.scoreText}>
                    Result: {match.score.sets
                      .map((set) => `${set.team1}-${set.team2}`)
                      .join(", ")}
                  </Text>
                ) : (
                  <Text style={styles.scorePendingText}>
                    Open this match to add the score after play.
                  </Text>
                )}
              </Pressable>
            </Link>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F7F8FC",
  },
  helperText: {
    marginTop: 10,
    color: "#6B7280",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 6,
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 14,
    marginBottom: 20,
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 6,
  },
  emptyText: {
    color: "#6B7280",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  dateText: {
    color: "#6B7280",
    fontSize: 13,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusBadgeOpen: {
    backgroundColor: "#EEF2FF",
  },
  statusBadgeFinished: {
    backgroundColor: "#DCFCE7",
  },
  statusBadgeText: {
    fontWeight: "700",
    fontSize: 12,
  },
  statusBadgeTextOpen: {
    color: "#1D4ED8",
  },
  statusBadgeTextFinished: {
    color: "#166534",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 6,
  },
  cardClub: {
    fontSize: 15,
    color: "#4B5563",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  infoText: {
    color: "#1F2A44",
    fontSize: 14,
    fontWeight: "500",
  },
  scoreText: {
    color: "#166534",
    fontWeight: "600",
  },
  scorePendingText: {
    color: "#6B7280",
  },
});

export default Compete;
import { Club, Match } from "@/types";
import { Link, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { collection, getDocs } from "firebase/firestore";
import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  FlatList,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import MatchCard from "../components/matchCard";
import { db } from "../../firebaseConfig";
import { buildMatchFromDoc, MATCH_COLLECTION } from "@/lib/matches";
import ClubCard from "../components/clubCard";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getProvinceKey,
  getUserProfile,
  normalizeProvince,
} from "@/lib/userProfiles";

const Index = () => {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [homeProvince, setHomeProvince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function getClubs(): Promise<Club[]> {
    const querySnapshot = await getDocs(collection(db, "tbl_clubs"));

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: data.name ?? "",
        place: data.place ?? "",
        address: data.address ?? "",
        url: data.url ?? "",
        province: data.province ?? "",
      };
    });
  }

  async function getMatches(): Promise<Match[]> {
    const querySnapshot = await getDocs(collection(db, MATCH_COLLECTION));

    return querySnapshot.docs.map((doc) =>
      buildMatchFromDoc(doc.id, doc.data() as Record<string, unknown>),
    );
  }

  const loadHomepageData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const profile = await getUserProfile(user.uid);
      const selectedProvince = normalizeProvince(profile?.homeProvince);
      setHomeProvince(selectedProvince);

      if (!selectedProvince) {
        setClubs([]);
        setMatches([]);
        return;
      }

      const [clubsData, matchesData] = await Promise.all([
        getClubs(),
        getMatches(),
      ]);

      setClubs(clubsData);
      setMatches(matchesData);
    } catch (err) {
      console.error("Error loading home page data:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load recommendations.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHomepageData();
    }, [loadHomepageData]),
  );

  const homeProvinceKey = getProvinceKey(homeProvince);

  const recommendedClubs = useMemo(() => {
    if (!homeProvinceKey) {
      return [];
    }

    return clubs.filter(
      (club) => getProvinceKey(club.province) === homeProvinceKey,
    );
  }, [clubs, homeProvinceKey]);

  const clubProvinceById = useMemo(() => {
    return new Map(clubs.map((club) => [club.id, getProvinceKey(club.province)]));
  }, [clubs]);

  const recommendedMatches = useMemo(() => {
    if (!homeProvinceKey) {
      return [];
    }

    return matches.filter((match) => {
      const matchProvinceKey =
        getProvinceKey(match.club?.province) ??
        clubProvinceById.get(match.clubId) ??
        null;

      return matchProvinceKey === homeProvinceKey;
    });
  }, [matches, clubProvinceById, homeProvinceKey]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.helperText}>Loading your recommendations...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Don't forget</Text>

      <View style={styles.grid}>
        <Link href="/bookACourt" asChild>
          <Pressable>
            <Image
              source={require("../../assets/images/court-icon.png")}
              style={styles.icon}
            />
          </Pressable>
        </Link>

        <Link href="/compete" asChild>
          <Pressable>
            <Image
              source={require("../../assets/images/compete-icon.png")}
              style={styles.icon}
            />
          </Pressable>
        </Link>

        <Link href="/findAMatch" asChild>
          <Pressable>
            <Image
              source={require("../../assets/images/find-match-icon.png")}
              style={styles.icon}
            />
          </Pressable>
        </Link>
      </View>

      <View style={styles.labelsRow}>
        <Text>Book a court</Text>
        <Text>Compete</Text>
        <Text>Find a match</Text>
      </View>

      {!homeProvince ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Choose your home province first</Text>
          <Text style={styles.emptyText}>
            We only show homepage club and match recommendations after you pick
            a home province in your account page.
          </Text>
          <Pressable
            onPress={() => router.push("/userAccount")}
            style={({ pressed }) => [
              styles.accountButton,
              pressed && styles.accountButtonPressed,
            ]}
          >
            <Text style={styles.accountButtonText}>Open my account</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.block}>
            <Text style={styles.title}>Recommended clubs in {homeProvince}</Text>
            {recommendedClubs.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>
                  No clubs found in {homeProvince} yet.
                </Text>
              </View>
            ) : (
              <FlatList
                data={recommendedClubs}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => <ClubCard club={item} />}
              />
            )}
          </View>

          <View style={styles.block}>
            <Text style={styles.title}>Recommended matches in {homeProvince}</Text>
            {recommendedMatches.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>
                  No matches found in {homeProvince} yet.
                </Text>
              </View>
            ) : (
              <FlatList
                data={recommendedMatches}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => <MatchCard match={item} />}
              />
            )}
          </View>
        </>
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}
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
  block: {
    marginBottom: 16,
  },
  grid: {
    paddingTop: 10,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  title: {
    fontWeight: "900",
    fontSize: 20,
    marginBottom: 20,
  },
  icon: {
    height: 64,
    width: 64,
    borderRadius: 100,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 16,
  },
  accountButton: {
    alignSelf: "flex-start",
    backgroundColor: "#1D4ED8",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  accountButtonPressed: {
    opacity: 0.85,
  },
  accountButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  emptySection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },
  emptySectionText: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 8,
  },
});

export default Index;
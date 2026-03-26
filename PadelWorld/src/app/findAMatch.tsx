import dayjs from "dayjs";
import { Match } from "@/types";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";
import MatchCard from "./matchCard";

const FindAMatchPage = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [dropdown, setDropdown] = useState(false);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  async function getMatches(): Promise<Match[]> {
    const querySnapshot = await getDocs(collection(db, "tbl_matches"));

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        club: data.club ?? null,
        genders: data.genders ?? "",
        name: data.name ?? "",
        takenSlots: data.takenSlots ?? 0,
        totalSlots: data.totalSlots ?? 0,
        date: data.date
          ? dayjs(data.date.toDate()).format("DD/MM/YYYY HH:mm")
          : "",
      };
    });
  }

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const data = await getMatches();
        setMatches(data);
      } catch (error) {
        console.error("Error loading matches:", error);
      }
    };

    loadMatches();
  }, []);

  const genderOptions = useMemo(() => {
    return Array.from(
      new Set(
        matches
          .map((match) => match.genders)
          .filter((gender) => gender && gender.trim() !== "")
      )
    ).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return matches.filter((match) => {
      const matchesGender =
        !selectedGender || match.genders === selectedGender;

      const matchName = match.name?.toLowerCase() ?? "";
      const clubName = match.club?.name?.toLowerCase() ?? "";
      const clubPlace = match.club?.place?.toLowerCase() ?? "";

      const matchesSearch =
        normalizedQuery === "" ||
        matchName.includes(normalizedQuery) ||
        clubName.includes(normalizedQuery) ||
        clubPlace.includes(normalizedQuery);

      return matchesGender && matchesSearch;
    });
  }, [matches, selectedGender, searchQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find a Match</Text>
        <Text style={styles.subtitle}>
          Search by match name, club name, or place
        </Text>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by match, club, or place"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
        {searchQuery.trim() !== "" && (
          <Pressable onPress={() => setSearchQuery("")}>
            <Text style={styles.clearSearch}>✕</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => setDropdown((prev) => !prev)}
        style={({ pressed }) => [
          styles.filterButton,
          pressed && styles.filterButtonPressed,
        ]}
      >
        <View>
          <Text style={styles.filterLabel}>Gender</Text>
          <Text style={styles.filterValue}>
            {selectedGender ?? "All genders"}
          </Text>
        </View>
        <Text style={styles.filterIcon}>{dropdown ? "▲" : "▼"}</Text>
      </Pressable>

      {dropdown && (
        <View style={styles.dropdownCard}>
          <Text style={styles.dropdownTitle}>Choose a gender</Text>

          <View style={styles.chipContainer}>
            <Pressable
              onPress={() => {
                setSelectedGender(null);
                setDropdown(false);
              }}
              style={[
                styles.chip,
                selectedGender === null && styles.chipSelected,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedGender === null && styles.chipTextSelected,
                ]}
              >
                All
              </Text>
            </Pressable>

            {genderOptions.map((gender) => {
              const isSelected = selectedGender === gender;

              return (
                <Pressable
                  key={gender}
                  onPress={() => {
                    setSelectedGender(gender);
                    setDropdown(false);
                  }}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {gender}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {(selectedGender || searchQuery.trim() !== "") && (
        <View style={styles.activeFilterRow}>
          <View>
            {selectedGender && (
              <Text style={styles.activeFilterText}>
                Gender: {selectedGender}
              </Text>
            )}
            {searchQuery.trim() !== "" && (
              <Text style={styles.activeFilterText}>
                Search: {searchQuery}
              </Text>
            )}
          </View>

          <Pressable
            onPress={() => {
              setSelectedGender(null);
              setSearchQuery("");
            }}
          >
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.center}>
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MatchCard match={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No matches found</Text>
              <Text style={styles.emptyText}>
                Try another search or filter.
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

export default FindAMatchPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  searchBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchIcon: {
    fontSize: 16,
    color: "#6B7280",
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1F2A44",
  },
  clearSearch: {
    fontSize: 16,
    color: "#6B7280",
    paddingLeft: 10,
  },
  filterButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  filterButtonPressed: {
    opacity: 0.92,
  },
  filterLabel: {
    fontSize: 12,
    color: "#7C8493",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  filterValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2A44",
  },
  filterIcon: {
    fontSize: 14,
    color: "#4B5563",
  },
  dropdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    backgroundColor: "#EEF2FF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  chipSelected: {
    backgroundColor: "#4F46E5",
  },
  chipText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 14,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  activeFilterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#EDE9FE",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  activeFilterText: {
    color: "#4338CA",
    fontWeight: "600",
  },
  clearText: {
    color: "#4338CA",
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyBox: {
    marginTop: 40,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
    center: {
    alignItems: "center"
  }
});
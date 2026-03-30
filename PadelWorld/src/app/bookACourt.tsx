import dayjs from "dayjs";
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
import { Club, Match } from "@/types";
import ClubCard from "./clubCard";
import React from "react";

const BookACourt = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [dropdown, setDropdown] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
    const loadClubs = async () => {
      try {
        const data = await getClubs();
        setClubs(data);
      } catch (error) {
        console.error("Error loading clubs: ", error);
      }
    };

    loadClubs();
  }, []);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const data = await getMatches();
        setMatches(data);
      } catch (error) {
        console.error("Error loading matches: ", error);
      }
    };

    loadMatches();
  }, []);

  const provinces = useMemo(() => {
    return Array.from(
      new Set(
        clubs
          .map((club) => club.province)
          .filter((province) => province && province.trim() !== "")
      )
    ).sort();
  }, [clubs]);

  const filteredClubs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return clubs.filter((club) => {
      const matchesProvince =
        !selectedProvince || club.province === selectedProvince;

      const matchesSearch =
        normalizedQuery === "" ||
        club.name.toLowerCase().includes(normalizedQuery) ||
        club.place.toLowerCase().includes(normalizedQuery);

      return matchesProvince && matchesSearch;
    });
  }, [clubs, selectedProvince, searchQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Book a Court</Text>
        <Text style={styles.subtitle}>
          Find a club by province, name, or place
        </Text>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by club name or place"
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
          <Text style={styles.filterLabel}>Province</Text>
          <Text style={styles.filterValue}>
            {selectedProvince ?? "All provinces"}
          </Text>
        </View>
        <Text style={styles.filterIcon}>{dropdown ? "▲" : "▼"}</Text>
      </Pressable>

      {dropdown && (
        <View style={styles.dropdownCard}>
          <Text style={styles.dropdownTitle}>Choose a province</Text>

          <View style={styles.chipContainer}>
            <Pressable
              onPress={() => {
                setSelectedProvince(null);
                setDropdown(false);
              }}
              style={[
                styles.chip,
                selectedProvince === null && styles.chipSelected,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedProvince === null && styles.chipTextSelected,
                ]}
              >
                All
              </Text>
            </Pressable>

            {provinces.map((province) => {
              const isSelected = selectedProvince === province;

              return (
                <Pressable
                  key={province}
                  onPress={() => {
                    setSelectedProvince(province);
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
                    {province}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {(selectedProvince || searchQuery.trim() !== "") && (
        <View style={styles.activeFilterRow}>
          <View>
            {selectedProvince && (
              <Text style={styles.activeFilterText}>
                Province: {selectedProvince}
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
              setSelectedProvince(null);
              setSearchQuery("");
            }}
          >
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={filteredClubs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ClubCard club={item} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No clubs found</Text>
            <Text style={styles.emptyText}>Try another search or province.</Text>
          </View>
        }
      />
    </View>
  );
};

export default BookACourt;

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
    opacity: 0.9,
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
  list: {
    flex: 1,
    width: "100%",
  },
  listContent: {
    paddingBottom: 24,
    gap: 16,
    width: "100%",
    alignItems: "center",
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
});
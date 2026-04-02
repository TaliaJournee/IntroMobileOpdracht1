import { Club } from "@/types";
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
import ClubCard from "../components/clubCard";
import React from "react";

const BookACourt = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
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
          Pick a club first, then choose an available slot
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
    fontSize: 18,
    color: "#6B7280",
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  clearSearch: {
    fontSize: 18,
    color: "#9CA3AF",
    paddingLeft: 10,
  },
  filterButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  filterValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  filterIcon: {
    fontSize: 12,
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
    fontSize: 14,
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
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chipSelected: {
    backgroundColor: "#111827",
  },
  chipText: {
    color: "#111827",
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  activeFilterRow: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeFilterText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "600",
  },
  clearText: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 28,
    alignSelf: "center",
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    marginTop: 8,
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

export default BookACourt;
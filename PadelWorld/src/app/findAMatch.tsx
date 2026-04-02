import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
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
import { buildMatchFromDoc, MATCH_COLLECTION } from "@/lib/matches";
import MatchCard from "../components/matchCard";
import React from "react";

dayjs.extend(customParseFormat);

type MatchWithRange = Match & {
  levelMin?: number | null;
  levelMax?: number | null;
};

const GENDER_OPTIONS = ["Mixed", "Men", "Women"];
const TIME_OPTIONS = Array.from({ length: 11 }, (_, index) =>
  `${String(index + 8).padStart(2, "0")}:00`
);
const LEVEL_OPTIONS = Array.from({ length: 14 }, (_, index) =>
  Number((0.5 + index * 0.5).toFixed(1))
);
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const FindAMatchPage = () => {
  const [matches, setMatches] = useState<MatchWithRange[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(dayjs().startOf("month"));

  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [competitiveFilter, setCompetitiveFilter] = useState<
    "all" | "competitive" | "friendly"
  >("all");

  async function getMatches(): Promise<MatchWithRange[]> {
    const querySnapshot = await getDocs(collection(db, MATCH_COLLECTION));

    return querySnapshot.docs.map((doc) =>
      buildMatchFromDoc(doc.id, doc.data() as Record<string, unknown>),
    );
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

  const toggleTime = (time: string) => {
    setSelectedTimes((current) =>
      current.includes(time)
        ? current.filter((value) => value !== time)
        : [...current, time]
    );
  };

  const toggleLevel = (level: number) => {
    setSelectedLevels((current) =>
      current.includes(level)
        ? current.filter((value) => value !== level)
        : [...current, level].sort((a, b) => a - b)
    );
  };

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) {
      return "Any date";
    }

    return dayjs(selectedDate, "YYYY-MM-DD", true).format("dddd D MMMM YYYY");
  }, [selectedDate]);

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = calendarMonth.startOf("month");
    const daysInMonth = calendarMonth.daysInMonth();
    const leadingEmptyCells = (firstDayOfMonth.day() + 6) % 7;

    const cells: Array<{
      key: string;
      label: string;
      value: string | null;
      selected: boolean;
    }> = [];

    for (let index = 0; index < leadingEmptyCells; index += 1) {
      cells.push({
        key: `empty-${index}`,
        label: "",
        value: null,
        selected: false,
      });
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const cellDate = firstDayOfMonth.date(dayNumber);
      const value = cellDate.format("YYYY-MM-DD");

      cells.push({
        key: value,
        label: String(dayNumber),
        value,
        selected: value === selectedDate,
      });
    }

    return cells;
  }, [calendarMonth, selectedDate]);

  const filteredMatches = useMemo(() => {
    const normalizedLocation = locationQuery.trim().toLowerCase();

    return [...matches]
      .filter((match) => {
        const parsedDateTime = dayjs(match.date, "DD/MM/YYYY HH:mm", true);

        const clubName = match.club?.name?.toLowerCase() ?? "";
        const clubPlace = match.club?.place?.toLowerCase() ?? "";
        const clubAddress = match.club?.address?.toLowerCase() ?? "";
        const clubProvince = match.club?.province?.toLowerCase() ?? "";

        const matchesLocation =
          normalizedLocation === "" ||
          clubName.includes(normalizedLocation) ||
          clubPlace.includes(normalizedLocation) ||
          clubAddress.includes(normalizedLocation) ||
          clubProvince.includes(normalizedLocation);

        const matchesGender =
          !selectedGender || match.genders === selectedGender;

        const matchesCompetitive =
          competitiveFilter === "all" ||
          (competitiveFilter === "competitive" && match.competitive) ||
          (competitiveFilter === "friendly" && !match.competitive);

        const matchesDate =
          selectedDate.trim() === "" ||
          (parsedDateTime.isValid() &&
            parsedDateTime.format("YYYY-MM-DD") === selectedDate.trim());

        const matchesTime =
          selectedTimes.length === 0 ||
          (parsedDateTime.isValid() &&
            selectedTimes.includes(parsedDateTime.format("HH:mm")));

        const matchesLevel =
          selectedLevels.length === 0 ||
          !match.competitive ||
          selectedLevels.some((selectedLevel) => {
            if (
              typeof match.levelMin === "number" &&
              typeof match.levelMax === "number"
            ) {
              return (
                selectedLevel >= match.levelMin &&
                selectedLevel <= match.levelMax
              );
            }

            if (typeof match.level === "number") {
              return (
                Number(match.level.toFixed(1)) ===
                Number(selectedLevel.toFixed(1))
              );
            }

            return false;
          });

        return (
          matchesLocation &&
          matchesGender &&
          matchesCompetitive &&
          matchesDate &&
          matchesTime &&
          matchesLevel
        );
      })
      .sort((a, b) => {
        const dateA = dayjs(a.date, "DD/MM/YYYY HH:mm", true);
        const dateB = dayjs(b.date, "DD/MM/YYYY HH:mm", true);

        if (!dateA.isValid() && !dateB.isValid()) return 0;
        if (!dateA.isValid()) return 1;
        if (!dateB.isValid()) return -1;

        return dateA.valueOf() - dateB.valueOf();
      });
  }, [
    matches,
    selectedLevels,
    selectedDate,
    selectedTimes,
    locationQuery,
    selectedGender,
    competitiveFilter,
  ]);

  const activeFilterCount = [
    selectedLevels.length > 0,
    selectedDate.trim() !== "",
    selectedTimes.length > 0,
    locationQuery.trim() !== "",
    selectedGender !== null,
    competitiveFilter !== "all",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedLevels([]);
    setSelectedDate("");
    setSelectedTimes([]);
    setLocationQuery("");
    setSelectedGender(null);
    setCompetitiveFilter("all");
    setCalendarOpen(false);
  };

  return (
    <FlatList
      data={filteredMatches}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MatchCard match={item} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.title}>Find a Match</Text>
              <Text style={styles.subtitle}>
                Filter by level, date, time, location, gender, and match type
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setFiltersOpen((prev) => !prev)}
            style={({ pressed }) => [
              styles.filterButton,
              pressed && styles.filterButtonPressed,
            ]}
          >
            <View>
              <Text style={styles.filterLabel}>Filters</Text>
              <Text style={styles.filterValue}>
                {activeFilterCount === 0
                  ? "No filters selected"
                  : `${activeFilterCount} filter${
                      activeFilterCount === 1 ? "" : "s"
                    } active`}
              </Text>
            </View>
            <Text style={styles.filterIcon}>{filtersOpen ? "▲" : "▼"}</Text>
          </Pressable>

          {filtersOpen && (
            <View style={styles.dropdownCard}>
              <View style={styles.section}>
                <Text style={styles.dropdownTitle}>Location</Text>
                <TextInput
                  value={locationQuery}
                  onChangeText={setLocationQuery}
                  placeholder="Club, place, address, province"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.dropdownTitle}>Date</Text>

                <Pressable
                  onPress={() => setCalendarOpen((current) => !current)}
                  style={({ pressed }) => [
                    styles.selectButton,
                    pressed && styles.selectButtonPressed,
                  ]}
                >
                  <Text style={styles.selectButtonText}>{selectedDateLabel}</Text>
                  <Text style={styles.selectButtonIcon}>
                    {calendarOpen ? "▲" : "▼"}
                  </Text>
                </Pressable>

                {calendarOpen && (
                  <View style={styles.calendarCard}>
                    <View style={styles.calendarHeader}>
                      <Pressable
                        onPress={() =>
                          setCalendarMonth((current) =>
                            current.subtract(1, "month")
                          )
                        }
                        style={styles.calendarArrowButton}
                      >
                        <Text style={styles.calendarArrowText}>‹</Text>
                      </Pressable>

                      <Text style={styles.calendarMonthText}>
                        {calendarMonth.format("MMMM YYYY")}
                      </Text>

                      <Pressable
                        onPress={() =>
                          setCalendarMonth((current) => current.add(1, "month"))
                        }
                        style={styles.calendarArrowButton}
                      >
                        <Text style={styles.calendarArrowText}>›</Text>
                      </Pressable>
                    </View>

                    <View style={styles.calendarGrid}>
                      {WEEKDAY_LABELS.map((weekday) => (
                        <View key={weekday} style={styles.weekdayCell}>
                          <Text style={styles.weekdayText}>{weekday}</Text>
                        </View>
                      ))}

                      {calendarCells.map((cell) => {
                        if (!cell.value) {
                          return (
                            <View
                              key={cell.key}
                              style={styles.calendarDayEmpty}
                            />
                          );
                        }

                        return (
                          <Pressable
                            key={cell.key}
                            onPress={() => {
                              if (cell.value) {
                                setSelectedDate(cell.value);
                                setCalendarMonth(
                                  dayjs(cell.value).startOf("month")
                                );
                                setCalendarOpen(false);
                              }
                            }}
                            style={[
                              styles.calendarDay,
                              cell.selected && styles.calendarDaySelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.calendarDayText,
                                cell.selected && styles.calendarDayTextSelected,
                              ]}
                            >
                              {cell.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Pressable
                      onPress={() => {
                        setSelectedDate("");
                        setCalendarOpen(false);
                      }}
                      style={styles.clearDateButton}
                    >
                      <Text style={styles.clearDateButtonText}>Clear date</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.dropdownTitle}>Time</Text>
                <Text style={styles.helperText}>
                  You can select multiple times.
                </Text>

                <View style={styles.chipContainer}>
                  <Pressable
                    onPress={() => setSelectedTimes([])}
                    style={[
                      styles.chip,
                      selectedTimes.length === 0 && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedTimes.length === 0 && styles.chipTextSelected,
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>

                  {TIME_OPTIONS.map((time) => {
                    const isSelected = selectedTimes.includes(time);

                    return (
                      <Pressable
                        key={time}
                        onPress={() => toggleTime(time)}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {time}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.dropdownTitle}>Gender</Text>

                <View style={styles.chipContainer}>
                  <Pressable
                    onPress={() => setSelectedGender(null)}
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

                  {GENDER_OPTIONS.map((gender) => {
                    const isSelected = selectedGender === gender;

                    return (
                      <Pressable
                        key={gender}
                        onPress={() => setSelectedGender(gender)}
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

              <View style={styles.section}>
                <Text style={styles.dropdownTitle}>Competitive</Text>

                <View style={styles.chipContainer}>
                  <Pressable
                    onPress={() => setCompetitiveFilter("all")}
                    style={[
                      styles.chip,
                      competitiveFilter === "all" && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        competitiveFilter === "all" && styles.chipTextSelected,
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setCompetitiveFilter("competitive")}
                    style={[
                      styles.chip,
                      competitiveFilter === "competitive" &&
                        styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        competitiveFilter === "competitive" &&
                          styles.chipTextSelected,
                      ]}
                    >
                      Competitive
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setCompetitiveFilter("friendly")}
                    style={[
                      styles.chip,
                      competitiveFilter === "friendly" && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        competitiveFilter === "friendly" &&
                          styles.chipTextSelected,
                      ]}
                    >
                      Friendly
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.dropdownTitle}>Level</Text>
                <Text style={styles.helperText}>
                  You can select multiple levels. Friendly matches always stay
                  visible because level does not matter there.
                </Text>

                <View style={styles.chipContainer}>
                  <Pressable
                    onPress={() => setSelectedLevels([])}
                    style={[
                      styles.chip,
                      selectedLevels.length === 0 && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedLevels.length === 0 && styles.chipTextSelected,
                      ]}
                    >
                      All
                    </Text>
                  </Pressable>

                  {LEVEL_OPTIONS.map((level) => {
                    const isSelected = selectedLevels.includes(level);

                    return (
                      <Pressable
                        key={`level-${level}`}
                        onPress={() => toggleLevel(level)}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {level.toFixed(1)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable
                onPress={clearAllFilters}
                style={({ pressed }) => [
                  styles.clearAllButton,
                  pressed && styles.clearAllButtonPressed,
                ]}
              >
                <Text style={styles.clearAllButtonText}>Clear all filters</Text>
              </Pressable>
            </View>
          )}

          {activeFilterCount > 0 && (
            <View style={styles.activeFilterRow}>
              <View style={styles.activeFilterTextBlock}>
                {locationQuery.trim() !== "" && (
                  <Text style={styles.activeFilterText}>
                    Location: {locationQuery}
                  </Text>
                )}

                {selectedDate.trim() !== "" && (
                  <Text style={styles.activeFilterText}>
                    Date: {selectedDate}
                  </Text>
                )}

                {selectedTimes.length > 0 && (
                  <Text style={styles.activeFilterText}>
                    Time: {selectedTimes.join(", ")}
                  </Text>
                )}

                {selectedGender && (
                  <Text style={styles.activeFilterText}>
                    Gender: {selectedGender}
                  </Text>
                )}

                {competitiveFilter !== "all" && (
                  <Text style={styles.activeFilterText}>
                    Type:{" "}
                    {competitiveFilter === "competitive"
                      ? "Competitive"
                      : "Friendly"}
                  </Text>
                )}

                {selectedLevels.length > 0 && (
                  <Text style={styles.activeFilterText}>
                    Level:{" "}
                    {selectedLevels
                      .map((level) => level.toFixed(1))
                      .join(", ")}
                  </Text>
                )}
              </View>

              <Pressable onPress={clearAllFilters}>
                <Text style={styles.clearText}>Clear all</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.resultsText}>
            {filteredMatches.length} match
            {filteredMatches.length === 1 ? "" : "es"} found
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No matches found</Text>
          <Text style={styles.emptyText}>
            Try changing one or more filters.
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F7F8FC",
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 28,
    backgroundColor: "#F7F8FC",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  headerTextBlock: {
    flex: 1,
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
  section: {
    marginBottom: 18,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  helperText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
    lineHeight: 18,
  },
  selectButton: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectButtonPressed: {
    opacity: 0.92,
  },
  selectButtonText: {
    color: "#111827",
    fontSize: 16,
    flex: 1,
  },
  selectButtonIcon: {
    color: "#4B5563",
    fontSize: 12,
  },
  calendarCard: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarArrowButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarArrowText: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2A44",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  weekdayCell: {
    width: "12.8%",
    alignItems: "center",
    marginBottom: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  calendarDayEmpty: {
    width: "12.8%",
    aspectRatio: 1,
  },
  calendarDay: {
    width: "12.8%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDaySelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  calendarDayTextSelected: {
    color: "#FFFFFF",
  },
  clearDateButton: {
    marginTop: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  clearDateButtonText: {
    color: "#1D4ED8",
    fontWeight: "700",
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
  clearAllButton: {
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  clearAllButtonPressed: {
    opacity: 0.92,
  },
  clearAllButtonText: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  activeFilterRow: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  activeFilterTextBlock: {
    flex: 1,
  },
  activeFilterText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  clearText: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  resultsText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "600",
    marginBottom: 14,
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    marginTop: 8,
    marginHorizontal: 16,
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

export default FindAMatchPage;
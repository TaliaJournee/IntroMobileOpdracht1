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

        const isUpcomingMatch =
          parsedDateTime.isValid() && parsedDateTime.isAfter(dayjs());

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
          isUpcomingMatch &&
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
                <Text style={styles.dropdownTitle}>Match type</Text>

                <View style={styles.chipContainer}>
                  {[
                    { label: "All", value: "all" as const },
                    { label: "Competitive", value: "competitive" as const },
                    { label: "Friendly", value: "friendly" as const },
                  ].map((option) => {
                    const isSelected = competitiveFilter === option.value;

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setCompetitiveFilter(option.value)}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.dropdownTitle}>Competitive level</Text>
                <Text style={styles.helperText}>
                  These filters are only applied to competitive matches.
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
                        key={level}
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

              <View style={styles.actionRow}>
                <Pressable
                  onPress={clearAllFilters}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.clearButtonPressed,
                  ]}
                >
                  <Text style={styles.clearButtonText}>Clear all</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No matches found</Text>
          <Text style={styles.emptyText}>
            Try changing or clearing your filters.
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "#F7F8FC",
  },
  headerRow: {
    marginBottom: 16,
  },
  headerTextBlock: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2A44",
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
  },
  filterButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  filterButtonPressed: {
    opacity: 0.92,
  },
  filterLabel: {
    fontSize: 13,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  filterValue: {
    color: "#1F2A44",
    fontSize: 15,
    fontWeight: "600",
  },
  filterIcon: {
    fontSize: 14,
    color: "#1F2A44",
  },
  dropdownCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  section: {
    marginBottom: 18,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 8,
  },
  helperText: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#1F2A44",
    backgroundColor: "#F9FAFB",
  },
  selectButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectButtonPressed: {
    opacity: 0.92,
  },
  selectButtonText: {
    color: "#1F2A44",
    fontSize: 15,
    fontWeight: "500",
  },
  selectButtonIcon: {
    color: "#1F2A44",
    fontSize: 13,
  },
  calendarCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#F9FAFB",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarArrowText: {
    fontSize: 18,
    color: "#1F2A44",
    fontWeight: "700",
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
    width: "12.5%",
    minWidth: 38,
    alignItems: "center",
    marginBottom: 2,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  calendarDayEmpty: {
    width: "12.5%",
    minWidth: 38,
    height: 38,
  },
  calendarDay: {
    width: "12.5%",
    minWidth: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  calendarDaySelected: {
    backgroundColor: "#1D4ED8",
  },
  calendarDayText: {
    color: "#1F2A44",
    fontWeight: "600",
  },
  calendarDayTextSelected: {
    color: "#FFFFFF",
  },
  clearDateButton: {
    marginTop: 14,
    alignSelf: "flex-start",
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipSelected: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  chipText: {
    color: "#1F2A44",
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  clearButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#EEF2FF",
  },
  clearButtonPressed: {
    opacity: 0.9,
  },
  clearButtonText: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
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
});

export default FindAMatchPage;
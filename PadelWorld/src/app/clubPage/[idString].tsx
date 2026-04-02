import React, { useEffect, useMemo, useState } from "react";
import { Club } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  clampSkillLevel,
  DEFAULT_SKILL_LEVEL,
  formatSkillLevel,
  getUserProfile,
} from "@/lib/userProfiles";
import { router, useLocalSearchParams } from "expo-router";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../../firebaseConfig";
import { MATCH_COLLECTION } from "@/lib/matches";

dayjs.extend(customParseFormat);

const GENDER_OPTIONS = ["Mixed", "Men", "Women"];
const COMPETITIVE_BAND_OPTIONS = [0.5, 1.0, 1.5] as const;
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_TIMES = Array.from({ length: 11 }, (_, index) =>
  `${String(index + 8).padStart(2, "0")}:00`,
);

function getInitialDateAndTime() {
  const now = dayjs();

  if (now.hour() < 8) {
    return {
      date: now.format("YYYY-MM-DD"),
      time: "08:00",
    };
  }

  if (now.hour() >= 18) {
    return {
      date: now.add(1, "day").format("YYYY-MM-DD"),
      time: "08:00",
    };
  }

  return {
    date: now.format("YYYY-MM-DD"),
    time: `${String(now.hour() + 1).padStart(2, "0")}:00`,
  };
}

function buildSlotDateTime(dateValue: string, timeValue: string) {
  return dayjs(
    `${dateValue.trim()} ${timeValue.trim()}`,
    "YYYY-MM-DD HH:mm",
    true,
  );
}

function isPastSlot(dateValue: string, timeValue: string) {
  const slotDateTime = buildSlotDateTime(dateValue, timeValue);
  return !slotDateTime.isValid() || !slotDateTime.isAfter(dayjs());
}

const ClubPage = () => {
  const { idString } = useLocalSearchParams<{ idString: string }>();
  const { user } = useAuth();

  const initialValues = useMemo(() => getInitialDateAndTime(), []);

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slotLoading, setSlotLoading] = useState(false);
  const [error, setError] = useState("");

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(
    dayjs(initialValues.date).startOf("month"),
  );

  const [date, setDate] = useState(initialValues.date);
  const [time, setTime] = useState(initialValues.time);
  const [level, setLevel] = useState(DEFAULT_SKILL_LEVEL);
  const [competitiveBand, setCompetitiveBand] =
    useState<(typeof COMPETITIVE_BAND_OPTIONS)[number]>(0.5);
  const [gender, setGender] = useState("Mixed");
  const [competitive, setCompetitive] = useState(false);
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([]);

  useEffect(() => {
    const loadClub = async () => {
      if (!idString) {
        setError("No club ID was provided.");
        setLoading(false);
        return;
      }

      try {
        const clubRef = doc(db, "tbl_clubs", idString);
        const clubSnap = await getDoc(clubRef);

        if (!clubSnap.exists()) {
          setError("Club not found.");
          setLoading(false);
          return;
        }

        const data = clubSnap.data();

        setClub({
          id: clubSnap.id,
          name: data.name ?? "",
          place: data.place ?? "",
          address: data.address ?? "",
          url: data.url ?? "",
          province: data.province ?? "",
        });

        if (user) {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setLevel(profile.skillLevel);
          }
        }
      } catch (err) {
        console.error("Error loading club:", err);
        setError("Something went wrong while loading the club.");
      } finally {
        setLoading(false);
      }
    };

    loadClub();
  }, [idString, user]);

  useEffect(() => {
    const loadOccupiedTimes = async () => {
      if (!club) {
        setOccupiedTimes([]);
        return;
      }

      try {
        setSlotLoading(true);

        const parsedDate = dayjs(date, "YYYY-MM-DD", true);
        const dayStart = Timestamp.fromDate(parsedDate.startOf("day").toDate());
        const dayEnd = Timestamp.fromDate(
          parsedDate.add(1, "day").startOf("day").toDate(),
        );

        const dayMatchesQuery = query(
          collection(db, MATCH_COLLECTION),
          where("clubId", "==", club.id),
          where("date", ">=", dayStart),
          where("date", "<", dayEnd),
        );

        const snapshot = await getDocs(dayMatchesQuery);
        const taken = new Set<string>();

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();

          if (data.date?.toDate) {
            taken.add(dayjs(data.date.toDate()).format("HH:mm"));
          }
        });

        setOccupiedTimes(Array.from(taken));
      } catch (err) {
        console.error("Error checking occupied slots:", err);
        setOccupiedTimes([]);
      } finally {
        setSlotLoading(false);
      }
    };

    loadOccupiedTimes();
  }, [date, club]);

  const availableTimes = useMemo(() => {
    return SLOT_TIMES.filter(
      (slot) => !isPastSlot(date, slot) && !occupiedTimes.includes(slot),
    );
  }, [date, occupiedTimes]);

  useEffect(() => {
    if (availableTimes.length === 0) {
      setTime("");
      return;
    }

    if (!availableTimes.includes(time)) {
      setTime(availableTimes[0]);
    }
  }, [availableTimes, time]);

  const selectedDateLabel = useMemo(() => {
    return dayjs(date, "YYYY-MM-DD", true).format("dddd D MMMM YYYY");
  }, [date]);

  const competitiveLevelMin = useMemo(() => {
    return clampSkillLevel(level - competitiveBand);
  }, [level, competitiveBand]);

  const competitiveLevelMax = useMemo(() => {
    return clampSkillLevel(level + competitiveBand);
  }, [level, competitiveBand]);

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = calendarMonth.startOf("month");
    const daysInMonth = calendarMonth.daysInMonth();
    const leadingEmptyCells = (firstDayOfMonth.day() + 6) % 7;
    const today = dayjs().startOf("day");

    const cells: Array<{
      key: string;
      label: string;
      value: string | null;
      disabled: boolean;
      selected: boolean;
    }> = [];

    for (let index = 0; index < leadingEmptyCells; index += 1) {
      cells.push({
        key: `empty-${index}`,
        label: "",
        value: null,
        disabled: true,
        selected: false,
      });
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const cellDate = firstDayOfMonth.date(dayNumber);
      const value = cellDate.format("YYYY-MM-DD");

      cells.push({
        key: value,
        label: String(dayNumber),
        value: value,
        disabled: cellDate.isBefore(today, "day"),
        selected: value === date,
      });
    }

    return cells;
  }, [calendarMonth, date]);

  const canGoToPreviousMonth = calendarMonth.isAfter(
    dayjs().startOf("month"),
    "month",
  );

  const handleCreateMatch = async () => {
    if (!club) {
      setError("Club not found.");
      return;
    }

    if (!user) {
      setError("You must be signed in to create a match.");
      return;
    }

    if (!time) {
      setError("Please choose an available time slot.");
      return;
    }

    const parsedDateTime = buildSlotDateTime(date, time);

    if (!parsedDateTime.isValid()) {
      setError("Please choose a valid date and time.");
      return;
    }

    if (!parsedDateTime.isAfter(dayjs())) {
      setError("You cannot create a match in the past.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const slotStart = Timestamp.fromDate(parsedDateTime.toDate());
      const slotEnd = Timestamp.fromDate(parsedDateTime.add(1, "hour").toDate());

      const slotMatchesQuery = query(
        collection(db, MATCH_COLLECTION),
        where("clubId", "==", club.id),
        where("date", ">=", slotStart),
        where("date", "<", slotEnd),
      );

      const snapshot = await getDocs(slotMatchesQuery);
      const alreadyTaken = !snapshot.empty;

      if (alreadyTaken) {
        setError("This club already has a match in that hourly slot.");
        setSaving(false);
        return;
      }

      router.push({
        pathname: "/payment",
        params: {
          action: "create",
          clubId: club.id,
          date,
          time,
          gender,
          competitive: String(competitive),
          competitiveBand: String(competitiveBand),
        },
      });
      return;
    } catch (err) {
      console.error("Error creating match:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create the match.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.helperText}>Loading club...</Text>
      </View>
    );
  }

  if (error && !club) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!club) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No club data available.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        {club.url && (
          <Image
            source={{ uri: club.url }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )}

        <Text style={styles.title}>{club.name}</Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Place</Text>
            <Text style={styles.value}>{club.place || "Unknown"}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Province</Text>
            <Text style={styles.value}>{club.province || "Unknown"}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{club.address || "Unknown"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a date</Text>

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
                  onPress={() => {
                    if (canGoToPreviousMonth) {
                      setCalendarMonth((current) => current.subtract(1, "month"));
                    }
                  }}
                  disabled={!canGoToPreviousMonth}
                  style={[
                    styles.calendarArrowButton,
                    !canGoToPreviousMonth && styles.calendarArrowButtonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarArrowText,
                      !canGoToPreviousMonth && styles.calendarArrowTextDisabled,
                    ]}
                  >
                    ‹
                  </Text>
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
                    return <View key={cell.key} style={styles.calendarDayEmpty} />;
                  }

                  return (
                    <Pressable
                      key={cell.key}
                      onPress={() => {
                        if (!cell.disabled && cell.value) {
                          setDate(cell.value);
                          setCalendarMonth(dayjs(cell.value).startOf("month"));
                          setCalendarOpen(false);
                          setError("");
                        }
                      }}
                      disabled={cell.disabled}
                      style={[
                        styles.calendarDay,
                        cell.selected && styles.calendarDaySelected,
                        cell.disabled && styles.calendarDayDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          cell.selected && styles.calendarDayTextSelected,
                          cell.disabled && styles.calendarDayTextDisabled,
                        ]}
                      >
                        {cell.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a time slot</Text>
          <Text style={styles.helper}>
            Open slots are selectable. Taken slots are grey and blocked.
          </Text>

          <View style={styles.slotLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotOpen]} />
              <Text style={styles.legendText}>Open</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotTaken]} />
              <Text style={styles.legendText}>Taken</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotPast]} />
              <Text style={styles.legendText}>Past</Text>
            </View>
          </View>

          <View style={styles.chipContainer}>
            {SLOT_TIMES.map((slot) => {
              const isPast = isPastSlot(date, slot);
              const isTaken = occupiedTimes.includes(slot);
              const isDisabled = isPast || isTaken;
              const isSelected = time === slot && !isDisabled;

              return (
                <Pressable
                  key={slot}
                  onPress={() => {
                    if (!isDisabled) {
                      setTime(slot);
                      setError("");
                    }
                  }}
                  disabled={isDisabled}
                  style={[
                    styles.slotChip,
                    styles.slotChipOpen,
                    isSelected && styles.slotChipSelected,
                    isTaken && styles.slotChipTaken,
                    isPast && styles.slotChipPast,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotChipTimeText,
                      isSelected && styles.slotChipTimeTextSelected,
                      (isTaken || isPast) && styles.slotChipTimeTextDisabled,
                    ]}
                  >
                    {slot}
                  </Text>

                  <Text
                    style={[
                      styles.slotChipStatusText,
                      isSelected && styles.slotChipStatusTextSelected,
                      (isTaken || isPast) && styles.slotChipStatusTextDisabled,
                    ]}
                  >
                    {isTaken ? "Taken" : isPast ? "Past" : "Open"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {slotLoading && (
            <Text style={styles.smallHelper}>Checking club availability...</Text>
          )}

          {!slotLoading && availableTimes.length === 0 && (
            <Text style={styles.errorText}>
              No available hourly slots for this club on that date.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Match details</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Level</Text>
            <Text style={styles.helper}>This match uses your current level.</Text>

            <View style={styles.levelPillReadOnly}>
              <Text style={styles.levelValue}>{formatSkillLevel(level)}</Text>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.chipContainer}>
              {GENDER_OPTIONS.map((option) => {
                const isSelected = gender === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setGender(option)}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Competitive</Text>
            <View style={styles.chipContainer}>
              <Pressable
                onPress={() => setCompetitive(false)}
                style={[styles.chip, !competitive && styles.chipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    !competitive && styles.chipTextSelected,
                  ]}
                >
                  No
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setCompetitive(true)}
                style={[styles.chip, competitive && styles.chipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    competitive && styles.chipTextSelected,
                  ]}
                >
                  Yes
                </Text>
              </Pressable>
            </View>
          </View>

          {competitive ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Competitive level band</Text>
              <Text style={styles.helper}>
                Choose how far from your own level other players may be for this
                competitive match.
              </Text>

              <View style={styles.chipContainer}>
                {COMPETITIVE_BAND_OPTIONS.map((option) => {
                  const isSelected = competitiveBand === option;

                  return (
                    <Pressable
                      key={`band-${option}`}
                      onPress={() => setCompetitiveBand(option)}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        ±{formatSkillLevel(option)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.rangeSummaryCard}>
                <Text style={styles.rangeSummaryText}>
                  Allowed range: {formatSkillLevel(competitiveLevelMin)} -{" "}
                  {formatSkillLevel(competitiveLevelMax)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Level range</Text>
              <Text style={styles.helper}>
                This is a friendly match, so the level range does not matter.
              </Text>
            </View>
          )}
        </View>

        {!!error && !!club && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={handleCreateMatch}
          disabled={saving || availableTimes.length === 0}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
            (saving || availableTimes.length === 0) && styles.saveButtonDisabled,
          ]}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Creating match..." : "Create match at this club"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  container: {
    flexGrow: 1,
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
  coverImage: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: "#E5E7EB",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 20,
  },
  infoGrid: {
    marginBottom: 8,
  },
  infoBlock: {
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 12,
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
  helper: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  smallHelper: {
    marginTop: 10,
    color: "#6B7280",
    fontSize: 13,
  },
  rangeSummaryCard: {
    marginTop: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rangeSummaryText: {
    color: "#312E81",
    fontWeight: "700",
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
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
  calendarArrowButtonDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.5,
  },
  calendarArrowText: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  calendarArrowTextDisabled: {
    color: "#9CA3AF",
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
  calendarDayDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  calendarDayTextSelected: {
    color: "#FFFFFF",
  },
  calendarDayTextDisabled: {
    color: "#9CA3AF",
  },
  slotLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: "100%",
  },
  legendDotOpen: {
    backgroundColor: "#22C55E",
  },
  legendDotTaken: {
    backgroundColor: "#9CA3AF",
  },
  legendDotPast: {
    backgroundColor: "#D1D5DB",
  },
  legendText: {
    fontSize: 13,
    color: "#4B5563",
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
  slotChip: {
    minWidth: 92,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  slotChipOpen: {
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
  },
  slotChipSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  slotChipTaken: {
    backgroundColor: "#E5E7EB",
    borderColor: "#D1D5DB",
  },
  slotChipPast: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  slotChipTimeText: {
    color: "#166534",
    fontWeight: "700",
    fontSize: 14,
  },
  slotChipTimeTextSelected: {
    color: "#FFFFFF",
  },
  slotChipTimeTextDisabled: {
    color: "#6B7280",
  },
  slotChipStatusText: {
    marginTop: 2,
    color: "#15803D",
    fontSize: 11,
    fontWeight: "600",
  },
  slotChipStatusTextSelected: {
    color: "#FFFFFF",
  },
  slotChipStatusTextDisabled: {
    color: "#6B7280",
  },
  fieldBlock: {
    marginBottom: 18,
  },
  levelPillReadOnly: {
    alignSelf: "center",
    minWidth: 96,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
  },
  levelValue: {
    color: "#1D4ED8",
    fontSize: 22,
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default ClubPage;
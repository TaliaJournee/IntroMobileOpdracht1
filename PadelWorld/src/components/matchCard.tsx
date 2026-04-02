import { Match } from "@/types";
import { formatSkillLevel } from "@/lib/userProfiles";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";

type Props = {
  match: Match;
};

const MatchCard = ({ match }: Props) => {
  if (!match) return null;

  const takenSlots = match.takenSlots ?? 0;
  const totalSlots = match.totalSlots ?? 0;
  const openSlots = Math.max(totalSlots - takenSlots, 0);

  const levelRangeText =
    typeof match.levelMin === "number" && typeof match.levelMax === "number"
      ? `${formatSkillLevel(match.levelMin)} - ${formatSkillLevel(match.levelMax)}`
      : typeof match.level === "number"
      ? formatSkillLevel(match.level)
      : "Any";

  const matchTypeText = match.competitive ? "Competitive" : "Friendly";

  return (
    <View style={styles.card}>
      <Link
        href={{
          pathname: "/matchPage/[idString]",
          params: { idString: match.id.toString() },
        }}
        asChild
      >
        <Pressable
          style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
        >
          <View style={styles.topRow}>
            <Text style={styles.timeStyle}>{match.date || "Unknown time"}</Text>

            <View
              style={[
                styles.spotsBadge,
                openSlots > 0 ? styles.spotsBadgeOpen : styles.spotsBadgeFull,
              ]}
            >
              <Text
                style={[
                  styles.spotsBadgeText,
                  openSlots > 0
                    ? styles.spotsBadgeTextOpen
                    : styles.spotsBadgeTextFull,
                ]}
              >
                {openSlots} spot{openSlots === 1 ? "" : "s"} left
              </Text>
            </View>
          </View>

          <Text style={styles.nameStyle}>{match.name || "Unnamed match"}</Text>

          <Text style={styles.clubStyle}>
            {match.club?.name || "Unknown club"}
            {match.club?.place ? ` • ${match.club.place}` : ""}
          </Text>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.typeBadge,
                match.competitive ? styles.typeBadgeCompetitive : styles.typeBadgeFriendly,
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  match.competitive
                    ? styles.typeBadgeTextCompetitive
                    : styles.typeBadgeTextFriendly,
                ]}
              >
                {matchTypeText}
              </Text>
            </View>

            <View style={styles.genderBadge}>
              <Text style={styles.genderBadgeText}>{match.genders || "Any"}</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Level</Text>
              <Text style={styles.valueText}>
                {match.competitive ? levelRangeText : "Any"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Players</Text>
              <Text style={styles.valueText}>
                {takenSlots}/{totalSlots}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Location</Text>
              <Text style={styles.valueText}>
                {match.club?.address ||
                  match.club?.place ||
                  match.club?.province ||
                  "Unknown"}
              </Text>
            </View>
          </View>
        </Pressable>
      </Link>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 14,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    overflow: "hidden",
    padding: 16
  },
  pressable: {
    padding: 16,
  },
  pressed: {
    opacity: 0.92,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 12,
  },
  timeStyle: {
    color: "#6B7280",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  spotsBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  spotsBadgeOpen: {
    backgroundColor: "#DCFCE7",
  },
  spotsBadgeFull: {
    backgroundColor: "#FEE2E2",
  },
  spotsBadgeText: {
    fontWeight: "700",
    fontSize: 12,
  },
  spotsBadgeTextOpen: {
    color: "#166534",
  },
  spotsBadgeTextFull: {
    color: "#B91C1C",
  },
  nameStyle: {
    fontWeight: "700",
    fontSize: 20,
    color: "#1F2A44",
    marginBottom: 6,
  },
  clubStyle: {
    fontSize: 15,
    color: "#4B5563",
    marginBottom: 12,
    fontWeight: "500",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  typeBadgeCompetitive: {
    backgroundColor: "#FEE2E2",
  },
  typeBadgeFriendly: {
    backgroundColor: "#DBEAFE",
  },
  typeBadgeText: {
    fontWeight: "700",
    fontSize: 12,
  },
  typeBadgeTextCompetitive: {
    color: "#B91C1C",
  },
  typeBadgeTextFriendly: {
    color: "#1D4ED8",
  },
  genderBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  genderBadgeText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 12,
  },
  infoBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  label: {
    fontWeight: "700",
    color: "#4B5563",
    fontSize: 14,
  },
  valueText: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    color: "#1F2A44",
    fontWeight: "600",
  },
});

export default MatchCard;
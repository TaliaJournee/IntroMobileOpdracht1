import { Match } from "@/types";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  match: Match;
};

const MatchCard = ({ match }: Props) => {
  if (!match) return null;

  const openSlots = (match.totalSlots ?? 0) - (match.takenSlots ?? 0);

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
            <Text style={styles.timeStyle}>{match.date}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{openSlots} spots left</Text>
            </View>
          </View>

          <Text style={styles.nameStyle}>{match.name}</Text>

          <Text style={styles.clubStyle}>
            {match.club?.name || "Unknown club"}
            {match.club?.place ? ` • ${match.club.place}` : ""}
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              <Text style={styles.label}>⚤ Gender:</Text> {match.genders}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.label}>Taken:</Text> {match.takenSlots}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.label}>Total:</Text> {match.totalSlots}
            </Text>
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
    marginRight: 12,
    width: 320,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    overflow: "hidden",
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
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  timeStyle: {
    color: "#6B7280",
    fontSize: 13,
    flex: 1,
  },
  badge: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: {
    color: "#166534",
    fontWeight: "700",
    fontSize: 12,
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
  infoBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#1F2A44",
  },
  label: {
    fontWeight: "700",
  },
});

export default MatchCard;
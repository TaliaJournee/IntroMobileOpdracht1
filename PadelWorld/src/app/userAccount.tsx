import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_SKILL_LEVEL,
  ensureUserProfile,
  formatSkillLevel,
} from "@/lib/userProfiles";

const UserAccountPage = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [skillLevel, setSkillLevel] = useState(DEFAULT_SKILL_LEVEL);
  const [error, setError] = useState("");

  const displayName = useMemo(() => {
    if (!user) return "Unknown user";
    if (user.displayName?.trim()) return user.displayName;
    if (user.email?.trim()) return user.email.split("@")[0];
    return "Unknown user";
  }, [user]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setError("");
        const profile = await ensureUserProfile(user);
        setSkillLevel(profile.skillLevel);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load your account.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.helperText}>Loading account...</Text>
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
        <Text style={styles.title}>My account</Text>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{displayName}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? "No email available"}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Skill level</Text>
          <View style={styles.skillPill}>
            <Text style={styles.skillValue}>{formatSkillLevel(skillLevel)}</Text>
          </View>
          <Text style={styles.helper}>
            New players start at 1.5. Your level now changes automatically
            through competitive match results, so it can no longer be edited
            here.
          </Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </ScrollView>
  );
}

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
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2A44",
    marginBottom: 24,
  },
  infoBlock: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    color: "#7C8493",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: "#1F2A44",
    fontWeight: "500",
  },
  skillPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  skillValue: {
    color: "#1D4ED8",
    fontSize: 22,
    fontWeight: "700",
  },
  helper: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  errorText: {
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 8,
  },
});

export default UserAccountPage;
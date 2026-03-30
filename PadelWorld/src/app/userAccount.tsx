import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_SKILL_LEVEL,
  SKILL_MAX,
  SKILL_MIN,
  SKILL_STEP,
  clampSkillLevel,
  ensureUserProfile,
  formatSkillLevel,
  saveUserSkillLevel,
} from "@/lib/userProfiles";

export default function UserAccountPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillLevel, setSkillLevel] = useState(DEFAULT_SKILL_LEVEL);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
            : "Failed to load your account."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const decreaseSkill = () => {
    setSuccess("");
    setError("");
    setSkillLevel((current) => clampSkillLevel(current - SKILL_STEP));
  };

  const increaseSkill = () => {
    setSuccess("");
    setError("");
    setSkillLevel((current) => clampSkillLevel(current + SKILL_STEP));
  };

  const handleSave = async () => {
    if (!user) {
      setError("You need to be signed in.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const savedLevel = await saveUserSkillLevel(user.uid, skillLevel);
      setSkillLevel(savedLevel);
      setSuccess("Your skill level has been saved.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save your skill level."
      );
    } finally {
      setSaving(false);
    }
  };

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
          <Text style={styles.helper}>
            Set your level from 0.5 to 7.0 in steps of 0.5.
          </Text>

          <View style={styles.skillRow}>
            <Pressable
              onPress={decreaseSkill}
              disabled={skillLevel <= SKILL_MIN}
              style={({ pressed }) => [
                styles.stepButton,
                skillLevel <= SKILL_MIN && styles.stepButtonDisabled,
                pressed && skillLevel > SKILL_MIN && styles.stepButtonPressed,
              ]}
            >
              <Text style={styles.stepButtonText}>−</Text>
            </Pressable>

            <View style={styles.skillPill}>
              <Text style={styles.skillValue}>
                {formatSkillLevel(skillLevel)}
              </Text>
            </View>

            <Pressable
              onPress={increaseSkill}
              disabled={skillLevel >= SKILL_MAX}
              style={({ pressed }) => [
                styles.stepButton,
                skillLevel >= SKILL_MAX && styles.stepButtonDisabled,
                pressed && skillLevel < SKILL_MAX && styles.stepButtonPressed,
              ]}
            >
              <Text style={styles.stepButtonText}>+</Text>
            </Pressable>
          </View>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {!!success && <Text style={styles.successText}>{success}</Text>}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
            saving && styles.saveButtonDisabled,
          ]}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save skill level"}
          </Text>
        </Pressable>
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
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#1F2A44",
    fontWeight: "500",
  },
  helper: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 14,
  },
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  stepButtonPressed: {
    opacity: 0.85,
  },
  stepButtonText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 24,
  },
  skillPill: {
    minWidth: 110,
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
  },
  skillValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#4338CA",
  },
  errorText: {
    color: "#DC2626",
    marginBottom: 12,
    fontWeight: "600",
  },
  successText: {
    color: "#15803D",
    marginBottom: 12,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
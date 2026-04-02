import React, { useEffect, useMemo, useState } from "react";
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
  ensureUserProfile,
  formatSkillLevel,
  normalizeProvince,
  PROVINCE_OPTIONS,
  updateUserHomeProvince,
} from "@/lib/userProfiles";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const UserAccountPage = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingProvince, setSavingProvince] = useState(false);
  const [skillLevel, setSkillLevel] = useState(DEFAULT_SKILL_LEVEL);
  const [homeProvince, setHomeProvince] = useState<string | null>(null);
  const [provinceOptions, setProvinceOptions] = useState<string[]>([
    ...PROVINCE_OPTIONS,
  ]);
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
        const [profile, clubsSnapshot] = await Promise.all([
          ensureUserProfile(user),
          getDocs(collection(db, "tbl_clubs")),
        ]);

        const loadedProvinceOptions = Array.from(
          new Set(
            clubsSnapshot.docs
              .map((docSnap) => normalizeProvince(docSnap.data().province))
              .filter((province): province is string => Boolean(province)),
          ),
        ).sort((left, right) => left.localeCompare(right));

        setProvinceOptions(
          loadedProvinceOptions.length > 0
            ? loadedProvinceOptions
            : [...PROVINCE_OPTIONS],
        );
        setSkillLevel(profile.skillLevel);
        setHomeProvince(profile.homeProvince);
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

  const handleProvinceSelect = async (province: string) => {
    if (!user || savingProvince || province === homeProvince) {
      return;
    }

    try {
      setSavingProvince(true);
      setError("");
      setSuccess("");
      const savedProvince = await updateUserHomeProvince(user.uid, province);
      setHomeProvince(savedProvince);
      setSuccess(`Home province saved as ${savedProvince}.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save your home province.",
      );
    } finally {
      setSavingProvince(false);
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
          <View style={styles.skillPill}>
            <Text style={styles.skillValue}>{formatSkillLevel(skillLevel)}</Text>
          </View>
          <Text style={styles.helper}>
            New players start at 1.5. Your level changes automatically
            through competitive match results.
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Home province</Text>
          <Text style={styles.helper}>
            Choose your home province. The home page will only recommend clubs
            and matches from this province when you set it.
          </Text>

          <View style={styles.provinceList}>
            {provinceOptions.map((province) => {
              const selected = homeProvince === province;

              return (
                <Pressable
                  key={province}
                  onPress={() => handleProvinceSelect(province)}
                  disabled={savingProvince}
                  style={({ pressed }) => [
                    styles.provinceChip,
                    selected && styles.provinceChipSelected,
                    pressed && !savingProvince && styles.provinceChipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.provinceChipText,
                      selected && styles.provinceChipTextSelected,
                    ]}
                  >
                    {province}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.currentProvinceText}>
            Current home province: {homeProvince ?? "Not chosen yet"}
          </Text>

          {savingProvince && (
            <Text style={styles.helperText}>Saving your home province...</Text>
          )}
        </View>

        {!!success && <Text style={styles.successText}>{success}</Text>}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
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
  provinceList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  provinceChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  provinceChipSelected: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  provinceChipPressed: {
    opacity: 0.85,
  },
  provinceChipText: {
    color: "#1F2A44",
    fontWeight: "600",
  },
  provinceChipTextSelected: {
    color: "#FFFFFF",
  },
  currentProvinceText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2A44",
  },
  successText: {
    color: "#15803D",
    fontWeight: "600",
    marginTop: 8,
  },
  errorText: {
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 8,
  },
});

export default UserAccountPage;
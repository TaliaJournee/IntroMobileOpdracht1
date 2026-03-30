import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { signOutWithGoogle } from "@/lib/googleAuth";

export default function AccountMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const displayName = useMemo(() => {
    if (!user) return "Account";
    if (user.displayName?.trim()) return user.displayName;
    if (user.email?.trim()) return user.email.split("@")[0];
    return "Account";
  }, [user]);

  const initial = displayName.charAt(0).toUpperCase();

  const openAccountPage = () => {
    setOpen(false);
    router.push("/userAccount");
  };

  const handleLogout = async () => {
    try {
      setError("");
      setOpen(false);
      await signOutWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed.");
    }
  };

  if (!user) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <Text numberOfLines={1} style={styles.triggerText}>
          {displayName}
        </Text>

        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={() => {}}>
            <Text style={styles.menuName}>{displayName}</Text>

            {!!user.email && (
              <Text numberOfLines={1} style={styles.menuEmail}>
                {user.email}
              </Text>
            )}

            <View style={styles.divider} />

            <Pressable
              onPress={openAccountPage}
              style={({ pressed }) => [
                styles.menuButton,
                pressed && styles.menuButtonPressed,
              ]}
            >
              <Text style={styles.menuButtonText}>My account</Text>
            </Pressable>

            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.menuButtonPressed,
              ]}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: 220,
  },
  triggerPressed: {
    opacity: 0.85,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    maxWidth: 140,
  },
  chevron: {
    marginLeft: 8,
    fontSize: 12,
    color: "#4B5563",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  menu: {
    position: "absolute",
    top: Platform.OS === "web" ? 62 : 88,
    right: 16,
    width: 240,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  menuEmail: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  menuButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuButtonPressed: {
    opacity: 0.85,
  },
  menuButtonText: {
    color: "#111827",
    fontWeight: "700",
    textAlign: "center",
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    color: "#DC2626",
    marginTop: 4,
    textAlign: "right",
  },
});
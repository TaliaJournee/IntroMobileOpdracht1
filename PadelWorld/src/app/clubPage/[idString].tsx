import { useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../../firebaseConfig";
import { Club } from "@/types";

const ClubPage = () => {
  const { idString } = useLocalSearchParams<{ idString: string }>();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      } catch (err) {
        console.error("Error loading club:", err);
        setError("Something went wrong while loading the club.");
      } finally {
        setLoading(false);
      }
    };

    loadClub();
  }, [idString]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.helperText}>Loading club...</Text>
      </View>
    );
  }

  if (error) {
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {!!club.url && (
          <Image
            source={{ uri: club.url }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )}

        <Text style={styles.title}>{club.name}</Text>

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
    </ScrollView>
  );
};

export default ClubPage;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F7F8FC",
    padding: 16,
    justifyContent: "center",
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
  infoBlock: {
    marginBottom: 16,
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
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: "600",
    textAlign: "center",
  },
});
import {Club, Match} from "@/types";
import { Link } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View, ScrollView, FlatList } from "react-native";
import ClubCard from "./clubCard";
import MatchCard from "./matchCard";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

const Index = () => {
  const [clubs, setClubs] = useState<Club[]>([])
  const [matches, setMatches] = useState<Match[]>([]);

  async function getClubs(): Promise<Club[]> {
  const querySnapshot = await getDocs(collection(db, "tbl_clubs"));

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      name: data.name ?? "",
      place: data.place ?? "",
      address: data.address ?? "",
      url: data.url ?? "",
    };
  });
  }
  useEffect(() => {
    const loadClubs = async () => {
        try {
          const data = await getClubs();
          console.log("Clubs: ", data);
          setClubs(data);
        }
        catch(error) {
          console.error("Error loading clubs: ", error);
        }
    }
    loadClubs()
  }, []);

    async function getMatches(): Promise<Match[]> {
  const querySnapshot = await getDocs(collection(db, "tbl_matches"));

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      club: data.club ?? null,
      genders: data.genders ?? "",
      name: data.name ?? "",
      takenSlots: data.takenSlots ?? 0,
      totalSlots: data.totalSlots ?? 0,
      date: dayjs(data.date.toDate()).format("DD/MM/YYYY HH:mm") ?? ""
    };
  });
  }
  useEffect(() => {
    const loadMatches = async () => {
        try {
          const data = await getMatches();
          console.log("Matches: ", data);
          setMatches(data);
        }
        catch(error) {
          console.error("Error loading matches: ", error);
        }
    }
    loadMatches()
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Don't forget</Text>
      <View style={styles.grid}>
        <Link href="/bookACourt" asChild>
          <Pressable>
            <Image source={require("../../assets/images/court-icon.png")} style={styles.icon} />
          </Pressable>
        </Link>
        <Link href="/learn" asChild>
          <Pressable>
            <Image source={require("../../assets/images/learn-icon.png")} style={styles.icon} />
          </Pressable>
        </Link>
                <Link href="/compete" asChild>
          <Pressable>
            <Image source={require("../../assets/images/compete-icon.png")} style={styles.icon} />
          </Pressable>
        </Link>
                <Link href="/findAMatch" asChild>
          <Pressable>
            <Image source={require("../../assets/images/find-match-icon.png")} style={styles.icon} />
          </Pressable>
        </Link>
      </View>
          <View style={{flexDirection: "row", justifyContent:"space-between", marginBottom:20}}>
            <Text>Book a court</Text>
            <Text>Learn</Text>
            <Text>Compete</Text>
            <Text>Find a match</Text>
          </View>
      <View style={styles.block}>
        <Text style={styles.title}>Suggested clubs for you</Text>
        <FlatList
          data={clubs}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => <ClubCard club={item} />}
/>
      </View>
      <View style={styles.block}>
        <Text style={styles.title}>Suggested for you</Text>
      </View>
      <View style={styles.block}>
        <Text style={styles.title}>Compete with others</Text>
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => <MatchCard match={item} />}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  block: {
    marginBottom: 16
  },
  grid: {
    paddingTop: 10,
    paddingBottom: 70,
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around"
  },
  title:{
    fontWeight: "900",
    fontSize: 20,
    marginBottom: 20
  },
  icon : {
    height: 64,
    width: 64,
    borderRadius: 100,
  },
})

export default Index;
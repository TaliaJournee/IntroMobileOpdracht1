import {Club, Match} from "@/types";
import { Link } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import ClubCard from "./clubCard";
import MatchCard from "./matchCard";
import { beginAsyncEvent } from "react-native/Libraries/Performance/Systrace";


const Index = () => {

  const testClubs: Club[] = [
    {
      id: 1,
      name : "GARRINCHA Antwerpen Noord",
      place: "Antwerpen",
      url: "https://res.cloudinary.com/playtomic/image/upload/v1661178417/pro/tenants/961beb4f-b8d9-421d-b825-b01fe7effda1/1661178416632.jpg"
    }
  ]
  const testMatches: Match[] = [
    {
      id: 1,
      name : "TestMatch",
      club : testClubs[0],
      date : "18-03-2026",
      time : "17:00",
      openSlots : 3,
      totalSlots : 4,
      genders : "Open"
    }
  ]

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
        <ClubCard club={testClubs[0]} />
      </View>
      <View style={styles.block}>
        <Text style={styles.title}>Suggested for you</Text>
      </View>
      <View style={styles.block}>
        <Text style={styles.title}>Compete with others</Text>
        <MatchCard match={testMatches[0]} />
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
import Club from "@/types";
import { Icon, Link } from "expo-router";
import { Button, Image, Pressable, StyleSheet, Text, View } from "react-native";
import ClubCard from "./clubCard";


const Index = () => {

  const testClubs: Club[] = [
    {
      name : "GARRINCHA Antwerpen Noord",
      place: "Antwerpen",
      url: "https://res.cloudinary.com/playtomic/image/upload/v1661178417/pro/tenants/961beb4f-b8d9-421d-b825-b01fe7effda1/1661178416632.jpg"
    }
  ]

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Don't forget</Text>
      <View style={styles.grid}>
        <Link href="/" asChild>
          <Pressable>
            <Image source={require("../../assets/images/court-icon.png")} style={styles.icon} />
          </Pressable>
        </Link>
                <Link href="/" asChild>
          <Pressable>
            <Image source={require("../../assets/images/learn-icon.png")} style={styles.icon} />
          </Pressable>
        </Link>
                <Link href="/" asChild>
          <Pressable>
            <Image source={require("../../assets/images/compete-icon.png")} style={styles.icon} />
          </Pressable>
        </Link>
                <Link href="/" asChild>
          <Pressable>
            <Image source={require("../../assets/images/find-match-icon.png")} style={styles.icon} />
          </Pressable>
        </Link>
      </View>
      <Text style={styles.title}>Suggested clubs for you</Text>
      <ClubCard club={testClubs[0]} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  grid: {
    paddingTop: 10,
    paddingBottom: 90,
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
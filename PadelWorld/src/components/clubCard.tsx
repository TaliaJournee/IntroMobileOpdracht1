import { Club } from "@/types";
import { Link } from "expo-router";
import React from "react";
import { View, Image, Text, StyleSheet, Pressable } from "react-native";


type Props = {
    club: Club
}
const ClubCard = ({club}: Props) => {
    if(!club) return null;
    return (
        <View style={styles.card}>
            <Link href={{pathname: "/clubPage/[idString]", params: {idString: club.id.toString()}}} asChild >
                <Pressable>
                    <Image source={{uri: club.url}} style={styles.img} />
                    <Text style={styles.clubName}>{club.name}</Text>
                    <Text style={styles.clubPlace}>{club.place}</Text>
                </Pressable>
            </Link>
        </View>
    );
}

const styles = StyleSheet.create ({
    card: {
        borderRadius: 12,
        overflow: "hidden",
        width: 340,
        backgroundColor: "lightgrey",
        marginHorizontal: 8,
        marginBottom: 16
    },
    img: {
        width: "100%",
        height: 160,
        resizeMode: "cover"
    },
    clubName: {
        fontWeight: "600",
        fontSize: 22,
        paddingLeft: 10,
        paddingTop: 10
    },
    clubPlace: {
        fontSize: 15,
        color: "grey",
        paddingLeft: 10,
        paddingBottom: 20
    }
})

export default ClubCard;
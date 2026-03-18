import { Club } from "@/types";
import { Link } from "expo-router";
import { View, Image, Text, StyleSheet, Pressable } from "react-native";


type Props = {
    club: Club
}
const ClubCard = ({club}: Props) => {
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
        width: "auto",
        backgroundColor: "lightgrey"
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
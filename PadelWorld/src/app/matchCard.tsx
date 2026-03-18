import { Match } from "@/types";
import { Link } from "expo-router";
import { Pressable, View, Text, StyleSheet } from "react-native";

type Props = {
    match: Match
}

const MatchCard = ({match}: Props) => {
    return (
        <View style={styles.card}>
            <Link href={{pathname: "/matchPage/[idString]", params: {idString: match.id.toString()}}} asChild >
                <Pressable>
                    <Text style={styles.timeStyle}>{match.date} - {match.time}</Text>
                    <Text style={styles.nameStyle}>{match.name}</Text>
                    <Text><Text style={styles.nameStyle}>⚤</Text>: {match.genders} - <Text style={{fontWeight: "bold"}}>Open slots</Text>: {match.openSlots}/{match.totalSlots}</Text>
                    <Text style={styles.nameStyle}>{match.club.name}</Text>
                </Pressable>
            </Link>
        </View>
    )
}

const styles = StyleSheet.create ({
    card: {
        borderRadius: 12,
        overflow: "hidden",
        width: "auto",
        borderStyle: "solid",
        borderColor: "black",
        borderWidth: 1,
        padding: 16
    },
    timeStyle: {
        color: "grey",
    },
    nameStyle: {
        fontWeight: "bold",
        fontSize: 17
    }
})

export default MatchCard;
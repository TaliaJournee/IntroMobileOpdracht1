import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native"

const MatchPage = () => {
    const {idString} = useLocalSearchParams<{idString: string}>();
    const id = parseInt(idString);
    return (
        <Text>{idString}</Text>
    )
}

export default MatchPage;
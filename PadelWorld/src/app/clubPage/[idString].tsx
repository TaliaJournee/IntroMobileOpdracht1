import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native"

const ClubPage = () => {
    const {idString} = useLocalSearchParams<{idString: string}>();
    const id = parseInt(idString);
    return (
        <Text>{idString}</Text>
    )
}

export default ClubPage;
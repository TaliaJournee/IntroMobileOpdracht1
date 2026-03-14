import { StyleSheet, Text, View } from "react-native";

const Index = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>hoi</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  title:{
    fontWeight: 900,
    fontSize: 30
  }
})

export default Index;
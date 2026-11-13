import { APP_NAME } from "@atlas/core";
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        {APP_NAME}
      </Text>
      <Text>Nothing here yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "600",
  },
});

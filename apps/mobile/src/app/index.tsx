import { APP_NAME } from "@atlas/core";
import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-white">
      <Text
        accessibilityRole="header"
        className="text-3xl font-semibold tracking-tight text-neutral-950"
      >
        {APP_NAME}
      </Text>
      <Text className="text-sm text-neutral-500">Nothing here yet.</Text>
    </View>
  );
}

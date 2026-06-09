import { Stack } from "expo-router";
import { LogBox } from "react-native";
import { AppProvider } from "./AppContext";

LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
]);

export default function Layout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProvider>
  );
}
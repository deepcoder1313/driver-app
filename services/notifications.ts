import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync() {
  try {
    // Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    // Check existing permission
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    // Ask if permission hasn't been granted
    if (existingStatus !== "granted") {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("❌ Notification permission not granted");
      return null;
    }

    const tokenResponse =
      await Notifications.getExpoPushTokenAsync();

    const pushToken = tokenResponse.data;

    console.log("🔔 EXPO PUSH TOKEN:", pushToken);

    return pushToken;

  } catch (error) {
    console.log("❌ PUSH TOKEN ERROR:", error);
    return null;
  }
}
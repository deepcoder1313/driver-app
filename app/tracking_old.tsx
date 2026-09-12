
import AsyncStorage from "@react-native-async-storage/async-storage";

import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../services/api";

export default function TrackingScreen() {
  const [driver, setDriver] = useState<any>(null);
  const [locationSubscription, setLocationSubscription] =
  useState<Location.LocationSubscription | null>(null);

  const [latitude, setLatitude] = useState(0);
  const [busId, setBusId] = useState("");
  const [longitude, setLongitude] = useState(0);


const loadDriver = async () => {
  try {
    const data = await AsyncStorage.getItem("driver");

    if (!data) return;

    const driverData = JSON.parse(data);

    setDriver(driverData);

    console.log("Driver Loaded:", driverData);
  } catch (error) {
    console.log(error);
  }
};
useEffect(() => {
  console.log("✅ Tracking Screen mounted");
  loadDriver();
}, []);


const startTracking = async () => {

  const driverData = await AsyncStorage.getItem("driver");

if (driverData) {
  const driver = JSON.parse(driverData);

  const tripRes = await API.post("/trips/start", {
    driverId: driver._id,
    busNo: driver.assignedBus,
  });

  console.log("🚀 Trip Started:", tripRes.data);

  await AsyncStorage.setItem(
    "currentTripId",
    tripRes.data._id
  );
  
}
   console.log("🚀 Start Tracking button clicked");

  try {
    const { status } =
      await Location.requestForegroundPermissionsAsync();
    console.log("Permission Status:", status);
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Location permission is required."
      );
      return;
    }

    const subscription =
    await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.High,
    timeInterval: 3000,
    distanceInterval: 5,
  },
  async (location) => {
    console.log("📍 Location callback triggered");
    const lat = location.coords.latitude;
    const lng = location.coords.longitude;

    setLatitude(lat);
    setLongitude(lng);

    console.log("Latitude:", lat);
    console.log("Longitude:", lng);

try {
  const token = await AsyncStorage.getItem("token");

  await API.put(
    "/buses/update-location",
    {
      latitude: lat,
      longitude: lng,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log("✅ Location updated");
} catch (err) {
  console.log("❌ Backend Error:", err);
}
  }
);
    setLocationSubscription(subscription);

    Alert.alert(
      "Success",
      "Live Tracking Started 🚍"
    );
  } catch (error) {
    console.log(error);
  }
};



const stopTracking = async () => {

  const tripId = await AsyncStorage.getItem("currentTripId");

if (tripId) {
  await API.put(`/trips/stop/${tripId}`);

  console.log("🛑 Trip Stopped");

  await AsyncStorage.removeItem("currentTripId");
}
  if (locationSubscription) {
    locationSubscription.remove();
    setLocationSubscription(null);
  }

  Alert.alert(
    "Tracking",
    "Live Tracking Stopped."
  );
};




  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        📍 Live Tracking
      </Text>

      {driver && (
        <>
          <Text style={styles.card}>
            👤 Driver: {driver.name}
          </Text>

          <Text style={styles.card}>
            🚌 Bus: {driver.assignedBus}
          </Text>
        </>
      )}

      <Text style={styles.card}>
        🌍 Latitude: {latitude}
      </Text>

      <Text style={styles.card}>
        🌍 Longitude: {longitude}
      </Text>

      <TouchableOpacity
        style={styles.greenBtn}
        onPress={startTracking}
      >
        <Text style={styles.btnText}>
          ▶ Start Tracking
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.redBtn}
        onPress={stopTracking}
      >
        <Text style={styles.btnText}>
          ⏹ Stop Tracking
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    padding: 20,
    justifyContent: "center",
  },

  heading: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 18,
    elevation: 3,
  },

  greenBtn: {
    backgroundColor: "green",
    padding: 15,
    borderRadius: 10,
    marginTop: 25,
  },

  redBtn: {
    backgroundColor: "red",
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
  },

  btnText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "bold",
  },
});

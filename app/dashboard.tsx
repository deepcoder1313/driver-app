import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Dashboard() {
  const [driver, setDriver] = useState<any>(null);

  useEffect(() => {
    loadDriver();
  }, []);

  const loadDriver = async () => {
    const data = await AsyncStorage.getItem("driver");

    if (data) {
      setDriver(JSON.parse(data));
    }
  };

const logout = async () => {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("driver");

  router.replace("/");
};

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        🚍 Driver Dashboard
      </Text>

      {driver && (
        <>
          <Text style={styles.card}>
            👋 Welcome {driver.name}
          </Text>

          <Text style={styles.card}>
            🚌 Assigned Bus:
            {" "}
            {driver.assignedBus}
          </Text>

          <Text style={styles.card}>
            🪪 License:
            {" "}
            {driver.license}
          </Text>

          <Text style={styles.card}>
            📧 {driver.email}
          </Text>
        </>
      )}

<TouchableOpacity
  style={styles.greenBtn}
  onPress={() => {
    console.log("Going to tracking");
    router.push("/tracking");
  }}
>
  <Text style={styles.btnText}>
    ▶ Start Live Tracking
  </Text>
</TouchableOpacity>

      <TouchableOpacity
  style={styles.greenBtn}
  onPress={() => router.push("/map")}
>
  <Text style={styles.btnText}>
    🗺️ View Bus Map
  </Text>
</TouchableOpacity>

      <TouchableOpacity
        style={styles.redBtn}
        onPress={logout}
      >
        <Text style={styles.btnText}>
          🚪 Logout
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
    marginBottom: 30,
    textAlign: "center",
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
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 18,
  },

  
});
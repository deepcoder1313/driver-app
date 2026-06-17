import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../services/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  
useEffect(() => {
  checkLogin();
}, []);

const checkLogin = async () => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (token) {
      router.replace("/dashboard");
    } else {
      setLoading(false);
    }
  } catch (error) {
    console.log(error);
    setLoading(false);
  }
};
 const login = async () => {
  console.log("Login button clicked");

  if (!email || !password) {
    Alert.alert("Error", "Please fill all fields");
    return;
  }

  console.log("Sending request...");

  try {
    const res = await API.post("/drivers/login", {
      email,
      password,
      
    });


    console.log(res.data);
    console.log("Response:", res.data);

    Alert.alert("Success", "Login Successful");
    await AsyncStorage.setItem(
  "driver",
  JSON.stringify(res.data.driver)
);
await AsyncStorage.setItem(
  "token",
  res.data.token
);

router.replace("/dashboard");

    
  } catch (error) {
    console.log("Login Error:", error);

    Alert.alert("Login Failed", "Invalid credentials");
  }
};

if (loading) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Loading...</Text>
    </View>
  );
}
 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Login</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={login}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#ffffff",
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    marginBottom: 15,
  },

  button: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 10,
  },

  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
  },
});


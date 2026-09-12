// app/index.tsx  ─ Driver Login
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../services/api";
import { C, S } from "../theme";

export default function LoginScreen() {
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { checkLogin(); }, []);

  const checkLogin = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) router.replace("/dashboard");
      else setLoading(false);
    } catch { setLoading(false); }
  };

const login = async () => {
  if (!email || !password) {
    Alert.alert("Missing fields", "Please enter your email and password.");
    return;
  }

  setSubmitting(true);

  try {
    const res = await API.post("/drivers/login", {
      email,
      password,
    });

    const token = res.data.token;

    if (!token) {
      console.log("❌ No JWT received from backend");
      Alert.alert("Login Failed", "Server did not return a token.");
      return;
    }

    await AsyncStorage.setItem("driverToken", token);
    await AsyncStorage.setItem(
      "driver",
      JSON.stringify(res.data.driver)
    );
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("bg_token", token);


    console.log("✅ DRIVER JWT SAVED");
    console.log("🔐 LOGIN TOKEN SAVED:", {
  driverToken: !!(await AsyncStorage.getItem("driverToken")),
  token: !!(await AsyncStorage.getItem("token")),
  bg_token: !!(await AsyncStorage.getItem("bg_token")),
});

    // Verify immediately
    const savedToken = await AsyncStorage.getItem("driverToken");

    if (savedToken) {
      console.log("✅ DRIVER JWT VERIFIED IN STORAGE");
    } else {
      console.log("❌ DRIVER JWT COULD NOT BE READ");
    }

    router.replace("/dashboard");

  } catch (err: any) {
    console.log("Login Error:", err);

    if (err.response) {
      console.log("Status:", err.response.status);
      console.log("Data:", err.response.data);
    } else if (err.request) {
      console.log("No response received");
    } else {
      console.log("Message:", err.message);
    }

    Alert.alert(
      "Login Failed",
      err.message?.toString() ?? "Unknown error"
    );

  } finally {
    setSubmitting(false);
  }
};

  // ─── Splash / checking token ────────────────────────────
  if (loading) {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="light-content" backgroundColor={C.bgDark} />
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🚌</Text>
        </View>
        <Text style={styles.splashTitle}>BusTracker</Text>
        <Text style={styles.splashSub}>Driver App</Text>
        <ActivityIndicator color={C.primary2} style={{ marginTop: 40 }} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.bgDark} />

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bgLight }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Dark header hero ───────────────────────────── */}
        <View style={styles.hero}>
          {/* Decorative circles */}
          <View style={styles.circle1} />
          <View style={styles.circle2} />

          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🚌</Text>
          </View>
          <Text style={styles.heroTitle}>BusTracker</Text>
          <Text style={styles.heroSub}>DRIVER PORTAL</Text>
        </View>

        {/* ── Login card ─────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to your driver account</Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="driver@example.com"
                placeholderTextColor={C.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity
                onPress={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ fontSize: 16 }}>{showPass ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={login}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Sign In  →</Text>
            }
          </TouchableOpacity>

          {/* Helper */}
          <View style={styles.helperRow}>
            <View style={styles.helperDot} />
            <Text style={styles.helperText}>
              Contact your admin if you can't sign in
            </Text>
          </View>
        </View>

        {/* ── Footer ─────────────────────────────────────── */}
        <Text style={styles.footer}>BusTracker Admin System · v1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Splash
  splash: {
    flex: 1, backgroundColor: C.bgDark,
    alignItems: "center", justifyContent: "center",
  },
  splashTitle: { color: C.textOnDark, fontSize: 28, fontWeight: "800", marginTop: 14, letterSpacing: -0.5 },
  splashSub:   { color: C.textMuted, fontSize: 13, marginTop: 4, letterSpacing: 2, textTransform: "uppercase" },

  // Hero
  hero: {
    backgroundColor: C.bgDark,
    paddingTop: 72, paddingBottom: 56,
    alignItems: "center",
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: "hidden",
    position: "relative",
  },
  circle1: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.primary, opacity: 0.08,
    top: -60, right: -50,
  },
  circle2: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    backgroundColor: C.primary2, opacity: 0.07,
    bottom: -40, left: -30,
  },

  logoBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 8,
  },
  logoEmoji: { fontSize: 30 },
  heroTitle: { color: C.textOnDark, fontSize: 26, fontWeight: "800", letterSpacing: -0.4 },
  heroSub:   {
    color: C.textMuted, fontSize: 11, fontWeight: "600",
    letterSpacing: 2.5, textTransform: "uppercase", marginTop: 5,
  },

  // Card
  card: {
    backgroundColor: C.bgCard,
    marginHorizontal: 20, marginTop: -24,
    borderRadius: 20, padding: 26,
    ...S.shadowMd,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: C.textPrimary, letterSpacing: -0.3 },
  cardSub:   { fontSize: 13, color: C.textSub, marginTop: 3, marginBottom: 24 },

  // Fields
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 10, fontWeight: "700", color: C.textMuted,
    letterSpacing: 1, marginBottom: 7,
  },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: S.radiusMd, backgroundColor: "#F8FAFC",
    paddingHorizontal: 14, paddingVertical: 2,
  },
  inputIcon:  { fontSize: 16, marginRight: 10, opacity: 0.6 },
  input:      { flex: 1, fontSize: 14, color: C.textPrimary, paddingVertical: 12 },
  eyeBtn:     { padding: 4 },

  // Button
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: S.radiusMd, paddingVertical: 15,
    alignItems: "center", marginTop: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38, shadowRadius: 12, elevation: 5,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },

  // Helper
  helperRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20 },
  helperDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success, marginRight: 8 },
  helperText:{ fontSize: 12, color: C.textSub },

  footer: { textAlign: "center", color: C.textMuted, fontSize: 11, paddingBottom: 30 },
});

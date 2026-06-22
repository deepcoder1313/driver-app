// app/tracking.tsx  ─ Live Tracking Screen
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../services/api";
import { C, S } from "../theme";

// Pulsing dot animation for active tracking
function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{
        position: "absolute", width: 16, height: 16, borderRadius: 8,
        backgroundColor: C.success, opacity: 0.3, transform: [{ scale }],
      }} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.success }} />
    </View>
  );
}

function CoordCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={coordStyles.card}>
      <Text style={coordStyles.label}>{label}</Text>
      <Text style={coordStyles.value}>
        {value ? value.toFixed(6) : "Waiting…"}
      </Text>
    </View>
  );
}
const coordStyles = StyleSheet.create({
  card:  {
    flex: 1, backgroundColor: C.bgCard, borderRadius: S.radiusMd,
    padding: 14, alignItems: "center", ...S.shadow,
  },
  label: { fontSize: 10, fontWeight: "700", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  value: { fontSize: 13, fontWeight: "700", color: C.textPrimary, fontVariant: ["tabular-nums"] as any },
});

export default function TrackingScreen() {
  const [driver,   setDriver]   = useState<any>(null);
  const [tracking, setTracking] = useState(false);
  const [latitude,  setLatitude]  = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [updateCount, setUpdateCount] = useState(0);
  const [elapsed, setElapsed]   = useState(0);

  const subRef    = useRef<Location.LocationSubscription | null>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initializeTracking();
    return () => {
      subRef.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

const initializeTracking = async () => {
  try {
    await loadDriver();

    const trackingStatus = await AsyncStorage.getItem("tracking");

    if (trackingStatus === "true") {
      setTracking(true);

      // Restart location updates automatically
      await resumeTracking();
    }
  } catch (error) {
    console.log("Initialization error:", error);
  }
};

const resumeTracking = async () => {
  const { status } =
    await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    return;
  }

  const subscription =
    await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      async (loc) => {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;

        setLatitude(lat);
        setLongitude(lng);
        setUpdateCount((c) => c + 1);

        try {
          const token =
            await AsyncStorage.getItem("token");
            console.log("Token:", token);

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
        } catch (err) {
          console.log(err);
        }
      }
    );

  subRef.current = subscription;
};

  const loadDriver = async () => {
    const data = await AsyncStorage.getItem("driver");
    if (data) setDriver(JSON.parse(data));
  };

  const startTracking = async () => {
    const driverData = await AsyncStorage.getItem("driver");
    if (!driverData) return;
    const d = JSON.parse(driverData);

    try {
      // Start trip in backend
      const tripRes = await API.post("/trips/start", {
        driverId: d._id,
        busNo:    d.assignedBus,
      });
      await AsyncStorage.setItem("currentTripId", tripRes.data._id);
      await AsyncStorage.setItem("tracking", "true");

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required for tracking.");
        return;
      }

      // Watch position
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        async (loc) => {
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          setUpdateCount(c => c + 1);

          try {
            const token = await AsyncStorage.getItem("token");
            await API.put("/buses/update-location", { latitude: lat, longitude: lng }, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch (err) {
            console.log("❌ Location update error:", err);

            if (err && typeof err === "object") {
              const response = (err as any).response;
              const message = (err as any).message;

              if (response) {
                console.log("Status:", response.status);
                console.log("Data:", response.data);
              } else if (typeof message === "string") {
                console.log("No response:", message);
              }
            }
          }
        }
      );

      subRef.current = subscription;
      setTracking(true);
      setElapsed(0);
      setUpdateCount(0);

      // Elapsed timer
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    } catch (err) {
      Alert.alert("Error", "Could not start tracking. Is the server running?");
      console.log(err);
    }
  };

  const stopTracking = async () => {
    Alert.alert("Stop Tracking", "End your current trip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Stop Trip", style: "destructive",
        onPress: async () => {
          subRef.current?.remove();
          subRef.current = null;
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

          const tripId = await AsyncStorage.getItem("currentTripId");
          if (tripId) {
            await API.put(`/trips/stop/${tripId}`);
            await AsyncStorage.removeItem("currentTripId");
            await AsyncStorage.removeItem("tracking");
          }
          setTracking(false);
          setLatitude(0);
          setLongitude(0);
          setUpdateCount(0);
          setElapsed(0);
        },
      },
    ]);
  };

  const fmtElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bgLight }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDark} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.circle1} />
        <TouchableOpacity
          onPress={() => { subRef.current?.remove(); if(timerRef.current) clearInterval(timerRef.current); require("expo-router").router.back(); }}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ color: C.textMuted, fontSize: 16 }}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <Text style={styles.headerSub}>
          {tracking ? "Broadcasting location" : "Ready to track"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* ── Status Card ──────────────────────────────── */}
        <View style={[styles.statusCard, { borderColor: tracking ? C.success + "40" : C.border }]}>
          <View style={styles.statusLeft}>
            {tracking ? <PulseDot /> : <View style={styles.idleDot} />}
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.statusTitle, { color: tracking ? C.success : C.textMuted }]}>
                {tracking ? "Tracking Active" : "Not Tracking"}
              </Text>
              <Text style={styles.statusSub}>
                {tracking ? `${updateCount} updates sent` : "Press Start to begin your trip"}
              </Text>
            </View>
          </View>
          {tracking && (
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{fmtElapsed(elapsed)}</Text>
            </View>
          )}
        </View>

        {/* ── Driver + Bus Info ──────────────────────── */}
        <Text style={styles.sectionLabel}>Trip Info</Text>
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👤</Text>
            <View>
              <Text style={styles.infoLabel}>Driver</Text>
              <Text style={styles.infoValue}>{driver?.name ?? "—"}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🚌</Text>
            <View>
              <Text style={styles.infoLabel}>Assigned Bus</Text>
              <Text style={styles.infoValue}>{driver?.assignedBus ?? "—"}</Text>
            </View>
          </View>
        </View>

        {/* ── Coordinates ───────────────────────────── */}
        <Text style={styles.sectionLabel}>Current Position</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
          <CoordCard label="Latitude"  value={latitude}  />
          <CoordCard label="Longitude" value={longitude} />
        </View>

        {/* ── Buttons ───────────────────────────────── */}
        {!tracking ? (
          <TouchableOpacity style={styles.startBtn} onPress={startTracking} activeOpacity={0.85}>
            <Text style={styles.startBtnText}>▶  Start Trip & Tracking</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopBtn} onPress={stopTracking} activeOpacity={0.85}>
            <Text style={styles.stopBtnText}>⏹  Stop Trip & Tracking</Text>
          </TouchableOpacity>
        )}

        {/* Info note */}
        <View style={styles.note}>
          <Text style={styles.noteText}>
            📡  Your location is sent to the server every 3 seconds and broadcast live to parents.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.bgDark, paddingTop: 56,
    paddingHorizontal: 20, paddingBottom: 28,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: C.success, opacity: 0.06, top: -60, right: -40,
  },
  backBtn:     { marginBottom: 10 },
  headerTitle: { color: C.textOnDark, fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  headerSub:   { color: C.textMuted, fontSize: 13, marginTop: 3 },

  statusCard: {
    backgroundColor: C.bgCard, borderRadius: S.radiusLg,
    padding: 18, marginBottom: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, ...S.shadow,
  },
  statusLeft:  { flexDirection: "row", alignItems: "center", flex: 1 },
  idleDot:     { width: 12, height: 12, borderRadius: 6, backgroundColor: C.textMuted },
  statusTitle: { fontSize: 15, fontWeight: "700" },
  statusSub:   { fontSize: 12, color: C.textSub, marginTop: 1 },
  timerBadge:  { backgroundColor: C.successBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  timerText:   { fontFamily: "monospace" as any, fontSize: 15, fontWeight: "700", color: C.success },

  sectionLabel: {
    fontSize: 10, fontWeight: "700", color: C.textMuted,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginLeft: 2,
  },
  section:  { backgroundColor: C.bgCard, borderRadius: S.radiusLg, marginBottom: 18, ...S.shadow, overflow: "hidden" },
  infoRow:  { flexDirection: "row", alignItems: "center", padding: 16 },
  infoIcon: { fontSize: 20, marginRight: 14, width: 28, textAlign: "center" },
  infoLabel:{ fontSize: 10, fontWeight: "700", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  infoValue:{ fontSize: 15, fontWeight: "700", color: C.textPrimary },
  divider:  { height: 1, backgroundColor: C.border, marginLeft: 58 },

  startBtn: {
    backgroundColor: C.success, borderRadius: S.radiusMd,
    paddingVertical: 16, alignItems: "center",
    marginBottom: 14,
    shadowColor: C.success, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 5,
  },
  startBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  stopBtn: {
    backgroundColor: C.dangerBg, borderRadius: S.radiusMd,
    paddingVertical: 16, alignItems: "center",
    marginBottom: 14, borderWidth: 1.5, borderColor: C.danger + "40",
  },
  stopBtnText: { color: C.danger, fontSize: 16, fontWeight: "700" },

  note: {
    backgroundColor: C.primaryBg, borderRadius: S.radiusMd,
    padding: 14, borderWidth: 1, borderColor: C.primary + "20",
  },
  noteText: { fontSize: 12, color: C.primary, fontWeight: "500", lineHeight: 18 },
});

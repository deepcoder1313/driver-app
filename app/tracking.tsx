// app/tracking.tsx  — Driver App with BACKGROUND GPS
// Uses expo-task-manager so tracking continues when app is minimized
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MapView, { Marker } from "react-native-maps";
import API from "../services/api";
import { C, S } from "../theme";

// ── Background task name — must be defined at TOP LEVEL of file ──
const LOCATION_TASK = "background-location-task";

// ── Register background task at module level (outside component) ──
// This runs even when app is in background/killed
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.log("❌ Background task error:", error.message);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    if (!location) return;
     // Ignore poor GPS accuracy
if (
  location.coords.accuracy &&
  location.coords.accuracy > 25
) {
  console.log(
    "⚠️ Ignoring inaccurate GPS:",
    location.coords.accuracy
  );
  return;
}
    const lat = location.coords.latitude;
    const lng = location.coords.longitude;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      try {
  console.log("📤 Sending GPS to backend:", {
    latitude: lat,
    longitude: lng,
    speed: location.coords.speed ?? 0,
    heading: location.coords.heading ?? 0,
    accuracy: location.coords.accuracy ?? 0,
  });
  

const token =
  (await AsyncStorage.getItem("bg_token")) ||
  (await AsyncStorage.getItem("driverToken")) ||
  (await AsyncStorage.getItem("token"));

console.log("🔐 GPS TOKEN CHECK:", {
  exists: !!token,
  tokenLength: token?.length,
});

if (!token) {
  console.log("❌ No authentication token available for GPS");
  return;
}

console.log("✅ DRIVER TOKEN FOUND");


const response = await API.put(
  "/buses/update-location",
  {
    latitude: lat,
    longitude: lng,
    speed: location.coords.speed ?? 0,
    heading: location.coords.heading ?? 0,
    accuracy: location.coords.accuracy ?? 0,
    timestamp: Date.now(),
  },
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

console.log("✅ GPS BACKEND RESPONSE:", response.data);

} catch (error: any) {
  console.log("❌ GPS BACKEND ERROR:", error.message);
  console.log("❌ GPS ERROR RESPONSE:", error.response?.data);
}
    } catch (err:any) {
      console.log("❌ Background update failed:", err);
        console.log("❌ Full Error:", err);
  console.log("❌ Response:", err.response);
  console.log("❌ Message:", err.message);

  Alert.alert("Error", err.message)
    }
  }
});

// ── Pulsing dot animation ────────────────────────────────────────
function PulseDot({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) { scale.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.7, duration: 800, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [active]);

  return (
    <View style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
      {active && (
        <Animated.View style={{
          position: "absolute", width: 16, height: 16, borderRadius: 8,
          backgroundColor: C.success, opacity: 0.28, transform: [{ scale }],
        }} />
      )}
      <View style={{ width: 8, height: 8, borderRadius: 4,
        backgroundColor: active ? C.success : C.textMuted }} />
    </View>
  );
}

function distanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}




function CoordCard({ label, value, accuracy = 0 }: { label: string; value: number; accuracy?: number }) {
  return (
    <View style={coordSt.card}>
      <Text style={coordSt.label}>{label}</Text>
      <Text style={coordSt.value}>{value ? value.toFixed(6) : "Waiting…"}</Text>
      <Text
        style={{
          textAlign: "center",
          color: C.textMuted,
          marginTop: 8,
          fontSize: 12,
        }}
      >
        GPS Accuracy: {accuracy.toFixed(1)} m
      </Text>
    </View>
  );
}
const coordSt = StyleSheet.create({
  card:  { flex: 1, backgroundColor: C.bgCard, borderRadius: S.radiusMd, padding: 14, alignItems: "center", ...S.shadow },
  label: { fontSize: 10, fontWeight: "700", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  value: { fontSize: 12, fontWeight: "700", color: C.textPrimary },
});

// ── Main screen ──────────────────────────────────────────────────
export default function TrackingScreen() {
  const [driver,      setDriver]      = useState<any>(null);
  const [tracking,    setTracking]    = useState(false);
  const [bgTracking,  setBgTracking]  = useState(false);
  const [latitude,    setLatitude]    = useState(0);
  const [longitude,   setLongitude]   = useState(0);
  const [updateCount, setUpdateCount] = useState(0);
  const [elapsed,     setElapsed]     = useState(0);
  const [appState,    setAppState]    = useState(AppState.currentState);
  const [tripType, setTripType] = useState<"morning" | "return">("morning");

  const fgSubRef   = useRef<Location.LocationSubscription | null>(null);
  const lastSentLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const [accuracy, setAccuracy] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);


  const [simulating, setSimulating] = useState(false);

const simulationTimerRef =
  useRef<ReturnType<typeof setInterval> | null>(null);

const simulationIndexRef = useRef(0);

  useEffect(() => {
    loadDriver();
    checkIfAlreadyTracking();

const loadAccuracy = async () => {
  try {
    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      console.log("Location permission denied");
      return;
    }

    const loc =
      await Location.getLastKnownPositionAsync({});

    if (loc) {
      setAccuracy(loc.coords.accuracy ?? 0);
      setSpeed((loc.coords.speed ?? 0) * 3.6);
      setHeading(loc.coords.heading ?? 0);
    }
  } catch (err) {
    console.log(err);
  }
};
    loadAccuracy();

    // Monitor app state (foreground/background)
    const sub = AppState.addEventListener("change", nextState => {
      setAppState(nextState);
    });

    return () => {
  sub.remove();
  fgSubRef.current?.remove();

  if (timerRef.current) {
    clearInterval(timerRef.current);
  }

  if (simulationTimerRef.current) {
    clearInterval(simulationTimerRef.current);
    simulationTimerRef.current = null;
  }
};

    
  }, []);

  const loadDriver = async () => {
    const data = await AsyncStorage.getItem("driver");
    if (data) setDriver(JSON.parse(data));
  };

  // If app reopened mid-trip, restore tracking state
  const checkIfAlreadyTracking = async () => {
    const tripId  = await AsyncStorage.getItem("currentTripId");
    const bgActive = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
    if (tripId && bgActive) {
      setTracking(true);
      setBgTracking(true);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    // Foreground permission
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== "granted") {
      Alert.alert("Permission Denied", "Foreground location permission is required.");
      return false;
    }
    // Background permission — needed for tracking when minimized
    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    if (bg !== "granted") {
      Alert.alert(
        "Background Permission Needed",
        "To track when the app is minimized, please allow 'Always' location access in Settings.",
        [
          { text: "Continue anyway", style: "cancel" },
          { text: "Open Settings", onPress: () => Location.requestBackgroundPermissionsAsync() },
        ]
      );
      // Continue with foreground only — better than nothing
    }
    return true;
  };



  const startSimulation = async () => {
  try {
    const driverData = await AsyncStorage.getItem("driver");

    if (!driverData) {
      Alert.alert("Error", "Driver information not found.");
      return;
    }

    const d = JSON.parse(driverData);

    // Temporary test route.
    // Replace these coordinates with points from your actual route.
    const simulationRoute = [
      { latitude: 31.6340, longitude: 74.8723 },
      { latitude: 31.6350, longitude: 74.8735 },
      { latitude: 31.6360, longitude: 74.8750 },
      { latitude: 31.6370, longitude: 74.8765 },
      { latitude: 31.6380, longitude: 74.8780 },
      { latitude: 31.6390, longitude: 74.8795 },
      { latitude: 31.6400, longitude: 74.8810 },
    ];

    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
    }

    simulationIndexRef.current = 0;
    setSimulating(true);

    console.log("🧪 BUS SIMULATION STARTED");

    simulationTimerRef.current = setInterval(async () => {
      const index = simulationIndexRef.current;

      if (index >= simulationRoute.length) {
        if (simulationTimerRef.current) {
          clearInterval(simulationTimerRef.current);
          simulationTimerRef.current = null;
        }

        setSimulating(false);

        console.log("🏁 BUS SIMULATION FINISHED");

        return;
      }

      const point = simulationRoute[index];

      try {
        console.log("🧪 SIMULATED GPS:", {
          index,
          latitude: point.latitude,
          longitude: point.longitude,
        });

        await API.put(
          "/buses/update-location",
          {
            latitude: point.latitude,
            longitude: point.longitude,
            speed: 30 / 3.6,
            heading: 90,
            accuracy: 5,
            timestamp: Date.now(),
          }
        );

        setLatitude(point.latitude);
        setLongitude(point.longitude);
        setSpeed(30 / 3.6);
        setHeading(90);
        setUpdateCount(c => c + 1);

        simulationIndexRef.current += 1;

      } catch (error: any) {
        console.log("❌ SIMULATION ERROR:", error.message);
        console.log("❌ SIMULATION RESPONSE:", error.response?.data);
      }

    }, 2000);

  } catch (error: any) {
    console.log("❌ Could not start simulation:", error.message);
    setSimulating(false);
  }
};

  const stopSimulation = () => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }

    simulationIndexRef.current = 0;
    setSimulating(false);
    console.log("🛑 BUS SIMULATION STOPPED");
  };


  const startTracking = async () => {
    
    const ok = await requestPermissions();
    if (!ok) return;

    const driverData = await AsyncStorage.getItem("driver");
    if (!driverData) return;
    const d = JSON.parse(driverData);

    try {
      console.log("Calling:", API.defaults.baseURL + "/trips/start");
      // Start trip in backend
      const tripRes = await API.post("/trips/start", {
    driverId: d._id,
    busNo: d.assignedBus,
    tripType: "morning",
});

 console.log("SUCCESS:", tripRes.data);
 

await AsyncStorage.setItem(
  "currentTripId",
  tripRes.data._id
);

setTripType("morning");



      // Store API base URL for background task to use
      const apiBase = API.defaults.baseURL || "";
      await AsyncStorage.setItem("apiBase", apiBase);

      // ── Start BACKGROUND location task ──────────────────
      const bgGranted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
      if (!bgGranted) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK, {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval:           1000,    // every 4 seconds
          distanceInterval:       3,       // or every 5 meters
          showsBackgroundLocationIndicator: true,  // iOS blue bar
          foregroundService: {
            // Android — shows persistent notification so OS won't kill the app
            notificationTitle:   "🚌 BusTracker Active",
            notificationBody:    `Tracking ${d.assignedBus} — parents can see your location`,
            notificationColor:   "#6366F1",
          },
        });
        setBgTracking(true);
        console.log("✅ Background tracking started");
      }

      // ── Also start FOREGROUND subscription for live UI updates ──
      const fgSub = await Location.watchPositionAsync(
        
        {accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
        (loc) => {
if (lastSentLocation.current) {

  const moved = distanceInMeters(
    lastSentLocation.current.latitude,
    lastSentLocation.current.longitude,
    loc.coords.latitude,
    loc.coords.longitude
    
  );
  

  if (moved < 3) {
    return;
  }
}
lastSentLocation.current = {
  latitude: loc.coords.latitude,
  longitude: loc.coords.longitude,
};

// ✅ Update live location
setLatitude(loc.coords.latitude);
setLongitude(loc.coords.longitude);
setAccuracy(loc.coords.accuracy ?? 0);
setSpeed((loc.coords.speed ?? 0) * 3.6); // km/h
setHeading(loc.coords.heading ?? 0);

setUpdateCount(c => c + 1);
console.log(
  "📍 DRIVER GPS:",
  loc.coords.latitude,
  loc.coords.longitude
);
        }
      );
      fgSubRef.current = fgSub;

      // Elapsed timer
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

      setTracking(true);
      

      
    } catch (err: any) {
  console.log("ERROR OBJECT:", JSON.stringify(err, null, 2));
  console.log("MESSAGE:", err.message);
  console.log("CODE:", err.code);
  console.log("REQUEST:", err.request);
  console.log("RESPONSE:", err.response);

    
  
      console.log("❌ Start tracking error:", err);
        console.log("❌ Full Error:", err);
  console.log("❌ Response:", err.response);
  console.log("❌ Message:", err.message);
  

  Alert.alert("Error", err.message)
      Alert.alert("Error", "Could not start tracking. Is the server running?");
    }
  };

  const startReturnTrip = async () => {

  const ok = await requestPermissions();

  if (!ok) return;

  const driverData = await AsyncStorage.getItem("driver");

  if (!driverData) return;

  const d = JSON.parse(driverData);

  try {

    const tripRes = await API.post(
      "/trips/start",
      {
        driverId: d._id,
        busNo: d.assignedBus,
        tripType: "return",
      }
    );

    await AsyncStorage.setItem(
      "currentTripId",
      tripRes.data._id
    );
    setTripType("return");

   

    Alert.alert(  
      "Success",
      "Return Trip Started"
    );

  } catch (err) {

    Alert.alert(
      "Error",
      "Unable to start return trip"
    );

  }

  

};



  const stopTracking = () => {
    Alert.alert("Stop Trip", "End your current trip and stop tracking?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Stop Trip", style: "destructive",
        onPress: async () => {
          // Stop background task
          const bgActive = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
          if (bgActive) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK);
          }

          // Stop foreground subscription
          fgSubRef.current?.remove();
          fgSubRef.current = null;

          // Stop timer
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

          // End trip in backend
          
          const tripId = await AsyncStorage.getItem("currentTripId");
         try {
          console.log("🛑 Calling End Trip API...");
    await API.put("/trips/end");
    console.log("✅ End Trip API Success");

    await AsyncStorage.removeItem("currentTripId");

    Alert.alert(
        "Success",
        "Trip ended successfully."
    );

} catch (err: any) {

    console.log(err);
     console.log("❌ End Trip Error:", err);

    Alert.alert(
        "Error",
        "Unable to end trip."
    );
}

          setTracking(false);
setBgTracking(false);
setLatitude(0);
setLongitude(0);
setUpdateCount(0);
setElapsed(0);

if (tripType === "morning") {
  setTripType("return");
} else {
  setTripType("morning");
}
        },
      },
    ]);
  };

  const fmtElapsed = (s: number) => {
    const m   = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const isBackground = appState !== "active" && tracking;

  return (
    <View style={{ flex: 1, backgroundColor: C.bgLight }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDark} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.circle} />
        <TouchableOpacity
          onPress={() => require("expo-router").router.back()}
          style={styles.backBtn}
          hitSlop={{ top:10, bottom:10, left:10, right:10 }}
        >
          <Text style={{ color: C.textMuted, fontSize: 15 }}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <Text style={styles.headerSub}>
          {tracking
            ? bgTracking ? "Background GPS active" : "Foreground GPS active"
            : "Ready to start"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <View style={[styles.statusCard, { borderColor: tracking ? C.success + "40" : C.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <PulseDot active={tracking} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.statusTitle, { color: tracking ? C.success : C.textMuted }]}>
                {tracking ? "Tracking Active" : "Not Tracking"}
              </Text>
              <Text style={styles.statusSub}>
                {tracking
                  ? `${updateCount} updates · ${bgTracking ? "Background GPS on" : "Foreground only"}`
                  : "Press Start to begin your trip"}
              </Text>
            </View>
          </View>
          {tracking && (
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{fmtElapsed(elapsed)}</Text>
            </View>
          )}
        </View>

        {/* Background indicator — shows when app is about to be minimized */}
        {bgTracking && (
          <View style={styles.bgBanner}>
            <Text style={{ fontSize: 16, marginRight: 10 }}>📡</Text>
            <Text style={styles.bgBannerText}>
              Background tracking is ON. You can minimize the app — tracking continues automatically.
            </Text>
          </View>
        )}

        {/* Driver info */}
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

        {/* Live coordinates */}
      <Text style={styles.sectionLabel}>Live Location</Text>

<MapView
  style={{
    width: "100%",
    height: 300,
    borderRadius: 16,
    marginBottom: 18,
  }}
region={{
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
}}
>
  <Marker
   coordinate={{
    latitude,
    longitude,
}}
    title="Driver"
    description="Current Location"
  />
</MapView>

        {/* Action button */}
{!tracking ? (

  tripType === "morning" ? (

    <TouchableOpacity
      style={styles.startBtn}
      onPress={startTracking}
      activeOpacity={0.85}
    >
      <Text style={styles.startBtnText}>
        🟢 Start Morning Trip
      </Text>
    </TouchableOpacity>

  ) : (

    <TouchableOpacity
      style={styles.returnButton}
      onPress={startReturnTrip}
      activeOpacity={0.85}
    >
      <Text style={styles.startBtnText}>
        🏠 Start Return Trip
      </Text>
    </TouchableOpacity>

  )

) : (

  <TouchableOpacity
    style={styles.stopBtn}
    onPress={stopTracking}
    activeOpacity={0.85}
  >
    <Text style={styles.stopBtnText}>
      ⏹ Stop Trip
    </Text>
  </TouchableOpacity>

)}
        

        {/* DEVELOPMENT ONLY */}
<View style={{ marginTop: 4, marginBottom: 14 }}>

  {!simulating ? (
    <TouchableOpacity
      style={styles.simulateBtn}
      onPress={startSimulation}
      activeOpacity={0.85}
    >
      <Text style={styles.simulateBtnText}>
        🧪 Simulate Bus Movement
      </Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      style={styles.simulateStopBtn}
      onPress={stopSimulation}
      activeOpacity={0.85}
    >
      <Text style={styles.simulateStopText}>
        🛑 Stop Simulation
      </Text>
    </TouchableOpacity>
  )}

</View>


        {/* Info note */}
        <View style={styles.note}>
          <Text style={styles.noteText}>
            📡  Location sent every 4 seconds via background GPS. Parents see live updates on their map.
            {"\n\n"}
            📱  On Android: a persistent notification will appear. Do NOT swipe it away or background tracking stops.
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
  circle: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: C.success, opacity: 0.06, top: -60, right: -40,
  },
  backBtn:     { marginBottom: 10 },
  headerTitle: { color: C.textOnDark, fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  headerSub:   { color: C.textMuted, fontSize: 13, marginTop: 3 },

  statusCard: {
    backgroundColor: C.bgCard, borderRadius: S.radiusLg,
    padding: 18, marginBottom: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, ...S.shadow,
  },
  statusTitle: { fontSize: 15, fontWeight: "700" },
  statusSub:   { fontSize: 12, color: C.textSub, marginTop: 1 },
  timerBadge:  { backgroundColor: C.successBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  timerText:   { fontFamily: "monospace" as any, fontSize: 15, fontWeight: "700", color: C.success },

  bgBanner: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: C.primaryBg, borderRadius: S.radiusMd,
    padding: 14, marginBottom: 18,
    borderWidth: 1, borderColor: C.primary + "25",
  },
  bgBannerText: { flex: 1, fontSize: 12, color: C.primary, fontWeight: "500", lineHeight: 18 },

  sectionLabel: {
    fontSize: 10, fontWeight: "700", color: C.textMuted,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginLeft: 2,
  },
  section:   { backgroundColor: C.bgCard, borderRadius: S.radiusLg, marginBottom: 18, ...S.shadow, overflow: "hidden" },
  infoRow:   { flexDirection: "row", alignItems: "center", padding: 16 },
  infoIcon:  { fontSize: 20, marginRight: 14, width: 28, textAlign: "center" },
  infoLabel: { fontSize: 10, fontWeight: "700", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "700", color: C.textPrimary },
  divider:   { height: 1, backgroundColor: C.border, marginLeft: 58 },

  startBtn: {
    backgroundColor: C.success, borderRadius: S.radiusMd,
    paddingVertical: 16, alignItems: "center", marginBottom: 14,
    shadowColor: C.success, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 5,
  },

  returnButton: {
  backgroundColor: "#F97316",
  padding: 16,
  borderRadius: 12,
  alignItems: "center",
  marginTop: 12,
},

  startBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  stopBtn: {
    backgroundColor: C.dangerBg, borderRadius: S.radiusMd,
    paddingVertical: 16, alignItems: "center", marginBottom: 14,
    borderWidth: 1.5, borderColor: C.danger + "40",
  },
  stopBtnText: { color: C.danger, fontSize: 16, fontWeight: "700" },

  note: {
    backgroundColor: C.primaryBg, borderRadius: S.radiusMd,
    padding: 14, borderWidth: 1, borderColor: C.primary + "20",
  },
  noteText: { fontSize: 12, color: C.primary, fontWeight: "500", lineHeight: 18 },

  simulateBtn: {
  backgroundColor: "#6366F1",
  borderRadius: S.radiusMd,
  paddingVertical: 15,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#818CF8",
},

simulateBtnText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "700",
},

simulateStopBtn: {
  backgroundColor: "#FEF2F2",
  borderRadius: S.radiusMd,
  paddingVertical: 15,
  alignItems: "center",
  borderWidth: 1.5,
  borderColor: "#FCA5A5",
},

simulateStopText: {
  color: "#DC2626",
  fontSize: 15,
  fontWeight: "700",
},

});

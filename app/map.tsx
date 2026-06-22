// app/map.tsx  ─ Bus Map Screen
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { io } from "socket.io-client";
import API from "../services/api";
import { C } from "../theme";

// ⚠️ Replace with your computer's local IP
const BACKEND = "http://192.168.31.237:5000";
const socket = io(BACKEND);

export default function MapScreen() {
  const webViewRef  = useRef<WebView>(null);
  const [html,      setHtml]      = useState("");
  const [busNo,     setBusNo]     = useState("");
  const [connected, setConnected] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const [lastCoords,  setLastCoords]  = useState({ lat: 0, lng: 0 });

  // Load bus initial position
  useEffect(() => { loadBus(); }, []);

  // Socket.io listeners
  useEffect(() => {
    console.log("Socket connected:", socket.connected);
    setConnected(socket.connected);

     socket.on("connect", () => {
    console.log("✅ Socket connected");
    setConnected(true);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected");
    setConnected(false);
  });
  
    socket.on("connect_error", (e)  => console.log("Socket error:", e.message));
    socket.on("busLocationUpdated", (bus) => {
      setUpdateCount(c => c + 1);
      setLastCoords({ lat: bus.latitude, lng: bus.longitude });
      webViewRef.current?.injectJavaScript(`
        if (window.updateBusLocation) {
          window.updateBusLocation(${bus.latitude}, ${bus.longitude});
        }
        true;
      `);
    });
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("busLocationUpdated");
    };
  }, []);

  const loadBus = async () => {
    try {
      const data = await AsyncStorage.getItem("driver");
      if (!data) return;
      const driver = JSON.parse(data);
      setBusNo(driver.assignedBus);

      const res = await API.get(`/buses/busno/${driver.assignedBus}`);
      const lat = res.data.latitude  || 30.484;
      const lng = res.data.longitude || 76.604;
      setLastCoords({ lat, lng });
      setHtml(buildMapHtml(lat, lng));
    } catch (err) {
      console.log("Map load error:", err);
    }
  };

  const buildMapHtml = (lat: number, lng: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body, #map { width:100%; height:100%; margin:0; padding:0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Custom bus icon using a div marker
    var busIcon = L.divIcon({
      className: '',
      html: '<div style="background:#6366F1;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 12px rgba(99,102,241,0.5);border:3px solid white;">🚌</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    var marker = L.marker([${lat}, ${lng}], { icon: busIcon }).addTo(map);
    marker.bindPopup('<b>🚌 Live Bus</b><br>Updating every 3s');

    var routeCoords = [[${lat}, ${lng}]];
    var routeLine = L.polyline(routeCoords, {
      color: '#6366F1', weight: 4, opacity: 0.7,
      dashArray: '8, 6'
    }).addTo(map);

    window.updateBusLocation = function(lat, lng) {
      marker.setLatLng([lat, lng]);
      routeCoords.push([lat, lng]);
      routeLine.setLatLngs(routeCoords);
      map.panTo([lat, lng], { animate: true, duration: 0.8 });
    };
  </script>
</body>
</html>`;

  if (!html) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor={C.bgDark} />
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
        <Text style={styles.loadingText}>Loading map…</Text>
        <Text style={styles.loadingSubText}>Fetching bus location from server</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDark} />

      {/* ── Top overlay bar ───────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => require("expo-router").router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.topTitle}>Bus Map</Text>
          {busNo ? <Text style={styles.topSub}>🚌 {busNo}</Text> : null}
        </View>

        {/* Connection status */}
        <View style={[styles.connPill, { backgroundColor: connected ? C.successBg : "#FFF1F2" }]}>
          <View style={[styles.connDot, { backgroundColor: connected ? C.success : C.danger }]} />
          <Text style={[styles.connText, { color: connected ? C.success : C.danger }]}>
            {connected ? "Live" : "Offline"}
          </Text>
        </View>
      </View>

      {/* ── Map ───────────────────────────────────── */}
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={{ flex: 1 }}
      />

      {/* ── Bottom info overlay ───────────────────── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomItem}>
          <Text style={styles.bottomLabel}>UPDATES</Text>
          <Text style={styles.bottomValue}>{updateCount}</Text>
        </View>
        <View style={styles.bottomDivider} />
        <View style={styles.bottomItem}>
          <Text style={styles.bottomLabel}>LATITUDE</Text>
          <Text style={styles.bottomValue}>
            {lastCoords.lat ? lastCoords.lat.toFixed(4) : "—"}
          </Text>
        </View>
        <View style={styles.bottomDivider} />
        <View style={styles.bottomItem}>
          <Text style={styles.bottomLabel}>LONGITUDE</Text>
          <Text style={styles.bottomValue}>
            {lastCoords.lng ? lastCoords.lng.toFixed(4) : "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1, backgroundColor: C.bgDark,
    alignItems: "center", justifyContent: "center",
  },
  loadingIcon:    { marginBottom: 20 },
  loadingText:    { color: C.textOnDark, fontSize: 18, fontWeight: "700", marginBottom: 6 },
  loadingSubText: { color: C.textMuted, fontSize: 13 },

  topBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: C.bgDark,
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center",
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 10,
  },
  backBtn:  { width: 36, height: 36, backgroundColor: C.bgMid, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  backText: { color: C.textOnDark, fontSize: 22, fontWeight: "300", lineHeight: 28 },
  topTitle: { color: C.textOnDark, fontSize: 17, fontWeight: "700" },
  topSub:   { color: C.textMuted, fontSize: 12, marginTop: 1 },

  connPill:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  connDot:   { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  connText:  { fontSize: 12, fontWeight: "700" },

  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: C.bgDark,
    flexDirection: "row", alignItems: "center",
    paddingVertical: 16, paddingHorizontal: 20,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 10,
  },
  bottomItem:    { flex: 1, alignItems: "center" },
  bottomLabel:   { fontSize: 9, fontWeight: "700", color: C.textMuted, letterSpacing: 1, marginBottom: 4 },
  bottomValue:   { fontSize: 14, fontWeight: "800", color: C.textOnDark, fontVariant: ["tabular-nums"] as any },
  bottomDivider: { width: 1, height: 28, backgroundColor: C.bgMid },
});

// app/map.tsx  — Driver App Map (Uber-style)
// Shows: live driver position + blue OSRM road route to destination
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

// ⚠️ Change to your computer's local WiFi IP
const BACKEND = "http://192.168.31.237:5000";
const socket   = io(BACKEND);

export default function MapScreen() {
  const webViewRef    = useRef<WebView>(null);
  const [html,        setHtml]        = useState("");
  const [busNo,       setBusNo]       = useState("");
  const [connected,   setConnected]   = useState(false);
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => { loadBus(); }, []);

  useEffect(() => {
  socket.on("connect", async () => {

  console.log("✅ Socket Connected");

  setConnected(true);

  const raw = await AsyncStorage.getItem("parent");

  if (raw) {
    const parent = JSON.parse(raw);

    socket.emit("joinParentRoom", parent._id);

    console.log("✅ Joined Room:", parent._id);
  }

});
    socket.on("disconnect", () => setConnected(false));
    socket.on("busLocationUpdated", (bus: { latitude: number; longitude: number }) => {
      setUpdateCount(c => c + 1);
      webViewRef.current?.injectJavaScript(`
        updateDriverPosition(${bus.latitude}, ${bus.longitude});
        true;
      `);
    });
    return () => {
      socket.off("connect");
      socket.off("disconnect");
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
      const bus = res.data;

      const lat = bus.latitude  || 30.484;
      const lng = bus.longitude || 76.604;

      setHtml(buildMapHtml(lat, lng, driver.assignedBus));
    } catch (err) {
      console.log("Map error:", err);
    }
  };

  const buildMapHtml = (lat: number, lng: number, busLabel: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body, #map { width:100%; height:100%; margin:0; padding:0; background:#0F172A; }
    @keyframes pulse {
      0%   { transform: scale(1);   opacity: 0.6; }
      100% { transform: scale(2.6); opacity: 0; }
    }
    .pulse-ring {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%,-50%);
      width: 44px; height: 44px; border-radius: 50%;
      background: rgba(99,102,241,0.35);
      animation: pulse 1.8s ease-out infinite;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
  window.onerror = function(message, source, line, column, error) {
  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: "JS_ERROR",
      message: message,
      source: source,
      line: line,
      column: column
    })
  );
};

window.ReactNativeWebView.postMessage("🚀 WEBVIEW SCRIPT START");
    var busLat = ${lat};
    var busLng = ${lng};
    var routeLayer  = null;
    var trailCoords = [[busLat, busLng]];

    // Dark map tiles
    var map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([busLat, busLng], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Bus marker with pulse
    var busIcon = L.divIcon({
      className: '',
      html: \`
        <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
          <div class="pulse-ring"></div>
          <div style="
            background:#6366F1; width:46px; height:46px;
            border-radius:50%; display:flex; align-items:center;
            justify-content:center; font-size:22px;
            box-shadow:0 4px 18px rgba(99,102,241,0.65);
            border:3px solid white; z-index:2;
          ">🚌</div>
        </div>
      \`,
      iconSize:   [52, 52],
      iconAnchor: [26, 26],
    });

    var busMarker = L.marker([busLat, busLng], { icon: busIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup('<b>🚌 ${busLabel}</b><br><span style="color:#6366F1">Your position</span>');

    // Green trail
    var trailLine = L.polyline(trailCoords, {
      color: '#10B981', weight: 3, opacity: 0.5
    }).addTo(map);

    // Fetch OSRM route between two points
    function fetchRoute(fromLat, fromLng, toLat, toLng) {
      var url = 'https://router.project-osrm.org/route/v1/driving/'
        + fromLng + ',' + fromLat + ';'
        + toLng   + ',' + toLat
        + '?overview=full&geometries=geojson';

      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.routes || !data.routes[0]) return;
          if (routeLayer) map.removeLayer(routeLayer);

          var coords = data.routes[0].geometry.coordinates.map(function(c) {
            return [c[1], c[0]];
          });

          // Uber-style blue road line
          routeLayer = L.polyline(coords, {
            color:    '#3B82F6',
            weight:   6,
            opacity:  0.85,
            lineCap:  'round',
            lineJoin: 'round',
          }).addTo(map);

          busMarker.bringToFront();
        })
        .catch(function() {
          if (routeLayer) map.removeLayer(routeLayer);
          routeLayer = L.polyline(
            [[fromLat,fromLng],[toLat,toLng]],
            { color:'#3B82F6', weight:4, dashArray:'10,8', opacity:0.7 }
          ).addTo(map);
        });
    }

    // Called from React Native on each socket update
    window.updateDriverPosition = function(lat, lng) {
      busMarker.setLatLng([lat, lng]);

      // Extend green trail
      trailCoords.push([lat, lng]);
      trailLine.setLatLngs(trailCoords);

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
          <Text style={{ fontSize: 30 }}>🗺️</Text>
        </View>
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 16 }} />
        <Text style={styles.loadingText}>Loading map…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDark} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => require("expo-router").router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.topTitle}>Bus Map</Text>
          {busNo ? <Text style={styles.topSub}>🚌 {busNo}</Text> : null}
        </View>
        <View style={[styles.connPill, {
          backgroundColor: connected ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.12)"
        }]}>
          <View style={[styles.connDot, { backgroundColor: connected ? C.success : C.danger }]} />
          <Text style={[styles.connText, { color: connected ? C.success : C.danger }]}>
            {connected ? "Live" : "Offline"}
          </Text>
        </View>
      </View>

     <WebView
  ref={webViewRef}
  originWhitelist={["*"]}
  source={{ html }}
  style={{ flex: 1 }}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  mixedContentMode="always"
  onMessage={(e) => {
    console.log("🌐 WebView:", e.nativeEvent.data);
  }}
  onError={(e) => {
    console.log("❌ WebView ERROR:", e.nativeEvent);
  }}
/>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomItem}>
          <Text style={styles.bottomLabel}>UPDATES</Text>
          <Text style={styles.bottomValue}>{updateCount}</Text>
        </View>
        <View style={styles.bottomDivider} />
        <View style={styles.bottomItem}>
          <Text style={styles.bottomLabel}>ROUTE LINE</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: "#3B82F6" }} />
            <Text style={styles.bottomValue}>Road Route</Text>
          </View>
        </View>
        <View style={styles.bottomDivider} />
        <View style={styles.bottomItem}>
          <Text style={styles.bottomLabel}>TRAIL</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: C.success }} />
            <Text style={styles.bottomValue}>Driven</Text>
          </View>
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
  loadingIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.primary + "22",
    alignItems: "center", justifyContent: "center",
  },
  loadingText: { color: C.textOnDark, fontSize: 17, fontWeight: "700", marginTop: 12 },

  topBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: C.bgDark,
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center",
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  backBtn:   { width: 36, height: 36, backgroundColor: C.bgMid, borderRadius: 10, alignItems: "center", justifyContent: "center" } as any,
  backArrow: { color: C.textOnDark, fontSize: 22, fontWeight: "300", lineHeight: 28 },
  topTitle:  { color: C.textOnDark, fontSize: 17, fontWeight: "700" },
  topSub:    { color: C.textMuted,  fontSize: 12, marginTop: 1 },
  connPill:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  connDot:   { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  connText:  { fontSize: 12, fontWeight: "700" },

  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: C.bgDark,
    flexDirection: "row",
    paddingVertical: 18, paddingHorizontal: 20,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  bottomItem:    { flex: 1, alignItems: "center", gap: 5 },
  bottomLabel:   { fontSize: 9, fontWeight: "700", color: C.textMuted, letterSpacing: 1.2 },
  bottomValue:   { fontSize: 13, fontWeight: "700", color: C.textOnDark },
  bottomDivider: { width: 1, height: 36, backgroundColor: C.bgMid, alignSelf: "center" },
});

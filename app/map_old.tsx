import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";
import { io } from "socket.io-client";
import API from "../services/api";

// ⚠️ Change this to your backend IP
const socket = io("http://192.168.31.237:5000");

export default function MapScreen() {
  const webViewRef = useRef<WebView>(null);

  const [html, setHtml] = useState("");

  useEffect(() => {
    loadBus();
  }, []);

  // socket listeners that use the webview ref
 useEffect(() => {

  // Listen once when component mounts
  socket.on("connect", () => {
    console.log("✅ Socket Connected:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.log("❌ Socket Error:", err.message);
  });

  socket.on("busLocationUpdated", (bus) => {
    console.log("📍 Live Update:", bus);

    webViewRef.current?.injectJavaScript(`
      if(window.updateBusLocation){
        window.updateBusLocation(
          ${bus.latitude},
          ${bus.longitude}
        );
      }
      true;
    `);
  });

  return () => {
    socket.off("connect");
    socket.off("connect_error");
    socket.off("busLocationUpdated");
  };

}, []);
 

  const loadBus = async () => {
    try {
      const data = await AsyncStorage.getItem("driver");

      if (!data) return;

      const driver = JSON.parse(data);

      const res = await API.get(
        `/buses/busno/${driver.assignedBus}`
      );

      const lat = res.data.latitude;
      const lng = res.data.longitude;

      const mapHtml = `
<!DOCTYPE html>
<html>

<head>

<meta name="viewport"
content="width=device-width, initial-scale=1.0"/>

<link
rel="stylesheet"
href="https://unpkg.com/leaflet/dist/leaflet.css"
/>

<style>

html,
body,
#map{

width:100%;
height:100%;
margin:0;
padding:0;

}

</style>

</head>

<body>

<div id="map"></div>

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

<script>

var map=L.map('map').setView(
[${lat},${lng}],
16
);

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{
maxZoom:19
}
).addTo(map);

var busIcon=L.icon({

iconUrl:
'https://cdn-icons-png.flaticon.com/512/61/61231.png',

iconSize:[40,40]

});

var marker=L.marker(
[${lat},${lng}],
{
icon:busIcon
}
).addTo(map);

marker.bindPopup("🚌 Live Bus");

// Store all bus positions
var routeCoordinates = [
  [${lat}, ${lng}]
];

// Draw initial polyline
var routeLine = L.polyline(routeCoordinates, {
  color: "blue",
  weight: 5,
}).addTo(map);

// Update function called from React Native
window.updateBusLocation = function(lat, lng) {

  // Move marker
  marker.setLatLng([lat, lng]);

  // Save new point
  routeCoordinates.push([lat, lng]);

  // Update polyline
  routeLine.setLatLngs(routeCoordinates);

  // Keep map centered
  map.panTo([lat, lng]);
}

</script>

</body>

</html>
`;

      setHtml(mapHtml);
    } catch (error) {
      console.log(error);
    }
  };

  if (!html) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <WebView
      ref={webViewRef}
      originWhitelist={["*"]}
      source={{
        html,
      }}
    />
  );
}
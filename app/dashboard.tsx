// app/dashboard.tsx  ─ Driver Dashboard
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { C, S } from "../theme";

// ─── Small reusable components ──────────────────────────────

function InfoRow({ icon, label, value, accent }: {
  icon: string; label: string; value: string; accent: string;
}) {
  return (
    <View style={[infoStyles.row, { borderLeftColor: accent }]}>
      <Text style={infoStyles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value} numberOfLines={1}>{value || "—"}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16,
    borderLeftWidth: 3,
  },
  icon:  { fontSize: 20, marginRight: 14, width: 28, textAlign: "center" },
  label: { fontSize: 10, fontWeight: "700", color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 15, fontWeight: "700", color: C.textPrimary },
});

function ActionCard({ icon, title, subtitle, accent, onPress }: {
  icon: string; title: string; subtitle: string; accent: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[actionStyles.card, { borderLeftColor: accent }]} onPress={onPress} activeOpacity={0.78}>
      <View style={[actionStyles.iconBox, { backgroundColor: accent + "18" }]}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={actionStyles.title}>{title}</Text>
        <Text style={actionStyles.sub}>{subtitle}</Text>
      </View>
      <View style={[actionStyles.arrow, { backgroundColor: accent + "18" }]}>
        <Text style={[actionStyles.arrowText, { color: accent }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const actionStyles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 16, paddingHorizontal: 16,
    borderLeftWidth: 3,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14 },
  title:   { fontSize: 15, fontWeight: "700", color: C.textPrimary, marginBottom: 2 },
  sub:     { fontSize: 12, color: C.textSub },
  arrow:   { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  arrowText: { fontSize: 20, fontWeight: "700", lineHeight: 24 },
});

// ─── Main Screen ────────────────────────────────────────────

export default function Dashboard() {
  const [driver, setDriver] = useState<any>(null);
  const [time,   setTime]   = useState(new Date());

  useEffect(() => {
    loadDriver();
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const loadDriver = async () => {
    const data = await AsyncStorage.getItem("driver");
    if (data) setDriver(JSON.parse(data));
  };

  const logout = () =>
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          await AsyncStorage.multiRemove(["token", "driver", "currentTripId"]);
          router.replace("/");
        },
      },
    ]);

  const greeting = () => {
    const h = time.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={{ flex: 1, backgroundColor: C.bgLight }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDark} />

      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.driverName}>{driver?.name ?? "Driver"}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 17 }}>🚪</Text>
          </TouchableOpacity>
        </View>

        {/* Status pill row */}
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>On duty · {timeStr}</Text>
          </View>
          {driver?.assignedBus && (
            <View style={[styles.pill, { backgroundColor: C.primary + "22" }]}>
              <Text style={[styles.pillText, { color: C.primary2 }]}>🚌 {driver.assignedBus}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Driver Info ────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Driver Details</Text>
        <View style={styles.section}>
          <InfoRow icon="🚌" label="Assigned Bus"  value={driver?.assignedBus} accent={C.primary}  />
          <View style={styles.divider} />
          <InfoRow icon="🪪" label="License No."   value={driver?.license}     accent={C.warning}  />
          <View style={styles.divider} />
          <InfoRow icon="📱" label="Phone"         value={driver?.phone}       accent={C.success}  />
          <View style={styles.divider} />
          <InfoRow icon="✉️" label="Email"         value={driver?.email}       accent="#8B5CF6"    />
        </View>

        {/* ── Quick Actions ──────────────────────────────── */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.section}>
          <ActionCard
            icon="📍" title="Live Tracking"
            subtitle="Start or stop your route tracking"
            accent={C.success}
            onPress={() => router.push("/tracking")}
          />
          <View style={styles.divider} />
          <ActionCard
            icon="🗺️" title="View Bus Map"
            subtitle="See your bus location live on map"
            accent={C.primary}
            onPress={() => router.push("/map")}
          />
        </View>

        {/* ── Info banner ────────────────────────────────── */}
        <View style={styles.banner}>
          <Text style={{ fontSize: 20, marginRight: 12 }}>💡</Text>
          <Text style={styles.bannerText}>
            Always start tracking before your route begins — parents follow your bus live.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.bgDark,
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 28,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: "hidden", position: "relative",
  },
  circle1: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: C.primary, opacity: 0.07, top: -70, right: -50,
  },
  circle2: {
    position: "absolute", width: 140, height: 140, borderRadius: 70,
    backgroundColor: C.primary2, opacity: 0.06, bottom: -30, left: -20,
  },

  headerRow:   { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  greeting:    { color: C.textMuted, fontSize: 13, marginBottom: 3 },
  driverName:  { color: C.textOnDark, fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  logoutBtn:   { backgroundColor: C.bgMid, padding: 10, borderRadius: 10 },

  pillRow: { flexDirection: "row", gap: 8 },
  pill:    {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  pillDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success, marginRight: 7 },
  pillText: { color: C.textMuted, fontSize: 12, fontWeight: "500" },

  sectionLabel: {
    fontSize: 10, fontWeight: "700", color: C.textMuted,
    textTransform: "uppercase", letterSpacing: 1,
    marginBottom: 8, marginTop: 6, marginLeft: 2,
  },
  section: {
    backgroundColor: C.bgCard, borderRadius: S.radiusLg,
    marginBottom: 18, ...S.shadow, overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 58 },

  banner: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: C.primaryBg,
    borderRadius: S.radiusMd, padding: 16,
    borderWidth: 1, borderColor: C.primary + "28",
  },
  bannerText: { flex: 1, fontSize: 13, color: C.primary, fontWeight: "500", lineHeight: 20 },
});

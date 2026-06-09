import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useAppContext } from "./AppContext";
import BackHeader from "./BackHeader";
import { translations } from "./translations";

const STORAGE_KEY = "smartbee_notif_prefs";

interface NotifPrefs {
  master:   boolean;
  danger:   boolean;
  sound:    boolean;
  temp:     boolean;
  humidity: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  master:   false,
  danger:   true,
  sound:    true,
  temp:     true,
  humidity: true,
};

export default function NotificationsScreen() {
  const { language } = useAppContext();
  const t = translations[language];

  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);

  const masterAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim  = useRef(new Animated.Value(0)).current;
  const subAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load saved prefs
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) setPrefs(JSON.parse(stored));
    });
    // Staggered entrance
    [masterAnim, badgeAnim, subAnim].forEach((a, i) =>
      Animated.timing(a, {
        toValue: 1, duration: 380,
        delay: 80 + i * 90,
        useNativeDriver: true,
      }).start()
    );
  }, []);

  const savePrefs = async (updated: NotifPrefs) => {
    setPrefs(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const toggleMaster = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return;
    }
    await savePrefs({ ...prefs, master: value });
  };

  const toggleSub = (key: keyof Omit<NotifPrefs, "master">) =>
    async (value: boolean) => {
      await savePrefs({ ...prefs, [key]: value });
    };

  // A sub-toggle is effectively ON only when master is also ON
  const isOn = (key: keyof NotifPrefs) => prefs.master && prefs[key];

  const animStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  });

  return (
    <View style={styles.container}>

      {/* ← Back header */}
      <BackHeader title={t.notifications ?? "Notifications"} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Master toggle card ──────────────────────────────────────────── */}
        <Animated.View style={[styles.masterCard, animStyle(masterAnim)]}>
          <View style={[styles.masterIconWrap, { backgroundColor: prefs.master ? "#FFC107" : "#e0e0e0" }]}>
            <Ionicons
              name={prefs.master ? "notifications" : "notifications-off"}
              size={24} color="#fff"
            />
          </View>
          <View style={styles.masterText}>
            <Text style={styles.masterLabel}>{t.notifEnableAll}</Text>
            <Text style={styles.masterSub}>{t.notifEnableAllSub}</Text>
          </View>
          <Switch
            value={prefs.master}
            onValueChange={toggleMaster}
            trackColor={{ false: "#e0e0e0", true: "#FFD54F" }}
            thumbColor={prefs.master ? "#FFC107" : "#bbb"}
          />
        </Animated.View>

        {/* ── Status badge ────────────────────────────────────────────────── */}
        <Animated.View style={[
          styles.statusBadge,
          animStyle(badgeAnim),
          { backgroundColor: prefs.master ? "#E8F8EE" : "#FFF0F0" },
        ]}>
          <Ionicons
            name={prefs.master ? "checkmark-circle" : "close-circle"}
            size={15}
            color={prefs.master ? "#2ECC71" : "#E74C3C"}
          />
          <Text style={[styles.statusText, { color: prefs.master ? "#2ECC71" : "#E74C3C" }]}>
            {prefs.master ? t.notifEnabled : t.notifDisabled}
          </Text>
        </Animated.View>

        {/* ── Sub-toggles card ────────────────────────────────────────────── */}
        <Animated.View style={[styles.subCard, animStyle(subAnim)]}>

          <NotifRow
            icon="bug-outline"
            iconColor="#E74C3C"
            iconBg="#FFECEC"
            label={t.notifDanger}
            sub={t.notifDangerSub}
            value={isOn("danger")}
            disabled={!prefs.master}
            onToggle={toggleSub("danger")}
          />
          <View style={styles.rowDivider} />

          <NotifRow
            icon="volume-high-outline"
            iconColor="#3A86FF"
            iconBg="#EAF3FF"
            label={t.notifSound}
            sub={t.notifSoundSub}
            value={isOn("sound")}
            disabled={!prefs.master}
            onToggle={toggleSub("sound")}
          />
          <View style={styles.rowDivider} />

          <NotifRow
            icon="thermometer-outline"
            iconColor="#FF5722"
            iconBg="#FFF3EE"
            label={t.notifTemp}
            sub={t.notifTempSub}
            value={isOn("temp")}
            disabled={!prefs.master}
            onToggle={toggleSub("temp")}
          />
          <View style={styles.rowDivider} />

          <NotifRow
            icon="water-outline"
            iconColor="#2196F3"
            iconBg="#E8F4FF"
            label={t.notifHumidity}
            sub={t.notifHumiditySub}
            value={isOn("humidity")}
            disabled={!prefs.master}
            onToggle={toggleSub("humidity")}
          />

        </Animated.View>

      </ScrollView>
    </View>
  );
}

// ─── Reusable toggle row ──────────────────────────────────────────────────────
function NotifRow({
  icon, iconColor, iconBg, label, sub, value, disabled, onToggle,
}: {
  icon: any; iconColor: string; iconBg: string;
  label: string; sub: string;
  value: boolean; disabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={[rowStyles.row, disabled && rowStyles.rowDisabled]}>
      <View style={[rowStyles.iconWrap, { backgroundColor: disabled ? "#F5F5F5" : iconBg }]}>
        <Ionicons name={icon} size={20} color={disabled ? "#ccc" : iconColor} />
      </View>
      <View style={rowStyles.text}>
        <Text style={[rowStyles.label, disabled && rowStyles.labelDisabled]}>{label}</Text>
        <Text style={rowStyles.sub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: "#e0e0e0", true: "#FFD54F" }}
        thumbColor={value && !disabled ? "#FFC107" : "#bbb"}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const rowStyles = StyleSheet.create({
  row:           { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  rowDisabled:   { opacity: 0.45 },
  iconWrap:      { width: 38, height: 38, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  text:          { flex: 1 },
  label:         { fontSize: 14.5, fontWeight: "600", color: "#1a1a1a" },
  labelDisabled: { color: "#aaa" },
  sub:           { fontSize: 12, color: "#aaa", marginTop: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll:    { paddingHorizontal: 22, paddingBottom: 40 },

  // Master card
  masterCard:     {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#FAFAFA", padding: 16, borderRadius: 18,
    marginTop: 16, elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8,
  },
  masterIconWrap: { width: 50, height: 50, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  masterText:     { flex: 1 },
  masterLabel:    { fontSize: 15, fontWeight: "bold", color: "#1a1a1a" },
  masterSub:      { fontSize: 12, color: "#aaa", marginTop: 2 },

  // Status badge
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, marginTop: 10, marginBottom: 2,
  },
  statusText: { fontSize: 12.5, fontWeight: "600" },

  // Sub-toggles card
  subCard: {
    backgroundColor: "#FAFAFA", borderRadius: 18,
    paddingVertical: 4, paddingHorizontal: 16,
    marginTop: 10, elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8,
  },
  rowDivider: { height: 1, backgroundColor: "#F0F0F0" },
});
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useAppContext } from "./AppContext";
import { auth, db } from "./firebase";
import { checkTrialExpired } from "./SubscribeScreen";
import { Lang, translations } from "./translations";

const screenWidth = Dimensions.get("window").width;

const SOUND_LOW_DB  = 45;
const SOUND_HIGH_DB = 65;

const getSeverity = (count: number, hasIntruder: boolean, t: typeof translations.English) => {
  if (hasIntruder || count >= 3) return { label: t.criticalLabel, color: "#8B0000", bg: "#FFF0F0", level: "CRITICAL" };
  if (count === 2)               return { label: t.highLabel,     color: "#E74C3C", bg: "#FFF4F4", level: "HIGH" };
  return                                { label: t.warningLabel,  color: "#E67E22", bg: "#FFFBF0", level: "WARNING" };
};

const buildAlertMsg = (
  t: typeof translations.English,
  flags: {
    intruder: boolean; highTemp: boolean; lowTemp: boolean;
    highHumidity: boolean; lowHumidity: boolean;
    lowSound: boolean; highSound: boolean;
    soundDb?: number;
  }
): string => {
  let msg = "";
  if (flags.intruder)     msg += `🚨 ${t.intruderDetected}\n`;
  if (flags.highTemp)     msg += `🔥 ${t.highTemperature}\n`;
  if (flags.lowTemp)      msg += `🥶 ${t.lowTemperature}\n`;
  if (flags.highHumidity) msg += `💧 ${t.highHumidityAlert}\n`;
  if (flags.lowHumidity)  msg += `💦 ${t.lowHumidityAlert}\n`;
  if (flags.lowSound)     msg += `🔕 ${t.lowBeeSound} (${flags.soundDb?.toFixed(1)} dB)\n`;
  if (flags.highSound)    msg += `🔊 ${t.highBeeSound} (${flags.soundDb?.toFixed(1)} dB)\n`;
  return msg.trim();
};

const sendSituationNotifications = async (
  hiveName: string,
  t: typeof translations.English,
  flags: {
    intruder: boolean; highTemp: boolean; lowTemp: boolean;
    highHumidity: boolean; lowHumidity: boolean;
    lowSound: boolean; highSound: boolean;
    soundDb?: number; temperature?: number; humidity?: number;
  }
) => {
  try {
    type NotifDef = { title: string; body: string; danger: boolean };
    const notifs: NotifDef[] = [];

    if (flags.intruder) {
      notifs.push({ title: `🚨 ${hiveName} — ${t.intruderDetected}`, body: t.intruderDetail, danger: true });
    }
    if (flags.highTemp) {
      notifs.push({ title: `🔥 ${hiveName} — ${t.highTemperature}`, body: `${t.highTempDetail} (${flags.temperature?.toFixed(1)}°C)`, danger: flags.temperature != null && flags.temperature >= 42 });
    }
    if (flags.lowTemp) {
      notifs.push({ title: `🥶 ${hiveName} — ${t.lowTemperature}`, body: `${flags.temperature?.toFixed(1)}°C`, danger: false });
    }
    if (flags.highHumidity) {
      notifs.push({ title: `💧 ${hiveName} — ${t.highHumidityAlert}`, body: `${t.highHumidityDetail} (${flags.humidity?.toFixed(1)}%)`, danger: flags.humidity != null && flags.humidity >= 85 });
    }
    if (flags.lowHumidity) {
      notifs.push({ title: `💦 ${hiveName} — ${t.lowHumidityAlert}`, body: `${t.lowHumidityDetail} (${flags.humidity?.toFixed(1)}%)`, danger: false });
    }
    if (flags.lowSound) {
      notifs.push({ title: `🔕 ${hiveName} — ${t.lowBeeSound}`, body: `${t.abnormalSoundDetail} (${flags.soundDb?.toFixed(1)} dB)`, danger: false });
    }
    if (flags.highSound) {
      notifs.push({ title: `🔊 ${hiveName} — ${t.highBeeSound}`, body: `${t.abnormalSoundDetail} (${flags.soundDb?.toFixed(1)} dB)`, danger: false });
    }

    for (const notif of notifs) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notif.title,
          body:  notif.body,
          sound: "default",
          ...(Platform.OS === "android" && notif.danger ? { color: "#FF0000", priority: Notifications.AndroidNotificationPriority.MAX } : {}),
          ...(Platform.OS === "ios"     && notif.danger ? { sound: "default", interruptionLevel: "critical" } : {}),
        },
        trigger: null,
      });
    }
  } catch (e) {}
};

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true,
      shouldShowBanner: true, shouldShowList: true,
    }),
  });
} catch (e) {}

function MenuItem({ icon, label, color = "#222", onPress }: {
  icon: any; label: string; color?: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={mStyles.item} onPress={onPress} activeOpacity={0.6}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[mStyles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HiveDashboard() {
  const router  = useRouter();
  const context = useAppContext();
  const { language } = context || { language: "English" };
  const langKey = language as Lang;
  const t = translations[langKey];

  const [selectedHive,    setSelectedHive]    = useState<any>({ weight: 0, temperature: 0, humidity: 0 });
  const [hives,           setHives]           = useState<any[]>([]);
  const [hiveName,        setHiveName]        = useState<string>("");
  const [pendingHive,     setPendingHive]     = useState<any>(null);
  const [hiveCount,       setHiveCount]       = useState(0);
  const [loading,         setLoading]         = useState(false);
  const [message,         setMessage]         = useState("");
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [menuVisible,     setMenuVisible]     = useState(false);
  const [limitVisible,    setLimitVisible]    = useState(false);
  const [noHivesAnim]   = useState(new Animated.Value(0));

  const [statsTab,    setStatsTab]    = useState<"week"|"month"|"year">("week");
  const [chartData,   setChartData]   = useState<number[]>([]);
  const [extraData,   setExtraData]   = useState<any>({ temperature: [], humidity: [] });
  const [labels,      setLabels]      = useState<string[]>([]);
  const [hasWeekData, setHasWeekData] = useState(false);

  const [userName,  setUserName]  = useState("User");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  const weightAnim   = useRef(new Animated.Value(0)).current;
  const tempAnim     = useRef(new Animated.Value(0)).current;
  const humidityAnim = useRef(new Animated.Value(0)).current;

  const [alertMsg,      setAlertMsg]      = useState<string>("");
  const [alertSeverity, setAlertSeverity] = useState(() => getSeverity(1, false, translations.English));
  const [alertVisible,  setAlertVisible]  = useState(false);
  const alertAnim = useRef(new Animated.Value(0)).current;

  const getDisplayName = (name: string) => {
    if (!name) return t.hiveNumber;
    const match = name.match(/\d+/);
    if (!match) return name;
    const num = match[0];
    const word: Record<Lang, string> = { English: "Hive", French: "Ruche", Arabic: "الخلية" };
    return `${word[langKey]} ${num}`;
  };

  const displayHiveName = hiveName ? getDisplayName(hiveName) : t.hiveNumber;

  const playDangerSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(require("../assets/sounds/danger.mp3"));
      await sound.playAsync();
    } catch (e) { console.log("Sound error:", e); }
  };

  const showAlertModal = (msg: string, sev: ReturnType<typeof getSeverity>) => {
    setAlertMsg(msg);
    setAlertSeverity(sev);
    setAlertVisible(true);
    alertAnim.setValue(0);
    Animated.spring(alertAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  };

  const dismissAlert = () => {
    Animated.timing(alertAnim, { toValue: 0, duration: 250, useNativeDriver: true })
      .start(() => setAlertVisible(false));
  };

  useEffect(() => {
    checkTrialExpired().then((expired) => {
      if (expired) router.replace("/SubscribeScreen");
    });
  }, []);

  const loadUserFromFirebase = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        const full = `${data.name ?? ""} ${data.surname ?? ""}`.trim();
        setUserName(full || "User");
        if (data.photo) setUserPhoto(data.photo);
      }
    } catch (e) {
      console.log("Error loading user:", e);
    }
  };

  useEffect(() => { loadUserFromFirebase(); }, []);

  const handleOpenMenu = async () => {
    await loadUserFromFirebase();
    setMenuVisible(true);
  };

  useEffect(() => {
    if (!hiveName) return;
    const q = query(collection(db, "hives"), where("name", "==", hiveName));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach(async (docSnap) => {
        const hive        = docSnap.data();
        const soundLevel  = hive.soundLevel  as number;
        const temperature = hive.temperature as number;
        const humidity    = hive.humidity    as number;
        const soundDb     = soundLevel;

        const flags = {
          intruder:     hive.intruder === true,
          highTemp:     temperature > 40,
          lowTemp:      temperature < 28,
          highHumidity: humidity > 80,
          lowHumidity:  humidity < 40,
          lowSound:     soundDb < SOUND_LOW_DB,
          highSound:    soundDb > SOUND_HIGH_DB,
          soundDb, temperature, humidity,
        };

        const activeCount = [
          flags.intruder, flags.highTemp, flags.lowTemp,
          flags.highHumidity, flags.lowHumidity,
          flags.lowSound || flags.highSound,
        ].filter(Boolean).length;

        if (activeCount === 0) return;

        const msg = buildAlertMsg(t, flags);
        const sev = getSeverity(activeCount, flags.intruder, t);
        showAlertModal(msg, sev);
        playDangerSound();
        await sendSituationNotifications(hiveName, t, flags);
      });
    });
    return () => unsubscribe();
  }, [hiveName, langKey]);

  useEffect(() => {
    [weightAnim, tempAnim, humidityAnim].forEach((a) =>
      Animated.timing(a, { toValue: 1, duration: 500, useNativeDriver: true }).start()
    );
  }, [selectedHive]);

  useEffect(() => {
    if (hiveName) fetchStats(hiveName, statsTab);
  }, [hiveName, statsTab]);

  const fetchStats = async (name: string, period: string) => {
    if (period === "month" || period === "year") { setHasWeekData(false); return; }
    try {
      const snap = await getDocs(query(collection(db, "hives"), where("name", "==", name)));
      if (!snap.empty) {
        const story = snap.docs[0].data().story || [];
        const cnt   = 7;
        if (story.length >= cnt) {
          const items = story.slice(-cnt);
          setLabels(items.map((i: any) => i.date?.replace(/"/g, "").split("-")[2] ?? ""));
          setChartData(items.map((i: any) => i.weight));
          setExtraData({ temperature: items.map((i: any) => i.temperature), humidity: items.map((i: any) => i.humidity) });
          setHasWeekData(true);
          return;
        }
      }
      setHasWeekData(false);
    } catch { setHasWeekData(false); }
  };

  const showNoHivesText = () =>
    Animated.timing(noHivesAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  const hideNoHivesText = () =>
    Animated.timing(noHivesAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start();

  const handleAddHive = async () => {
    if (hiveCount >= 5) { setLimitVisible(true); return; }
    setLoading(true);
    setMessage(t.checking);
    await new Promise((res) => setTimeout(res, 800));
    const nextNum    = hiveCount + 1;
    const candidates = [`Hive ${nextNum}`, `Hive${nextNum}`, `hive ${nextNum}`, `hive${nextNum}`];
    try {
      let found = false;
      for (const candidate of candidates) {
        const snap = await getDocs(query(collection(db, "hives"), where("name", "==", candidate)));
        if (!snap.empty) {
          const d = snap.docs[0].data();
          const newHive = { name: candidate, weight: d.weight, temperature: d.temperature, humidity: d.humidity };
          setHives((p) => [...p, newHive]);
          setSelectedHive(newHive);
          setHiveName(candidate);
          setHiveCount(nextNum);
          setMessage(t.confirmed);
          found = true;
          break;
        }
      }
      if (!found) setMessage(`❌ Hive ${nextNum} ${t.notFound}`);
    } catch { setMessage(t.connError); }
    setTimeout(() => setLoading(false), 1500);
  };

  const alertIcon =
    alertSeverity.level === "CRITICAL" ? "skull-outline" :
    alertSeverity.level === "HIGH"     ? "warning-outline" : "alert-circle-outline";

  const showChart  = statsTab === "week" && hasWeekData;
  const noDataText =
    statsTab === "week"  ? t.noDataWeek  :
    statsTab === "month" ? t.noDataMonth : t.noDataYear;

  return (
    <View style={styles.container}>

      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            if (selectorVisible) { setSelectorVisible(false); hideNoHivesText(); }
            else { setSelectorVisible(true); if (hives.length === 0) showNoHivesText(); }
          }}
        >
          <Text style={styles.hiveNumber}>{displayHiveName} ▼</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleOpenMenu}>
          <Ionicons name="menu" size={28} />
        </TouchableOpacity>
      </View>

      {alertVisible && !!alertMsg && !!hiveName && (
        <View style={styles.alertOverlay} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.alertBox,
              { backgroundColor: alertSeverity.bg },
              { opacity: alertAnim, transform: [{ scale: alertAnim.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }] },
            ]}
          >
            <View style={[styles.alertStripe, { backgroundColor: alertSeverity.color }]}>
              <Ionicons name={alertIcon} size={13} color="#fff" />
              <Text style={styles.alertStripeText}>
                {alertSeverity.level === "CRITICAL" ? "🚨 " : alertSeverity.level === "HIGH" ? "🔴 " : "⚠️ "}
                {alertSeverity.label.toUpperCase()} — {displayHiveName}
              </Text>
            </View>
            <Text style={[styles.alertSubtitle, { color: alertSeverity.color }]}>
              {alertSeverity.level === "CRITICAL" ? `🚨 ${t.immediateAction}` :
               alertSeverity.level === "HIGH"     ? `🔴 ${t.urgentAttention}` : `⚠️ ${t.inspectHive}`}
            </Text>
            <View style={styles.alertDivider} />
            <Text style={styles.alertText}>{alertMsg}</Text>
            <TouchableOpacity style={[styles.dismissBtn, { backgroundColor: alertSeverity.color }]} onPress={dismissAlert}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.dismissBtnText}>{t.acknowledge}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      <View style={styles.cardsContainer}>
        <Animated.View style={[styles.card, { opacity: weightAnim }]}>
          <Ionicons name="scale-outline" size={24} color="#FFC107" />
          <View style={styles.cardText}><Text>{t.weight}</Text><Text>{selectedHive.weight} kg</Text></View>
        </Animated.View>
        <Animated.View style={[styles.card, { opacity: tempAnim }]}>
          <Ionicons name="thermometer-outline" size={24} color="#FF5722" />
          <View style={styles.cardText}><Text>{t.temp}</Text><Text>{selectedHive.temperature} °C</Text></View>
        </Animated.View>
        <Animated.View style={[styles.card, { opacity: humidityAnim }]}>
          <Ionicons name="water-outline" size={24} color="#2196F3" />
          <View style={styles.cardText}><Text>{t.humidity}</Text><Text>{selectedHive.humidity} %</Text></View>
        </Animated.View>
      </View>

      <View style={{ marginTop: 30 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="stats-chart" size={22} />
          <Text style={{ fontSize: 18, fontWeight: "bold", marginLeft: 8 }}>{t.statistics}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 10 }}>
          {(["week", "month", "year"] as const).map((tab) => (
            <TouchableOpacity key={tab} onPress={() => setStatsTab(tab)}>
              <Text style={{
                fontWeight: "bold", color: statsTab === tab ? "#FFC107" : "#999",
                fontSize: 16, borderBottomWidth: statsTab === tab ? 2 : 0,
                borderBottomColor: "#FFC107", paddingBottom: 4,
              }}>{t[tab]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {showChart ? (
          <LineChart
            data={{
              labels,
              datasets: [
                { data: chartData,             color: () => "#FFC107", strokeWidth: 2 },
                { data: extraData.temperature, color: () => "#FF5722", strokeWidth: 2 },
                { data: extraData.humidity,    color: () => "#2196F3", strokeWidth: 2 },
              ],
              legend: [`${t.weight}(kg)   `, `${t.temp}(°C)   `, `${t.humidity}(%)`],
            }}
            width={screenWidth - 40} height={220}
            chartConfig={{
              backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff",
              decimalPlaces: 1, color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
              labelColor: () => "#333", propsForDots: { r: "3" },
            }}
            bezier style={{ borderRadius: 15, marginTop: 10 }}
          />
        ) : (
          <Text style={{ textAlign: "center", marginTop: 20, color: "#999" }}>{noDataText}</Text>
        )}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddHive}>
        <Text style={{ color: "#fff", fontSize: 24 }}>+</Text>
      </TouchableOpacity>

      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.box}>
            <ActivityIndicator size="large" color="#FFC107" />
            <Text style={styles.text}>{message}</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={limitVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.limitBox}>
            <View style={styles.limitIconWrap}>
              <Ionicons name="grid" size={32} color="#FFC107" />
            </View>
            <Text style={styles.limitTitle}>{t.limitTitle}</Text>
            <View style={styles.hiveDots}>
              {[1,2,3,4,5].map((n) => (
                <View key={n} style={[styles.hiveDot, { backgroundColor: n <= hiveCount ? "#FFC107" : "#e8e8e8" }]} />
              ))}
            </View>
            <Text style={styles.limitBody}>{t.limitBody}</Text>
            <TouchableOpacity style={styles.limitBtn} onPress={() => setLimitVisible(false)}>
              <Text style={styles.limitBtnText}>{t.limitBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={selectorVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.selectorBox}>
            <Text style={styles.selectorTitle}>{t.myHives}</Text>
            {hives.length > 0 ? (
              <>
                {hives.map((hive, index) => {
                  const isPending = (pendingHive ?? selectedHive)?.name === hive.name;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.selectorItem, isPending && styles.selectorItemActive]}
                      onPress={() => setPendingHive(hive)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.selectorItemText, isPending && styles.selectorItemTextActive]}>
                        {getDisplayName(hive.name)}
                      </Text>
                      {isPending && <Ionicons name="checkmark-circle" size={22} color="#FFC107" />}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={styles.selectorOkBtn}
                  onPress={() => {
                    const chosen = pendingHive ?? selectedHive;
                    if (chosen) { setSelectedHive(chosen); setHiveName(chosen.name); fetchStats(chosen.name, statsTab); }
                    setPendingHive(null); setSelectorVisible(false); hideNoHivesText();
                  }}
                >
                  <Text style={styles.selectorOkText}>OK</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Animated.View style={{ opacity: noHivesAnim, alignItems: "center", paddingVertical: 16 }}>
                <Text style={{ color: "#bbb", marginBottom: 10 }}>{t.noHivesYet}</Text>
                <TouchableOpacity onPress={() => { setSelectorVisible(false); hideNoHivesText(); }}>
                  <Text style={{ color: "#FFC107", fontWeight: "bold" }}>{t.close}</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={menuVisible} transparent animationType="slide">
        <View style={styles.menuWrapper}>
          <TouchableOpacity style={styles.menuOverlay} onPress={() => setMenuVisible(false)} />
          <View style={styles.menuBoxRight}>
            <View style={mStyles.menuHeader}>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <Ionicons name="menu" size={28} />
              </TouchableOpacity>
            </View>
            <View style={mStyles.profileMenu}>
              <TouchableOpacity
                onPress={() => { setMenuVisible(false); router.push("/account"); }}
                activeOpacity={0.85}
              >
                <View style={mStyles.avatarCircle}>
                  {userPhoto ? (
                    <Image source={{ uri: userPhoto }} style={mStyles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={38} color="#FFC107" />
                  )}
                  <View style={mStyles.avatarBadge}>
                    <Ionicons name="pencil" size={10} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={mStyles.userName}>{userName}</Text>
            </View>
            <View style={mStyles.menuDividerTop} />
            <MenuItem icon="person-outline"        label={t.account}       onPress={() => { setMenuVisible(false); router.push("/account"); }} />
            <MenuItem icon="globe-outline"         label={t.language}      onPress={() => { setMenuVisible(false); router.push("/language"); }} />
            <MenuItem icon="notifications-outline" label={t.notifications} onPress={() => { setMenuVisible(false); router.push("/notifications"); }} />
            <MenuItem icon="help-circle-outline"   label={t.help}          onPress={() => { setMenuVisible(false); router.push("/help"); }} />
            <View style={mStyles.divider} />
            <MenuItem icon="log-out-outline" label={t.logout} color="red"
              onPress={() => { setMenuVisible(false); router.replace("/"); }} />
          </View>
        </View>
      </Modal>

    </View>
  );
}

const mStyles = StyleSheet.create({
  item:           { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 20 },
  label:          { fontSize: 14, fontWeight: "600" },
  divider:        { height: 1, backgroundColor: "#eee", marginVertical: 8, marginHorizontal: 20 },
  menuDividerTop: { height: 1, backgroundColor: "#eee", marginBottom: 8, marginHorizontal: 20 },
  menuHeader:     { width: "100%", flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20, paddingTop: 50, marginBottom: 20 },
  profileMenu:    { alignItems: "center", marginBottom: 16, paddingHorizontal: 20 },
  avatarCircle:   { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFF8E1", borderWidth: 3, borderColor: "#FFC107", justifyContent: "center", alignItems: "center", marginBottom: 12, elevation: 4, overflow: "hidden", position: "relative" },
  avatarImage:    { width: 80, height: 80, borderRadius: 40 },
  avatarBadge:    { position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFC107", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },
  userName:       { fontSize: 15, fontWeight: "bold", color: "#1a1a1a", textAlign: "center" },
});

const styles = StyleSheet.create({
  container:      { flex: 1, padding: 20, backgroundColor: "#fff" },
  topBar:         { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#FFC107", padding: 15, borderRadius: 15, marginBottom: 20 },
  hiveNumber:     { fontSize: 20, fontWeight: "bold" },
  cardsContainer: { gap: 15 },
  card:           { flexDirection: "row", alignItems: "center", padding: 18, borderRadius: 18, backgroundColor: "#fff", elevation: 4 },
  cardText:       { marginLeft: 10 },
  addButton:      { position: "absolute", bottom: 80, right: 30, backgroundColor: "#FFC107", width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  overlay:        { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)" },
  box:            { backgroundColor: "#fff", padding: 25, borderRadius: 20, alignItems: "center", width: 220 },
  text:           { marginTop: 10, fontWeight: "bold", textAlign: "center" },
  selectorBox:    { backgroundColor: "#fff", padding: 20, borderRadius: 15, width: 240 },
  selectorTitle:  { fontSize: 15, fontWeight: "bold", marginBottom: 10, color: "#1a1a1a" },
  selectorItem:           { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 0.5, borderColor: "#eee", paddingHorizontal: 4, borderRadius: 8 },
  selectorItemActive:     { backgroundColor: "#FFFBEA" },
  selectorItemText:       { fontWeight: "bold", flex: 1, color: "#1a1a1a", fontSize: 14 },
  selectorItemTextActive: { color: "#7A5A00" },
  selectorOkBtn:  { marginTop: 14, backgroundColor: "#FFC107", borderRadius: 20, paddingVertical: 11, alignItems: "center" },
  selectorOkText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  menuWrapper:    { flex: 1, flexDirection: "row" },
  menuOverlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  menuBoxRight:   { width: 285, backgroundColor: "#fff", elevation: 15 },
  alertOverlay:   { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", zIndex: 999 },
  alertBox:       { width: 320, borderRadius: 24, paddingBottom: 22, paddingHorizontal: 20, alignItems: "flex-start", elevation: 20, overflow: "hidden" },
  alertStripe:    { flexDirection: "row", alignItems: "center", gap: 6, width: 380, paddingVertical: 9, paddingHorizontal: 18, marginBottom: 14 },
  alertStripeText:{ color: "#fff", fontWeight: "bold", fontSize: 11, letterSpacing: 1.2 },
  alertSubtitle:  { fontSize: 13, fontWeight: "700", marginBottom: 10, paddingHorizontal: 2 },
  alertDivider:   { width: "100%", height: 1, backgroundColor: "rgba(0,0,0,0.08)", marginBottom: 12 },
  alertText:      { fontSize: 15, color: "#333", lineHeight: 26, paddingHorizontal: 2, marginBottom: 4, width: "100%" },
  dismissBtn:     { marginTop: 18, flexDirection: "row", alignSelf: "center", alignItems: "center", paddingVertical: 12, paddingHorizontal: 28, borderRadius: 25 },
  dismissBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  limitBox:       { backgroundColor: "#fff", padding: 26, borderRadius: 24, alignItems: "center", width: 300, elevation: 12 },
  limitIconWrap:  { width: 70, height: 70, borderRadius: 22, backgroundColor: "#FFF8E1", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  limitTitle:     { fontSize: 18, fontWeight: "bold", color: "#1a1a1a", marginBottom: 14 },
  hiveDots:       { flexDirection: "row", gap: 8, marginBottom: 16 },
  hiveDot:        { width: 32, height: 10, borderRadius: 5 },
  limitBody:      { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 21, marginBottom: 22 },
  limitBtn:       { backgroundColor: "#FFC107", paddingVertical: 12, paddingHorizontal: 36, borderRadius: 24 },
  limitBtnText:   { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
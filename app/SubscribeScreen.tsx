import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "./firebase";

const { width, height } = Dimensions.get("window");

const FEATURES = [
  { icon: "bar-chart-outline",     text: "Real-time hive monitoring"     },
  { icon: "thermometer-outline",   text: "Temperature & humidity alerts" },
  { icon: "scale-outline",         text: "Weight tracking & trends"      },
  { icon: "notifications-outline", text: "Instant danger notifications"  },
  { icon: "bug-outline",           text: "Disease detection guidance"    },
  { icon: "wifi-outline",          text: "Multi-hive remote access"      },
];

const MONTHLY_PLANS = [
  {
    id: "1m", name: "1 Month",  price: "$2.99", per: "/mo",
    billed: "Billed monthly",
    color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", months: 1,
  },
  {
    id: "3m", name: "3 Months", price: "$2.49", per: "/mo",
    billed: "Billed $7.49 every 3 months",
    color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC",
    badge: "Best Value", months: 3,
  },
  {
    id: "6m", name: "6 Months", price: "$1.99", per: "/mo",
    billed: "Billed $11.99 every 6 months",
    color: "#2563EB", bg: "#EFF6FF", border: "#93C5FD",
    badge: "Most Popular", months: 6,
  },
];

const YEARLY_PLANS = [
  {
    id: "ym", name: "Monthly", price: "$2.99", per: "/mo",
    billed: "Billed $35.99 per year",
    color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", months: 12,
  },
  {
    id: "yy", name: "Yearly",  price: "$1.79", per: "/mo",
    billed: "Billed $21.49 per year",
    color: "#2563EB", bg: "#EFF6FF", border: "#93C5FD",
    badge: "Most Popular", months: 12,
  },
];

// ─── Firebase helpers ─────────────────────────────────────────────────────────

/**
 * Call this on SIGN UP only (not on login).
 * Creates the user doc with today as firstLoginDate.
 */
export const initUserDoc = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      firstLoginDate: new Date().toISOString(),
      isSubscribed: false,
      subscribedUntil: null,
    });
  }
};

/**
 * Returns true if the 30-day trial has expired AND there is no active subscription.
 */
export const checkTrialExpired = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) return false;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return false;
    const data = snap.data();

    // Has active subscription → never expired
    if (data.isSubscribed && data.subscribedUntil) {
      if (Date.now() < new Date(data.subscribedUntil).getTime()) return false;
    }

    if (!data.firstLoginDate) return false;
    const days = (Date.now() - new Date(data.firstLoginDate).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 30;
  } catch {
    return false;
  }
};

/**
 * Returns how many trial days are left (0–30).
 */
const getTrialDaysLeft = async (): Promise<number> => {
  try {
    const user = auth.currentUser;
    if (!user) return 30;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) return 30;
    const data = snap.data();
    if (!data.firstLoginDate) return 30;
    const days = (Date.now() - new Date(data.firstLoginDate).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.floor(30 - days));
  } catch {
    return 30;
  }
};

// ─── Card formatters ──────────────────────────────────────────────────────────
const formatCardNumber = (val: string) =>
  val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

const formatExpiry = (val: string) => {
  const d = val.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

const getCardBrand = (num: string): string => {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n))           return "Visa";
  if (/^5[1-5]/.test(n))     return "Mastercard";
  if (/^3[47]/.test(n))      return "Amex";
  if (/^6(?:011|5)/.test(n)) return "Discover";
  return "";
};

type Plan = {
  id: string; name: string; price: string; per: string;
  billed: string; color: string; bg: string; border: string;
  badge?: string; months: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO USE THIS SCREEN:
//
//  SIGN UP flow  → navigate here directly. initUserDoc() is called inside.
//                  User sees the screen and can start free trial OR subscribe.
//
//  LOGIN flow    → DO NOT navigate here. Instead, in your login handler do:
//
//    await initUserDoc(); // safe to call, won't overwrite existing doc
//    const expired = await checkTrialExpired();
//    if (expired) {
//      router.replace("/subscribe");   // trial over → show paywall
//    } else {
//      router.replace("/hiveDashboard"); // still in trial → go to app
//    }
// ─────────────────────────────────────────────────────────────────────────────
export default function SubscribeScreen() {
  const router = useRouter();

  const [trialDays,    setTrialDays]    = useState(30);
  const [expiredModal, setExpiredModal] = useState(false);
  const [isNewUser,    setIsNewUser]    = useState(false); // true = came from sign-up

  const [subModal,     setSubModal]     = useState(false);
  const [billing,      setBilling]      = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const [payModal,   setPayModal]   = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName,   setCardName]   = useState("");
  const [expiry,     setExpiry]     = useState("");
  const [cvv,        setCvv]        = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const slideAnim    = useRef(new Animated.Value(50)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const subSlide     = useRef(new Animated.Value(height)).current;
  const paySlide     = useRef(new Animated.Value(height)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const beeScale     = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const init = async () => {
      // initUserDoc only creates the doc if it doesn't exist yet (new user)
      await initUserDoc();

      const expired = await checkTrialExpired();
      const days    = await getTrialDaysLeft();

      setTrialDays(days);

      if (expired) {
        // Trial over → show expired modal (came from login redirect)
        setExpiredModal(true);
        setIsNewUser(false);
      } else {
        // Trial still active → this is a new sign-up, show free trial option
        setIsNewUser(true);
      }
    };
    init();

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(beeScale,  { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
    ]).start();

    featureAnims.forEach((a, i) =>
      Animated.timing(a, {
        toValue: 1, duration: 400, delay: 500 + i * 70,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }).start()
    );

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const activePlans = (billing === "monthly" ? MONTHLY_PLANS : YEARLY_PLANS) as Plan[];
  const chosenPlan  = activePlans.find((p) => p.id === selectedPlan) ?? null;
  const cardBrand   = getCardBrand(cardNumber);

  const openSubModal = () => {
    setSubModal(true);
    setSelectedPlan(null);
    subSlide.setValue(height);
    Animated.spring(subSlide, { toValue: 0, tension: 55, friction: 11, useNativeDriver: true }).start();
  };

  const closeSubModal = () => {
    Animated.timing(subSlide, { toValue: height, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true })
      .start(() => setSubModal(false));
  };

  const openPayModal = () => {
    setPayModal(true);
    setCardNumber(""); setCardName(""); setExpiry(""); setCvv("");
    setCardErrors({}); setPaySuccess(false);
    paySlide.setValue(height);
    Animated.spring(paySlide, { toValue: 0, tension: 55, friction: 11, useNativeDriver: true }).start();
  };

  const closePayModal = () => {
    Animated.timing(paySlide, { toValue: height, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true })
      .start(() => setPayModal(false));
  };

  const validateCard = (): boolean => {
    const e: Record<string, string> = {};
    if (cardName.trim().length < 2)                e.name   = "Enter the cardholder name";
    if (cardNumber.replace(/\s/g, "").length < 16) e.number = "Enter a valid 16-digit card number";
    if (expiry.length < 5)                         e.expiry = "Enter a valid expiry (MM/YY)";
    if (cvv.length < 3)                            e.cvv    = "Enter a valid CVV";
    setCardErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePay = async () => {
    if (!validateCard()) return;
    const user = auth.currentUser;
    if (!user) return;

    setPayLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setPayLoading(false);
    setPaySuccess(true);

    successScale.setValue(0);
    Animated.spring(successScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }).start();

    const months = chosenPlan?.months ?? 1;
    const until  = new Date();
    until.setMonth(until.getMonth() + months);

    await setDoc(doc(db, "users", user.uid), {
      isSubscribed:    true,
      subscribedUntil: until.toISOString(),
      plan:            chosenPlan?.id ?? null,
    }, { merge: true });

    setTimeout(() => {
      closePayModal();
      closeSubModal();
      router.replace("/hiveDashboard");
    }, 2200);
  };

  // ── Start free trial: just go to dashboard, firstLoginDate already saved ──
  const handleStartTrial = () => {
    router.replace("/hiveDashboard");
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFBEB" />
      <View style={s.blob1} />
      <View style={s.blob2} />
      <View style={s.blob3} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        <Animated.View style={[s.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* ── Hero ── */}
          <View style={s.heroWrap}>
            <Animated.View style={[s.beeBadge, { transform: [{ scale: beeScale }] }]}>
              <Text style={s.beeEmoji}>🐝</Text>
            </Animated.View>
            <Text style={s.headline}>Smart Bee Pro</Text>
            <Text style={s.tagline}>
              {isNewUser
                ? "Everything you need to keep\nyour hives healthy & thriving"
                : "Your free trial has ended.\nSubscribe to keep your hives monitored."}
            </Text>
            <View style={s.trialPill}>
              <Ionicons name={isNewUser ? "gift-outline" : "time-outline"} size={13} color="#92400E" />
              <Text style={s.trialPillText}>
                {isNewUser ? "30 days free — no card needed" : "30-day free trial ended"}
              </Text>
            </View>
          </View>

          {/* ── Features ── */}
          <View style={s.featureCard}>
            {FEATURES.map((f, i) => (
              <Animated.View
                key={i}
                style={[
                  s.featureRow,
                  i === FEATURES.length - 1 && { borderBottomWidth: 0 },
                  {
                    opacity: featureAnims[i],
                    transform: [{ translateX: featureAnims[i].interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }],
                  },
                ]}
              >
                <View style={s.featureIconWrap}>
                  <Ionicons name={f.icon as any} size={17} color="#D97706" />
                </View>
                <Text style={s.featureText}>{f.text}</Text>
                <Ionicons name="checkmark-circle" size={17} color="#F59E0B" />
              </Animated.View>
            ))}
          </View>

          {/* ── CTAs ── */}
          {isNewUser ? (
            <>
              {/* New user: Start Free Trial + Subscribe option */}
              <Animated.View style={[s.ctaWrap, { transform: [{ scale: pulseAnim }] }]}>
                <TouchableOpacity style={s.trialBtn} onPress={handleStartTrial} activeOpacity={0.87}>
                  <Ionicons name="rocket-outline" size={18} color="#fff" />
                  <Text style={s.trialBtnText}>Start Free Trial</Text>
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity style={s.subscribeBtn} onPress={openSubModal} activeOpacity={0.85}>
                <Ionicons name="star-outline" size={17} color="#F59E0B" />
                <Text style={s.subscribeBtnText}>Subscribe now</Text>
              </TouchableOpacity>

              <Text style={s.finePrint}>
                {trialDays} days free · No payment required · Cancel anytime
              </Text>
            </>
          ) : (
            <>
              {/* Expired user: only Subscribe */}
              <Animated.View style={[s.ctaWrap, { transform: [{ scale: pulseAnim }] }]}>
                <TouchableOpacity style={s.trialBtn} onPress={openSubModal} activeOpacity={0.87}>
                  <Ionicons name="star-outline" size={18} color="#fff" />
                  <Text style={s.trialBtnText}>View Plans</Text>
                </TouchableOpacity>
              </Animated.View>

              <Text style={s.finePrint}>Subscribe to continue using Smart Bee Pro</Text>
            </>
          )}

        </Animated.View>
      </ScrollView>

      {/* ═══ SUBSCRIBE BOTTOM SHEET ═══ */}
      <Modal visible={subModal} transparent animationType="none" onRequestClose={closeSubModal}>
        <View style={s.overlay}>
          <TouchableOpacity style={s.overlayTap} activeOpacity={1} onPress={closeSubModal} />
          <Animated.View style={[s.sheet, { transform: [{ translateY: subSlide }] }]}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <View style={s.sheetTitleWrap}>
                <Text style={s.sheetTitle}>Smart Bee Pro</Text>
                <Text style={s.sheetSub}>Full access · Cancel anytime</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={closeSubModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={17} color="#78716C" />
              </TouchableOpacity>
            </View>

            <View style={s.toggle}>
              <TouchableOpacity style={[s.toggleOption, billing === "monthly" && s.toggleSelected]} onPress={() => { setBilling("monthly"); setSelectedPlan(null); }} activeOpacity={0.8}>
                <Text style={[s.toggleOptionText, billing === "monthly" && s.toggleSelectedText]}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.toggleOption, billing === "yearly" && s.toggleSelected]} onPress={() => { setBilling("yearly"); setSelectedPlan(null); }} activeOpacity={0.8}>
                <Text style={[s.toggleOptionText, billing === "yearly" && s.toggleSelectedText]}>Yearly</Text>
                <View style={s.savePill}><Text style={s.savePillText}>−40%</Text></View>
              </TouchableOpacity>
            </View>

            <View style={s.planList}>
              {activePlans.map((p) => {
                const sel = selectedPlan === p.id;
                return (
                  <TouchableOpacity key={p.id} style={[s.planCard, { backgroundColor: p.bg, borderColor: sel ? p.color : p.border, borderWidth: sel ? 2 : 1 }]} onPress={() => setSelectedPlan(p.id)} activeOpacity={0.82}>
                    {p.badge && <View style={[s.planBadge, { backgroundColor: p.color }]}><Text style={s.planBadgeText}>{p.badge}</Text></View>}
                    <View style={s.planRow}>
                      <View style={[s.radio, { borderColor: p.color }]}>
                        {sel && <View style={[s.radioDot, { backgroundColor: p.color }]} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.planName, { color: p.color }]}>{p.name}</Text>
                        <Text style={s.planBilledText}>{p.billed}</Text>
                      </View>
                      <View style={s.planPriceBlock}>
                        <Text style={[s.planPrice, { color: p.color }]}>{p.price}</Text>
                        <Text style={s.planPer}>{p.per}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={[s.sheetCta, { backgroundColor: chosenPlan?.color ?? "#F59E0B", opacity: chosenPlan ? 1 : 0.35 }]} onPress={() => chosenPlan && openPayModal()} disabled={!chosenPlan} activeOpacity={0.88}>
              <Ionicons name="card-outline" size={19} color="#fff" />
              <Text style={s.sheetCtaText}>{chosenPlan ? `Continue — ${chosenPlan.price} ${chosenPlan.per}` : "Select a plan"}</Text>
            </TouchableOpacity>
            <Text style={s.sheetFine}>Secure payment · No hidden fees · Cancel anytime</Text>
          </Animated.View>
        </View>
      </Modal>

      {/* ═══ PAYMENT BOTTOM SHEET ═══ */}
      <Modal visible={payModal} transparent animationType="none" onRequestClose={closePayModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.overlay}>
            <TouchableOpacity style={s.overlayTap} activeOpacity={1} onPress={!payLoading ? closePayModal : undefined} />
            <Animated.View style={[s.paySheet, { transform: [{ translateY: paySlide }] }]}>
              <View style={s.handle} />
              {paySuccess ? (
                <View style={s.successWrap}>
                  <Animated.View style={[s.successCircle, { transform: [{ scale: successScale }] }]}>
                    <Ionicons name="checkmark" size={50} color="#fff" />
                  </Animated.View>
                  <Text style={s.successTitle}>Payment Successful!</Text>
                  <Text style={s.successSub}>Welcome to Smart Bee Pro 🐝</Text>
                  <Text style={s.successNote}>Redirecting you to the dashboard…</Text>
                </View>
              ) : (
                <>
                  <View style={s.sheetHeader}>
                    <TouchableOpacity style={s.backBtn} onPress={closePayModal} disabled={payLoading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="arrow-back" size={17} color="#78716C" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={s.sheetTitle}>Payment Details</Text>
                      <Text style={s.sheetSub}>{chosenPlan?.name} · {chosenPlan?.price} {chosenPlan?.per}</Text>
                    </View>
                    <View style={s.secureTag}>
                      <Ionicons name="lock-closed" size={12} color="#16A34A" />
                      <Text style={s.secureTagText}>Secure</Text>
                    </View>
                  </View>

                  <View style={[s.cardVisual, { backgroundColor: chosenPlan?.color ?? "#F59E0B" }]}>
                    <View style={s.cardVisualTop}>
                      <Text style={s.cardVisualAppName}>Smart Bee Pro</Text>
                      {cardBrand ? <Text style={s.cardVisualBrand}>{cardBrand}</Text> : <View style={s.chipShape} />}
                    </View>
                    <Text style={s.cardVisualNumber}>
                      {cardNumber ? cardNumber.padEnd(19).replace(/ /g, "").replace(/(\d{4})/g, "$1 ").trim() : "•••• •••• •••• ••••"}
                    </Text>
                    <View style={s.cardVisualBottom}>
                      <View>
                        <Text style={s.cardVisualLabel}>CARD HOLDER</Text>
                        <Text style={s.cardVisualValue}>{cardName || "YOUR NAME"}</Text>
                      </View>
                      <View>
                        <Text style={s.cardVisualLabel}>EXPIRES</Text>
                        <Text style={s.cardVisualValue}>{expiry || "MM/YY"}</Text>
                      </View>
                    </View>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Text style={s.fieldLabel}>Cardholder Name</Text>
                    <View style={[s.inputRow, cardErrors.name ? s.inputRowErr : null]}>
                      <Ionicons name="person-outline" size={16} color="#B5A898" style={{ marginRight: 8 }} />
                      <TextInput style={s.input} placeholder="Full name on card" placeholderTextColor="#C9BAA8" value={cardName} onChangeText={(t) => { setCardName(t); setCardErrors((e) => ({ ...e, name: "" })); }} autoCapitalize="words" returnKeyType="next" />
                    </View>
                    {cardErrors.name ? <Text style={s.errText}>{cardErrors.name}</Text> : null}

                    <Text style={s.fieldLabel}>Card Number</Text>
                    <View style={[s.inputRow, cardErrors.number ? s.inputRowErr : null]}>
                      <Ionicons name="card-outline" size={16} color="#B5A898" style={{ marginRight: 8 }} />
                      <TextInput style={s.input} placeholder="0000  0000  0000  0000" placeholderTextColor="#C9BAA8" value={cardNumber} onChangeText={(t) => { setCardNumber(formatCardNumber(t)); setCardErrors((e) => ({ ...e, number: "" })); }} keyboardType="number-pad" maxLength={19} returnKeyType="next" />
                      {cardBrand ? <View style={s.brandTag}><Text style={s.brandTagText}>{cardBrand}</Text></View> : null}
                    </View>
                    {cardErrors.number ? <Text style={s.errText}>{cardErrors.number}</Text> : null}

                    <View style={s.twoCol}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.fieldLabel}>Expiry Date</Text>
                        <View style={[s.inputRow, cardErrors.expiry ? s.inputRowErr : null]}>
                          <Ionicons name="calendar-outline" size={16} color="#B5A898" style={{ marginRight: 8 }} />
                          <TextInput style={s.input} placeholder="MM/YY" placeholderTextColor="#C9BAA8" value={expiry} onChangeText={(t) => { setExpiry(formatExpiry(t)); setCardErrors((e) => ({ ...e, expiry: "" })); }} keyboardType="number-pad" maxLength={5} returnKeyType="next" />
                        </View>
                        {cardErrors.expiry ? <Text style={s.errText}>{cardErrors.expiry}</Text> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.fieldLabel}>CVV</Text>
                        <View style={[s.inputRow, cardErrors.cvv ? s.inputRowErr : null]}>
                          <Ionicons name="lock-closed-outline" size={16} color="#B5A898" style={{ marginRight: 8 }} />
                          <TextInput style={s.input} placeholder="•••" placeholderTextColor="#C9BAA8" value={cvv} onChangeText={(t) => { setCvv(t.replace(/\D/g, "").slice(0, 4)); setCardErrors((e) => ({ ...e, cvv: "" })); }} keyboardType="number-pad" maxLength={4} secureTextEntry returnKeyType="done" />
                        </View>
                        {cardErrors.cvv ? <Text style={s.errText}>{cardErrors.cvv}</Text> : null}
                      </View>
                    </View>

                    <TouchableOpacity style={[s.payBtn, { backgroundColor: chosenPlan?.color ?? "#F59E0B" }, payLoading && { opacity: 0.65 }]} onPress={handlePay} disabled={payLoading} activeOpacity={0.87}>
                      {payLoading
                        ? <Text style={s.payBtnText}>Processing…</Text>
                        : <><Ionicons name="lock-closed" size={16} color="#fff" /><Text style={s.payBtnText}>Pay {chosenPlan?.price}</Text></>}
                    </TouchableOpacity>
                    <Text style={s.payFine}>🔒  Your payment is encrypted and secure.{"\n"}We never store your card details.</Text>
                  </ScrollView>
                </>
              )}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Trial expired modal ── */}
      <Modal visible={expiredModal} transparent animationType="fade">
        <View style={s.centeredOverlay}>
          <View style={s.expiredBox}>
            <View style={s.expiredIcon}>
              <Ionicons name="time-outline" size={30} color="#EF4444" />
            </View>
            <Text style={s.expiredTitle}>Free Trial Ended</Text>
            <Text style={s.expiredBody}>
              Your 30-day free trial has expired.{"\n"}Subscribe to continue monitoring your hives.
            </Text>
            <TouchableOpacity style={s.expiredCta} onPress={() => { setExpiredModal(false); openSubModal(); }} activeOpacity={0.87}>
              <Text style={s.expiredCtaText}>See Plans</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#FFFBEB" },
  scroll: { alignItems: "center", paddingTop: 60, paddingBottom: 50 },
  inner:  { width: width - 36, alignItems: "center" },

  blob1: { position: "absolute", top: -100, right: -90,  width: 280, height: 280, borderRadius: 140, backgroundColor: "#FDE68A", opacity: 0.4 },
  blob2: { position: "absolute", bottom: -80, left: -70, width: 220, height: 220, borderRadius: 110, backgroundColor: "#FCD34D", opacity: 0.28 },
  blob3: { position: "absolute", top: "38%", left: -50,  width: 130, height: 130, borderRadius: 65,  backgroundColor: "#F59E0B", opacity: 0.1 },

  heroWrap:      { alignItems: "center", marginBottom: 28 },
  beeBadge:      { width: 96, height: 96, borderRadius: 48, backgroundColor: "#FEF3C7", borderWidth: 3, borderColor: "#FDE68A", justifyContent: "center", alignItems: "center", marginBottom: 18, elevation: 4 },
  beeEmoji:      { fontSize: 46 },
  headline:      { fontSize: 32, fontWeight: "800", color: "#1C1917", letterSpacing: -0.6, marginBottom: 8, textAlign: "center" },
  tagline:       { fontSize: 14, color: "#78716C", textAlign: "center", lineHeight: 22, marginBottom: 16 },
  trialPill:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  trialPillText: { fontSize: 12, fontWeight: "600", color: "#92400E" },

  featureCard:     { width: "100%", backgroundColor: "#fff", borderRadius: 22, paddingHorizontal: 18, paddingVertical: 4, borderWidth: 1, borderColor: "#FDE68A", marginBottom: 28, elevation: 2 },
  featureRow:      { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: "#FEF3C7" },
  featureIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#FFFBEB", justifyContent: "center", alignItems: "center" },
  featureText:     { flex: 1, fontSize: 14, fontWeight: "500", color: "#292524" },

  ctaWrap:          { width: "100%", marginBottom: 12 },
  trialBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "#F59E0B", paddingVertical: 16, borderRadius: 18, width: "100%", elevation: 5 },
  trialBtnText:     { fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: 0.2 },
  subscribeBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderColor: "#F59E0B", paddingVertical: 14, borderRadius: 18, width: "100%", marginBottom: 14 },
  subscribeBtnText: { fontSize: 15, fontWeight: "700", color: "#F59E0B" },
  finePrint:        { fontSize: 11.5, color: "#A8A29E", textAlign: "center", lineHeight: 17 },

  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" },
  overlayTap: { flex: 1 },
  handle:     { width: 38, height: 4, backgroundColor: "#E0D9CF", borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 18 },

  sheet:    { backgroundColor: "#FFFBEB", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingBottom: 40 },
  paySheet: { backgroundColor: "#FFFBEB", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingBottom: 36, maxHeight: height * 0.94 },

  sheetHeader:    { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  sheetTitleWrap: { flex: 1 },
  sheetTitle:     { fontSize: 19, fontWeight: "800", color: "#1C1917" },
  sheetSub:       { fontSize: 12, color: "#78716C", marginTop: 3 },
  sheetFine:      { fontSize: 11, color: "#B5A898", textAlign: "center", marginTop: 14 },
  closeBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3ECD8", justifyContent: "center", alignItems: "center" },
  backBtn:        { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3ECD8", justifyContent: "center", alignItems: "center" },

  toggle:             { flexDirection: "row", backgroundColor: "#F3ECD8", borderRadius: 14, padding: 3, marginBottom: 18 },
  toggleOption:       { flex: 1, paddingVertical: 10, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  toggleSelected:     { backgroundColor: "#fff", elevation: 2 },
  toggleOptionText:   { fontSize: 13, fontWeight: "600", color: "#A09080" },
  toggleSelectedText: { color: "#1C1917" },
  savePill:           { backgroundColor: "#16A34A", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  savePillText:       { fontSize: 9, fontWeight: "800", color: "#fff" },

  planList:       { gap: 10, marginBottom: 18 },
  planCard:       { borderRadius: 16, padding: 14, position: "relative" },
  planBadge:      { position: "absolute", top: -1, right: 14, paddingHorizontal: 10, paddingVertical: 3, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  planBadgeText:  { fontSize: 10, fontWeight: "700", color: "#fff" },
  planRow:        { flexDirection: "row", alignItems: "center", gap: 12 },
  radio:          { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  radioDot:       { width: 10, height: 10, borderRadius: 5 },
  planName:       { fontSize: 15, fontWeight: "700" },
  planBilledText: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  planPriceBlock: { alignItems: "flex-end" },
  planPrice:      { fontSize: 20, fontWeight: "800" },
  planPer:        { fontSize: 10, color: "#9CA3AF", marginTop: 1 },

  sheetCta:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 17, elevation: 4 },
  sheetCtaText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  secureTag:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#DCFCE7", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  secureTagText: { fontSize: 11, fontWeight: "700", color: "#16A34A" },

  cardVisual:        { borderRadius: 20, padding: 22, marginBottom: 22, elevation: 3 },
  cardVisualTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardVisualAppName: { fontSize: 13, fontWeight: "800", color: "rgba(255,255,255,0.92)", letterSpacing: 0.5 },
  cardVisualBrand:   { fontSize: 14, fontWeight: "800", color: "rgba(255,255,255,0.85)" },
  chipShape:         { width: 32, height: 24, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.3)" },
  cardVisualNumber:  { fontSize: 17, fontWeight: "700", color: "#fff", letterSpacing: 3, marginVertical: 12 },
  cardVisualBottom:  { flexDirection: "row", gap: 36 },
  cardVisualLabel:   { fontSize: 8, color: "rgba(255,255,255,0.6)", letterSpacing: 1 },
  cardVisualValue:   { fontSize: 13, fontWeight: "700", color: "#fff", marginTop: 3, letterSpacing: 0.5 },

  fieldLabel:  { fontSize: 12, fontWeight: "600", color: "#78716C", marginBottom: 6, marginTop: 12 },
  inputRow:    { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 13, borderWidth: 1, borderColor: "#E5DDD0", paddingHorizontal: 12, height: 50 },
  inputRowErr: { borderColor: "#EF4444" },
  input:       { flex: 1, fontSize: 15, color: "#1C1917" },
  twoCol:      { flexDirection: "row", gap: 12 },
  errText:     { fontSize: 11, color: "#EF4444", marginTop: 4 },
  brandTag:    { backgroundColor: "#FEF3C7", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  brandTagText:{ fontSize: 11, fontWeight: "700", color: "#92400E" },

  payBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 17, borderRadius: 17, marginTop: 22, elevation: 4 },
  payBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  payFine:    { fontSize: 11, color: "#B5A898", textAlign: "center", marginTop: 14, lineHeight: 18, marginBottom: 8 },

  successWrap:   { alignItems: "center", paddingVertical: 48 },
  successCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#16A34A", justifyContent: "center", alignItems: "center", marginBottom: 22, elevation: 6 },
  successTitle:  { fontSize: 24, fontWeight: "800", color: "#1C1917", marginBottom: 8 },
  successSub:    { fontSize: 16, color: "#78716C", marginBottom: 6 },
  successNote:   { fontSize: 12, color: "#B5A898", marginTop: 4 },

  centeredOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  expiredBox:      { width: width - 56, backgroundColor: "#fff", borderRadius: 26, padding: 28, alignItems: "center", elevation: 16 },
  expiredIcon:     { width: 62, height: 62, borderRadius: 20, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  expiredTitle:    { fontSize: 20, fontWeight: "800", color: "#1C1917", marginBottom: 10 },
  expiredBody:     { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  expiredCta:      { backgroundColor: "#F59E0B", paddingVertical: 14, paddingHorizontal: 40, borderRadius: 15, elevation: 3 },
  expiredCtaText:  { fontSize: 15, fontWeight: "800", color: "#fff" },
});
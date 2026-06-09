import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppContext } from "./AppContext";
import BackHeader from "./BackHeader";

type Lang = "English" | "French" | "Arabic";

// ─── Language options ──────────────────────────────────────────────────────────
const LANGUAGES: { code: Lang; label: string; native: string; flag: string }[] = [
  { code: "English", label: "English", native: "English",  flag: "🇬🇧" },
  { code: "French",  label: "French",  native: "Français", flag: "🇫🇷" },
  { code: "Arabic",  label: "Arabic",  native: "العربية",  flag: "🇸🇦" },
];

// ─── UI strings per language ───────────────────────────────────────────────────
const UI: Record<Lang, { title: string; subtitle: string }> = {
  English: { title: "Language", subtitle: "Choose the language for the entire app" },
  French:  { title: "Langue",   subtitle: "Choisissez la langue de toute l'application" },
  Arabic:  { title: "اللغة",    subtitle: "اختر لغة التطبيق بالكامل" },
};

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function LanguageScreen() {
  const router  = useRouter();
  const context = useAppContext();
  const currentLang = (context?.language as Lang) || "English";
  const ui = UI[currentLang];

  const [picked, setPicked] = useState<Lang>(currentLang);

  const handlePick = (lang: Lang) => {
    setPicked(lang);
    context?.setLanguage(lang);
    setTimeout(() => router.back(), 300);
  };

  return (
    <View style={styles.container}>

      {/* ← Back header */}
      <BackHeader title={ui.title} />

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{ui.subtitle}</Text>

        {/* Language cards */}
        <View style={styles.cardList}>
          {LANGUAGES.map((lang) => {
            const isSelected = picked === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => handlePick(lang.code)}
                activeOpacity={0.75}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <View style={styles.cardText}>
                  <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                    {lang.native}
                  </Text>
                  <Text style={styles.cardSub}>{lang.label}</Text>
                </View>
                <View style={[styles.check, isSelected && styles.checkSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#fff" },
  scroll:           { padding: 20, paddingBottom: 40 },

  subtitle:         { fontSize: 14, color: "#666", marginBottom: 22, lineHeight: 20 },

  cardList:         { gap: 12, marginBottom: 28 },

  card:             {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#EEEEEE",
    backgroundColor: "#FAFAFA",
    gap: 14,
    elevation: 1,
  },
  cardSelected:     {
    borderColor: "#FFC107",
    backgroundColor: "#FFFBEA",
    elevation: 3,
  },

  flag:             { fontSize: 34 },

  cardText:         { flex: 1 },
  cardLabel:        { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 2 },
  cardLabelSelected:{ color: "#7A5A00" },
  cardSub:          { fontSize: 12.5, color: "#888" },

  check:            {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#DDD",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkSelected:    {
    backgroundColor: "#FFC107",
    borderColor: "#FFC107",
  },
});
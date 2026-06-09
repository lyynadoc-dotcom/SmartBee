import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";



export default function BackHeader({
  title,
  color = "#FFC107",
}: {
  title?: string;
  color?: string;
}) {
  const router = useRouter();

  return (
    <View style={[styles.bar, { backgroundColor: color }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.btn} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={26} color="#1a1a1a" />
      </TouchableOpacity>
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar:   {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 52,          // clears the status bar on most devices
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  btn:   {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
});
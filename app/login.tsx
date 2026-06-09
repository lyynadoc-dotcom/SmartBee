import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "./firebase";

export default function Login() {
  const router = useRouter();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const setFirstLoginDate = async (uid: string) => {
    const ref  = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists() || !snap.data()?.firstLoginDate) {
      await setDoc(ref, { firstLoginDate: new Date().toISOString() }, { merge: true });
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      await setFirstLoginDate(credential.user.uid);
      router.replace("/SubscribeScreen");
    } catch (error: any) {
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        Alert.alert("Error", "Incorrect email or password");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Error", "Invalid email address");
      } else if (error.code === "auth/too-many-requests") {
        Alert.alert("Error", "Too many failed attempts. Try again later.");
      } else {
        Alert.alert("Error", "Login failed. Please try again.");
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email first");
      return;
    }
    setLoadingReset(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      Alert.alert("Success ✅", "Password reset email sent. Check your inbox.");
    } catch (error: any) {
      console.log("RESET PASSWORD ERROR:", error.code, error.message);
      if (error.code === "auth/user-not-found") {
        Alert.alert("Error", "No account found with this email.");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Error", "Invalid email address.");
      } else if (error.code === "auth/missing-email") {
        Alert.alert("Error", "Please enter your email.");
      } else {
        Alert.alert("Error", error.message);
      }
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>SmartBee 🐝</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <View style={styles.passwordWrapper}>
        <TextInput
          placeholder="Password"
          secureTextEntry={!showPassword}
          style={[styles.input, { paddingRight: 48 }]}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons name={showPassword ? "eye" : "eye-off"} size={22} color="#555" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleForgotPassword} disabled={loadingReset}>
        <Text style={styles.forgotText}>
          {loadingReset ? "Sending…" : "Forgot Password?"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginText}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/signup")}>
        <Text style={styles.signupText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#fff", justifyContent: "center", padding: 25 },
  logo:            { fontSize: 28, fontWeight: "bold", fontStyle: "italic", textAlign: "center", marginBottom: 30 },
  input:           { backgroundColor: "#f2f2f2", padding: 15, borderRadius: 10, marginBottom: 8 },
  passwordWrapper: { position: "relative", marginBottom: 1 },
  eyeIcon:         { position: "absolute", right: 12, top: "50%", transform: [{ translateY: -22 }] },
  forgotText:      { textAlign: "right", color: "#555", fontWeight: "400", marginBottom: 5, fontSize: 13 },
  loginButton:     { backgroundColor: "#FFC107", padding: 11, borderRadius: 10, alignItems: "center", marginBottom: 13 },
  loginText:       { fontWeight: "bold" },
  signupText:      { textAlign: "center", color: "#555" },
});
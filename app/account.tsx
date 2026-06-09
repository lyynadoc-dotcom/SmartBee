import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BackHeader from "./BackHeader";
import { auth, db } from "./firebase";

export default function Account() {
  const router = useRouter();

  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);

 
  const [name,    setName]    = useState("");
  const [surname, setSurname] = useState("");
  const [email,   setEmail]   = useState("");
  const [photo,   setPhoto]   = useState<string | null>(null);

 
  const [newName,           setNewName]           = useState("");
  const [newSurname,        setNewSurname]        = useState("");
  const [newEmail,          setNewEmail]          = useState("");
  const [currentPassword,   setCurrentPassword]   = useState("");
  const [newPassword,       setNewPassword]       = useState("");
  const [confirmPassword,   setConfirmPassword]   = useState("");

  
  const [showNameFields,    setShowNameFields]    = useState(false);
  const [showEmailField,    setShowEmailField]    = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showCurrentPw,     setShowCurrentPw]     = useState(false);
  const [showPw,            setShowPw]            = useState(false);
  const [showConfirmPw,     setShowConfirmPw]     = useState(false);


  const [nameError,     setNameError]     = useState("");
  const [emailError,    setEmailError]    = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.replace("/");
          return;
        }

       
        setEmail(user.email ?? "");

      
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name ?? "");
          setSurname(data.surname ?? "");
          setNewName(data.name ?? "");
          setNewSurname(data.surname ?? "");
          if (data.photo) setPhoto(data.photo);
        }
      } catch (e) {
        Alert.alert("Error", "Could not load account data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);


  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert("Permission required"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

 
  const validateName = () => {
    if (newName.trim().length < 2)    { setNameError("First name must be at least 2 characters."); return false; }
    if (newSurname.trim().length < 2) { setNameError("Surname must be at least 2 characters.");    return false; }
    setNameError(""); return true;
  };

  const validateEmail = () => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(newEmail)) { setEmailError("Please enter a valid email address."); return false; }
    if (!currentPassword)   { setEmailError("Enter your current password to change email."); return false; }
    setEmailError(""); return true;
  };

  const validatePassword = () => {
    if (!currentPassword)          { setPasswordError("Enter your current password first.");                   return false; }
    if (newPassword.length < 8)    { setPasswordError("Password must be at least 8 characters.");              return false; }
    if (!/[A-Z]/.test(newPassword)){ setPasswordError("Password must contain at least one uppercase letter."); return false; }
    if (!/[a-z]/.test(newPassword)){ setPasswordError("Password must contain at least one lowercase letter."); return false; }
    if (!/[0-9]/.test(newPassword)){ setPasswordError("Password must contain at least one number.");           return false; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return false; }
    setPasswordError(""); return true;
  };


  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    let hasError = false;
    if (showNameFields    && !validateName())     hasError = true;
    if (showEmailField    && newEmail && !validateEmail())   hasError = true;
    if (showPasswordField && newPassword && !validatePassword()) hasError = true;
    if (hasError) return;

    setSaving(true);
    try {
      
      if ((showEmailField && newEmail) || (showPasswordField && newPassword)) {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

     
      if (showEmailField && newEmail && newEmail !== user.email) {
        await updateEmail(user, newEmail.trim());
        setEmail(newEmail.trim());
      }

     
      if (showPasswordField && newPassword) {
        await updatePassword(user, newPassword);
      }

    
      const updatedName    = showNameFields ? newName.trim()    : name;
      const updatedSurname = showNameFields ? newSurname.trim() : surname;

      await setDoc(
        doc(db, "users", user.uid),
        { name: updatedName, surname: updatedSurname, photo: photo ?? null },
        { merge: true }
      );

      setName(updatedName);
      setSurname(updatedSurname);

     
      setNewEmail(""); setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setShowNameFields(false); setShowEmailField(false); setShowPasswordField(false);

      Alert.alert("✅ Saved", "Your account has been updated.");
    } catch (err: any) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        Alert.alert("Error", "Current password is incorrect.");
      } else if (err.code === "auth/email-already-in-use") {
        Alert.alert("Error", "This email is already in use.");
      } else if (err.code === "auth/requires-recent-login") {
        Alert.alert("Error", "Please log out and log back in before changing credentials.");
      } else {
        Alert.alert("Error", "Failed to save changes. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

 
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#FFC107" />
      </View>
    );
  }

  const fullName = `${name} ${surname}`.trim();

 
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <BackHeader title="Account" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >

        
        <View style={styles.profileContainer}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
                style={styles.avatar}
              />
              <View style={styles.cameraBtn}>
                <Ionicons name="camera" size={15} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.displayName}>{fullName || "User"}</Text>
          <Text style={styles.displayEmail}>{email}</Text>
        </View>

       
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color="#FFC107" />
            <Text style={styles.sectionTitle}>Full Name</Text>
          </View>

          <View style={styles.readBox}>
            <Text style={styles.readBoxText}>{fullName || "—"}</Text>
          </View>

          <TouchableOpacity onPress={() => { setShowNameFields(!showNameFields); setNameError(""); }}>
            <Text style={styles.link}>{showNameFields ? "Cancel" : "Change name"}</Text>
          </TouchableOpacity>

          {showNameFields && (
            <>
              <TextInput
                style={[styles.input, nameError ? styles.inputError : null]}
                placeholder="First name"
                value={newName}
                onChangeText={(v) => { setNewName(v); setNameError(""); }}
              />
              <TextInput
                style={[styles.input, nameError ? styles.inputError : null]}
                placeholder="Surname"
                value={newSurname}
                onChangeText={(v) => { setNewSurname(v); setNameError(""); }}
              />
              {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
            </>
          )}
        </View>

      
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail-outline" size={18} color="#FFC107" />
            <Text style={styles.sectionTitle}>Email Address</Text>
          </View>

          <View style={styles.readBox}>
            <Text style={styles.readBoxText}>{email}</Text>
          </View>

          <TouchableOpacity onPress={() => { setShowEmailField(!showEmailField); setEmailError(""); setNewEmail(""); }}>
            <Text style={styles.link}>{showEmailField ? "Cancel" : "Change email"}</Text>
          </TouchableOpacity>

          {showEmailField && (
            <>
              <TextInput
                style={[styles.input, emailError ? styles.inputError : null]}
                placeholder="New email address"
                value={newEmail}
                onChangeText={(v) => { setNewEmail(v); setEmailError(""); }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={[styles.pwRow, emailError ? styles.inputError : null]}>
                <TextInput
                  style={styles.pwInput}
                  placeholder="Current password (required)"
                  secureTextEntry={!showCurrentPw}
                  value={currentPassword}
                  onChangeText={(v) => { setCurrentPassword(v); setEmailError(""); }}
                />
                <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)}>
                  <Ionicons name={showCurrentPw ? "eye-off" : "eye"} size={20} color="#aaa" />
                </TouchableOpacity>
              </View>
              {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
            </>
          )}
        </View>

        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed-outline" size={18} color="#FFC107" />
            <Text style={styles.sectionTitle}>Password</Text>
          </View>

          <View style={styles.readBox}>
            <Text style={styles.readBoxText}>••••••••</Text>
          </View>

          <TouchableOpacity onPress={() => { setShowPasswordField(!showPasswordField); setPasswordError(""); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>
            <Text style={styles.link}>{showPasswordField ? "Cancel" : "Change password"}</Text>
          </TouchableOpacity>

          {showPasswordField && (
            <>
        
              <View style={[styles.pwRow, passwordError ? styles.inputError : null]}>
                <TextInput
                  style={styles.pwInput}
                  placeholder="Current password"
                  secureTextEntry={!showCurrentPw}
                  value={currentPassword}
                  onChangeText={(v) => { setCurrentPassword(v); setPasswordError(""); }}
                />
                <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)}>
                  <Ionicons name={showCurrentPw ? "eye-off" : "eye"} size={20} color="#aaa" />
                </TouchableOpacity>
              </View>

            
              <View style={[styles.pwRow, passwordError ? styles.inputError : null]}>
                <TextInput
                  style={styles.pwInput}
                  placeholder="New password"
                  secureTextEntry={!showPw}
                  value={newPassword}
                  onChangeText={(v) => { setNewPassword(v); setPasswordError(""); }}
                />
                <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? "eye-off" : "eye"} size={20} color="#aaa" />
                </TouchableOpacity>
              </View>

             
              <View style={[styles.pwRow, passwordError ? styles.inputError : null]}>
                <TextInput
                  style={styles.pwInput}
                  placeholder="Confirm new password"
                  secureTextEntry={!showConfirmPw}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPw(!showConfirmPw)}>
                  <Ionicons name={showConfirmPw ? "eye-off" : "eye"} size={20} color="#aaa" />
                </TouchableOpacity>
              </View>

              <View style={styles.hintBox}>
                <Hint ok={newPassword.length >= 8}                                   text="At least 8 characters" />
                <Hint ok={/[A-Z]/.test(newPassword)}                                 text="One uppercase letter" />
                <Hint ok={/[a-z]/.test(newPassword)}                                 text="One lowercase letter" />
                <Hint ok={/[0-9]/.test(newPassword)}                                 text="One number" />
                <Hint ok={newPassword === confirmPassword && newPassword.length > 0} text="Passwords match" />
              </View>

              {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Changes</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}


function Hint({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
      <Ionicons name={ok ? "checkmark-circle" : "ellipse-outline"} size={14} color={ok ? "#2ECC71" : "#ccc"} />
      <Text style={{ fontSize: 12, color: ok ? "#2ECC71" : "#aaa" }}>{text}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#fff", padding: 20 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },

  profileContainer: { alignItems: "center", marginBottom: 24, paddingTop: 10 },
  avatarWrapper:    { position: "relative", marginBottom: 12 },
  avatar:           { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: "#FFC107" },
  cameraBtn:        { position: "absolute", bottom: 0, right: 0, backgroundColor: "#FFC107", width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", elevation: 3 },
  displayName:      { fontSize: 20, fontWeight: "bold", color: "#1a1a1a" },
  displayEmail:     { fontSize: 13, color: "#999", marginTop: 3 },

  section:       { marginBottom: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  sectionTitle:  { fontSize: 14, fontWeight: "bold", color: "#1a1a1a" },

  readBox:     { backgroundColor: "#f5f5f5", padding: 13, borderRadius: 10 },
  readBoxText: { fontWeight: "bold", color: "#333" },

  link: { color: "#FFC107", fontWeight: "bold", marginTop: 6, fontSize: 13 },

  input:      { borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 10, marginTop: 8, fontSize: 14, backgroundColor: "#fff" },
  inputError: { borderColor: "#E74C3C" },

  pwRow:   { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, marginTop: 8, backgroundColor: "#fff" },
  pwInput: { flex: 1, paddingVertical: 12, fontSize: 14 },

  hintBox: { backgroundColor: "#f9f9f9", borderRadius: 10, padding: 12, marginTop: 8 },

  error: { color: "#E74C3C", fontSize: 12, marginTop: 5 },

  saveBtn:     { backgroundColor: "#FFC107", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 10 },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
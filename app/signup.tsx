import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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

export default function SignUp() {
  const router = useRouter();

  const [name,            setName]            = useState("");
  const [surname,         setSurname]         = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({
    name: "", surname: "", email: "", password: "", confirmPassword: "",
  });

 
  const validate = () => {
    let valid = true;
    const e = { name: "", surname: "", email: "", password: "", confirmPassword: "" };

    if (!/^[A-Za-z]{1,8}$/.test(name)) {
      e.name = "* Only letters, max 8 characters"; valid = false;
    }
    if (!/^[A-Za-z]{1,8}$/.test(surname)) {
      e.surname = "* Only letters, max 8 characters"; valid = false;
    }
    if (!/^[\w.-]+@gmail\.com$/.test(email)) {
      e.email = "* Must be a @gmail.com address"; valid = false;
    }
    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d]{1,8}$/.test(password)) {
      e.password = "* Max 8 chars, must include uppercase, lowercase & digit"; valid = false;
    }
    if (confirmPassword !== password) {
      e.confirmPassword = "* Passwords do not match"; valid = false;
    }

    setErrors(e);
    return valid;
  };


  const handleSignUp = async () => {
    if (!validate()) {
      Alert.alert("Error", "Please fix the errors in the form");
      return;
    }

    try {
      
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      const uid = credential.user.uid;

   
           await setDoc(doc(db, "users", uid), {
  name,
  surname,
  email: email.trim().toLowerCase(),
  createdAt: new Date().toISOString(),
  isSubscribed: false,
  subscribedUntil: null,
});
      Alert.alert("Success ✅", "Account created! Please log in.", [
        {
          text: "OK",
        
          onPress: () => router.replace("/login"),
        },
      ]);
    }  catch (error: any) {
  Alert.alert(
    "Firebase Error",
    error.code + "\n" + error.message
  );
}
  }
 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account 🐝</Text>

     
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Name"
          style={[styles.input, errors.name ? styles.inputError : null]}
          value={name}
          onChangeText={setName}
        />
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
      </View>

   
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Surname"
          style={[styles.input, errors.surname ? styles.inputError : null]}
          value={surname}
          onChangeText={setSurname}
        />
        {errors.surname ? <Text style={styles.errorText}>{errors.surname}</Text> : null}
      </View>

     
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Email"
          style={[styles.input, errors.email ? styles.inputError : null]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
      </View>

   
      <View style={styles.inputContainer}>
        <View style={styles.passwordWrapper}>
          <TextInput
            placeholder="Password"
            style={[styles.input, errors.password ? styles.inputError : null, { paddingRight: 48 }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye" : "eye-off"} size={22} color="#555" />
          </TouchableOpacity>
        </View>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.passwordWrapper}>
          <TextInput
            placeholder="Confirm Password"
            style={[styles.input, errors.confirmPassword ? styles.inputError : null, { paddingRight: 48 }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
            <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={22} color="#555" />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

     
      <TouchableOpacity onPress={() => router.push("/login")}>
        <Text style={styles.loginText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#fff", justifyContent: "center", padding: 25 },
  title:           { fontSize: 28, fontWeight: "bold", fontStyle: "italic", textAlign: "center", marginBottom: 30 },
  inputContainer:  { marginBottom: 15 },
  input:           { backgroundColor: "#f2f2f2", padding: 15, borderRadius: 10 },
  inputError:      { borderWidth: 1, borderColor: "red" },
  errorText:       { color: "red", marginTop: 5, fontSize: 12 },
  button:          { backgroundColor: "#FFC107", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 10 },
  buttonText:      { fontWeight: "bold" },
  loginText:       { textAlign: "center", marginTop: 12, color: "#555" },
  passwordWrapper: { position: "relative" },
  eyeIcon:         { position: "absolute", right: 10, top: "50%", transform: [{ translateY: -11 }], zIndex: 1 },
});
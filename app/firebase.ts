
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDduJmCTUvn1wsH6McySJZoxpNpkuwMdFk",
  authDomain: "smartbee-eb82d.firebaseapp.com",
  projectId: "smartbee-eb82d",
  storageBucket: "smartbee-eb82d.appspot.com",
  messagingSenderId: "720530721008",
  appId: "1:720530721008:web:a342c37ae514d2af5d9a35",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app; 
// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB4t3dwMjaA2j19DOoBC_kc_4bHCJQ-Hoc",
  authDomain: "solid-vtt.firebaseapp.com",
  projectId: "solid-vtt",
  storageBucket: "solid-vtt.firebasestorage.app",
  messagingSenderId: "604866740762",
  appId: "1:604866740762:web:89495c835d343b314487a3",
  measurementId: "G-SXD2LQ29BV"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

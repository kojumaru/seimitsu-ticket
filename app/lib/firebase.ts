import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// スクリーンショットから読み取ったあなたの専用設定
const firebaseConfig = {
  apiKey: "AIzaSyCt1t1B1jR_c3HVta-s4lkA0PTdOfTJvjc",
  authDomain: "seimitsu-ticket-5c4e1.firebaseapp.com",
  projectId: "seimitsu-ticket-5c4e1",
  storageBucket: "seimitsu-ticket-5c4e1.firebasestorage.app",
  messagingSenderId: "1006691636409",
  appId: "1:1006691636409:web:1e0569d8223802e8d1f768",
  measurementId: "G-1WLQPVKBWJ",
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };

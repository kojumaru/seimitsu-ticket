"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "./lib/firebase";
import {
  doc,
  updateDoc,
  increment,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

export default function Home() {
  const [userId, setUserId] = useState<string>("");
  const [profileName, setProfileName] = useState("");
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [nowServing, setNowServing] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    liff.init({ liffId: "2009242984-XYO590kr" }).then(async () => {
      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        setUserId(profile.userId);
        setProfileName(profile.displayName);

        // すでに整理券を持っているかチェック
        const userRef = doc(db, "users", profile.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setTicketNumber(userSnap.data().ticketNumber);
        }

        // 【リアルタイム監視】現在の呼び出し番号を常にチェック
        onSnapshot(doc(db, "tickets", "seimitsu-lab"), (doc) => {
          if (doc.exists()) {
            setNowServing(doc.data().nowServing || 0);
          }
        });
      } else {
        liff.login();
      }
      setLoading(false);
    });
  }, []);

  const issueTicket = async () => {
    if (!userId) return;
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      setTicketNumber(userSnap.data().ticketNumber);
      return;
    }

    const ticketRef = doc(db, "tickets", "seimitsu-lab");
    try {
      await updateDoc(ticketRef, { currentNumber: increment(1) });
    } catch {
      await setDoc(ticketRef, { currentNumber: 1, nowServing: 0 });
    }

    const snap = await getDoc(ticketRef);
    const newNumber = snap.data()?.currentNumber;

    await setDoc(userRef, {
      displayName: profileName,
      ticketNumber: newNumber,
      issuedAt: new Date(),
    });
    setTicketNumber(newNumber);
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        読み込み中...
      </div>
    );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-blue-50 text-black text-center">
      <h1 className="text-3xl font-bold text-blue-600 mb-8">精密Lab. 整理券</h1>

      {profileName && (
        <p className="mb-4 text-lg">
          こんにちは、<span className="font-bold">{profileName}</span>さん
        </p>
      )}

      {/* 自分の番が来た時の表示 */}
      {ticketNumber && ticketNumber <= nowServing ? (
        <div className="bg-red-500 text-white p-12 rounded-3xl shadow-2xl animate-bounce">
          <p className="text-2xl font-bold mb-2">お待たせしました！</p>
          <p className="text-6xl font-black mb-4">あなたの番です</p>
          <p className="text-sm">ブースの受付までお越しください</p>
        </div>
      ) : ticketNumber ? (
        /* 待機中の表示 */
        <div className="bg-white p-12 rounded-3xl shadow-2xl border-4 border-blue-200">
          <p className="text-gray-500 text-sm mb-2">あなたの整理番号</p>
          <p className="text-8xl font-black text-blue-600 mb-4">
            {ticketNumber}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            現在 {nowServing} 番までお呼びしています
          </p>
          <p className="text-xs text-gray-400">
            ※順番が来ると画面が切り替わります
          </p>
        </div>
      ) : (
        /* 発行前の表示 */
        <div>
          <p className="mb-6 text-gray-600">
            整理券を発行して、五月祭を楽しみましょう！
          </p>
          <button
            onClick={issueTicket}
            className="bg-blue-500 text-white px-12 py-6 rounded-full font-bold text-2xl shadow-xl active:scale-95 transition-all"
          >
            整理券を発行する
          </button>
        </div>
      )}
    </main>
  );
}

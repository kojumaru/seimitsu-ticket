"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../src/lib/firebase"; // 作成した設定をインポート
import { doc, updateDoc, increment, getDoc, setDoc } from "firebase/firestore";

export default function Home() {
  const [profileName, setProfileName] = useState("");
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);

  useEffect(() => {
    liff.init({ liffId: "2009242984-XYO590kr" }).then(() => {
      if (liff.isLoggedIn()) {
        liff.getProfile().then((profile) => {
          setProfileName(profile.displayName);
        });
      } else {
        liff.login();
      }
    });
  }, []);

  const issueTicket = async () => {
    // 「tickets」コレクションの「seimitsu-lab」ドキュメントを操作
    const ticketRef = doc(db, "tickets", "seimitsu-lab");

    try {
      await updateDoc(ticketRef, { currentNumber: increment(1) });
    } catch {
      // まだデータがない場合は、1番からスタート
      await setDoc(ticketRef, { currentNumber: 1 });
    }

    const snap = await getDoc(ticketRef);
    if (snap.exists()) {
      setTicketNumber(snap.data().currentNumber);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-blue-50 text-black">
      <h1 className="text-3xl font-bold text-blue-600 mb-8">
        精密Lab. 整理券システム
      </h1>

      {profileName && (
        <p className="mb-4">
          ようこそ、<span className="font-bold">{profileName}</span>さん
        </p>
      )}

      {ticketNumber ? (
        <div className="bg-white p-10 rounded-3xl shadow-2xl text-center">
          <p className="text-gray-500">あなたの整理番号</p>
          <p className="text-7xl font-black text-blue-600">{ticketNumber}</p>
        </div>
      ) : (
        <button
          onClick={issueTicket}
          className="bg-blue-500 text-white px-10 py-5 rounded-full font-bold text-xl shadow-lg hover:bg-blue-600 active:scale-95 transition"
        >
          整理券を発行する
        </button>
      )}
    </main>
  );
}

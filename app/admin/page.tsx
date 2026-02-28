"use client";

import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

export default function AdminPage() {
  const [exhibitId, setExhibitId] = useState("kikaku-a");
  const [nowServing, setNowServing] = useState(0);

  useEffect(() => {
    const ticketRef = doc(db, "tickets", exhibitId);

    const unsubscribe = onSnapshot(ticketRef, (snap) => {
      if (snap.exists()) {
        setNowServing(snap.data().nowServing || 0);
      }
    });

    return () => unsubscribe();
  }, [exhibitId]);

  const nextNumber = async () => {
    const ticketRef = doc(db, "tickets", exhibitId);
    await updateDoc(ticketRef, {
      nowServing: nowServing + 1,
    });
  };

  return (
    <main className="p-8 bg-black text-white min-h-screen text-center">
      <h1 className="text-2xl font-bold mb-6">運営ページ（{exhibitId}）</h1>

      <div className="text-4xl mb-6">現在呼び出し：{nowServing} 番</div>

      <button
        onClick={nextNumber}
        className="bg-red-600 px-8 py-4 rounded-xl text-xl"
      >
        次の番号を呼ぶ
      </button>
    </main>
  );
}

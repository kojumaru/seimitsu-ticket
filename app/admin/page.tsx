"use client";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";

export default function AdminPage() {
  const [currentNumber, setCurrentNumber] = useState(0);
  const [nowServing, setNowServing] = useState(0);
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "tickets", "seimitsu-lab"),
      (doc) => {
        if (doc.exists()) {
          setCurrentNumber(doc.data().currentNumber || 0);
          setNowServing(doc.data().nowServing || 0);
        }
      },
    );
    return () => unsubscribe();
  }, []);

  const handleCallNext = async () => {
    const nextNum = nowServing + 1;
    if (nextNum > currentNumber || isCalling) return;

    setIsCalling(true);
    try {
      // 1. Firestoreの呼び出し番号を更新
      await updateDoc(doc(db, "tickets", "seimitsu-lab"), {
        nowServing: nextNum,
      });

      // 2. 該当する番号を持つユーザーを検索
      const q = query(
        collection(db, "users"),
        where("ticketNumber", "==", nextNum),
        limit(1),
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0];
        const userId = userData.id; // ドキュメントIDがLINEのユーザーID

        // 3. 作成したAPIを叩いて通知を送信
        await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, ticketNumber: nextNum }),
        });
      }
    } catch (error) {
      console.error("通知送信エラー:", error);
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white font-sans">
      <h1 className="text-3xl font-bold mb-8 border-b border-gray-700 pb-4">
        精密Lab. 運営パネル
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-gray-800 p-6 rounded-2xl border border-blue-500/30">
          <p className="text-gray-400 text-sm mb-1">発行済み総数</p>
          <p className="text-5xl font-mono text-blue-400">{currentNumber}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-2xl border border-green-500/30">
          <p className="text-gray-400 text-sm mb-1">呼び出し中</p>
          <p className="text-5xl font-mono text-green-400">{nowServing}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-2xl border border-yellow-500/30 text-center">
          <p className="text-gray-400 text-sm mb-1">未案内</p>
          <p className="text-5xl font-mono text-yellow-400">
            {currentNumber - nowServing}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-6">
        <button
          onClick={handleCallNext}
          disabled={nowServing >= currentNumber || isCalling}
          className="w-full max-w-md bg-green-600 hover:bg-green-500 disabled:bg-gray-600 py-12 rounded-3xl text-4xl font-black shadow-lg transition-all active:scale-95"
        >
          {isCalling ? "通知中..." : `${nowServing + 1}番を呼ぶ`}
        </button>
        <p className="text-gray-500 text-sm text-center">
          ※ボタンを押すとFirestoreが更新され、
          <br />
          該当者にLINEプッシュメッセージが飛びます。
        </p>
      </div>
    </main>
  );
}

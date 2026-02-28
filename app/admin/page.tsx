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
  const [statusMsg, setStatusMsg] = useState(""); // 状況表示用

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
    setStatusMsg(`⏳ ${nextNum}番を呼び出し中...`);

    try {
      // 1. Firestoreの呼び出し番号を更新
      await updateDoc(doc(db, "tickets", "seimitsu-lab"), {
        nowServing: nextNum,
      });

      // 2. 該当番号のユーザー（LINE ID）を検索
      const q = query(
        collection(db, "users"),
        where("ticketNumber", "==", nextNum),
        limit(1),
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setStatusMsg(`❌ DBに${nextNum}番のユーザーが見つかりません。`);
        setIsCalling(false);
        return;
      }

      const userId = querySnapshot.docs[0].id;

      // 3. 通知APIを呼び出し
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ticketNumber: nextNum }),
      });

      if (response.ok) {
        setStatusMsg(`✨ ${nextNum}番に通知を送りました！`);
      } else {
        const err = await response.json();
        setStatusMsg(`❌ 通知失敗: ${err.error?.message || "エラー"}`);
      }
    } catch (error) {
      setStatusMsg("🔥 通信エラーが発生しました。");
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white font-sans flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-8 border-b border-gray-700 w-full pb-4">
        精密Lab. 運営パネル
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full max-w-4xl">
        <div className="bg-gray-800 p-6 rounded-2xl border border-blue-500/30 text-center">
          <p className="text-gray-400 text-sm mb-1">発行済み総数</p>
          <p className="text-5xl font-mono text-blue-400">{currentNumber}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-2xl border border-green-500/30 text-center">
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
      <button
        onClick={handleCallNext}
        disabled={nowServing >= currentNumber || isCalling}
        className="w-full max-w-md bg-green-600 py-12 rounded-3xl text-4xl font-black shadow-lg disabled:bg-gray-600 active:scale-95 transition-all"
      >
        {isCalling ? "通知中..." : `${nowServing + 1}番を呼ぶ`}
      </button>

      {/* 状況表示（ここが重要！） */}
      <div className="mt-8 p-4 bg-gray-800 rounded-xl w-full max-w-md text-center text-blue-300 border border-blue-900">
        {statusMsg || "待機中"}
      </div>
    </main>
  );
}

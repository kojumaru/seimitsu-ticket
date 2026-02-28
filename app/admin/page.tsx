"use client";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase"; // adminフォルダから見たパス
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  getDocs,
} from "firebase/firestore";

export default function AdminPage() {
  const [currentNumber, setCurrentNumber] = useState(0);
  const [nowServing, setNowServing] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    // リアルタイム監視
    const unsubscribe = onSnapshot(
      doc(db, "tickets", "seimitsu-lab"),
      (doc) => {
        if (doc.exists()) {
          setCurrentNumber(doc.data().currentNumber || 0);
          setNowServing(doc.data().nowServing || 0);
        }
      },
    );

    // 発行済みの名簿数を取得
    const fetchStats = async () => {
      const q = query(collection(db, "users"));
      const snap = await getDocs(q);
      setTotalUsers(snap.size);
    };
    fetchStats();

    return () => unsubscribe();
  }, []);

  const handleCallNext = async () => {
    if (nowServing >= currentNumber) return;
    await updateDoc(doc(db, "tickets", "seimitsu-lab"), {
      nowServing: nowServing + 1,
    });
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
          <p className="text-gray-400 text-sm mb-1">現在の呼び出し番号</p>
          <p className="text-5xl font-mono text-green-400">{nowServing}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-2xl border border-yellow-500/30">
          <p className="text-gray-400 text-sm mb-1">案内待ち人数</p>
          <p className="text-5xl font-mono text-yellow-400">
            {currentNumber - nowServing}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={handleCallNext}
          disabled={nowServing >= currentNumber}
          className="w-full max-w-md bg-green-600 hover:bg-green-500 disabled:bg-gray-600 py-12 rounded-3xl text-4xl font-black shadow-lg transition-all active:scale-95"
        >
          {nowServing + 1}番の方を呼ぶ
        </button>
        <p className="text-gray-500 text-sm">
          ※ボタンを押すと来場者の画面がリアルタイムで更新されます
        </p>
      </div>
    </main>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  where,
  getDoc,
  limit,
} from "firebase/firestore";

type PageProps = {
  params: Promise<{ exhibitId: string }>;
};

export default function AdminPage({ params }: PageProps) {
  // ✅ Next.js 15
  const { exhibitId } = use(params);

  const [currentNumber, setCurrentNumber] = useState(0);
  const [nowServing, setNowServing] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (!exhibitId) return;

    const ticketRef = doc(db, "tickets", exhibitId);

    const unsubscribe = onSnapshot(ticketRef, (snap) => {
      if (snap.exists()) {
        setCurrentNumber(snap.data().currentNumber || 0);
        setNowServing(snap.data().nowServing || 0);
      }
    });

    return () => unsubscribe();
  }, [exhibitId]);

  const handleCallNext = async () => {
    if (!exhibitId) return;

    const nextNum = nowServing + 1;
    if (nextNum > currentNumber || isCalling) return;

    setIsCalling(true);
    setStatusMsg(`⏳ ${nextNum}番（${exhibitId}）を呼び出し中...`);

    try {
      await updateDoc(doc(db, "tickets", exhibitId), {
        nowServing: nextNum,
      });

      // 🔥 active_tickets を使う場合（推奨）
      const activeId = `${exhibitId}_${nextNum}`;
      const activeSnap = await getDoc(doc(db, "active_tickets", activeId));

      if (!activeSnap.exists()) {
        setStatusMsg("❌ 対象ユーザーが見つかりません");
        return;
      }

      const { userId } = activeSnap.data();

      const response = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          ticketNumber: nextNum,
          exhibitName: exhibitId,
        }),
      });

      if (response.ok) {
        setStatusMsg(`✨ ${exhibitId} の ${nextNum}番 に通知しました`);
      } else {
        setStatusMsg("❌ 通知失敗");
      }
    } catch (err) {
      console.error(err);
      setStatusMsg("🔥 通信エラー");
    } finally {
      setIsCalling(false);
    }
  };

  if (!exhibitId) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-8 text-center">
        運営パネル：{exhibitId}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full max-w-4xl">
        <Stat label="発行済み総数" value={currentNumber} />
        <Stat label="呼び出し中" value={nowServing} />
        <Stat label="未案内" value={currentNumber - nowServing} />
      </div>

      <button
        onClick={handleCallNext}
        disabled={nowServing >= currentNumber || isCalling}
        className="w-full max-w-md bg-green-600 py-12 rounded-3xl text-4xl font-black disabled:bg-gray-600"
      >
        {isCalling ? "通知中..." : `${nowServing + 1}番を呼ぶ`}
      </button>

      <div className="mt-8 text-blue-300">
        {statusMsg || `展示「${exhibitId}」の待機中`}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl text-center">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-5xl font-mono">{value}</p>
    </div>
  );
}

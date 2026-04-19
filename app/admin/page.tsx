"use client";

import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { notifyUser } from "../actions/notify";

export default function AdminPage() {
  const exhibitId =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("exhibitId") ??
        "kikaku-a")
      : "kikaku-a";

  const [nowServing, setNowServing] = useState(0);
  const [currentNumber, setCurrentNumber] = useState(0);
  const [loading, setLoading] = useState(false); // 連打防止用
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exhibitId) return;
    const ticketRef = doc(db, "tickets", exhibitId);
    const unsubscribe = onSnapshot(ticketRef, (snap) => {
      if (snap.exists()) {
        setNowServing(snap.data().nowServing || 0);
        setCurrentNumber(snap.data().currentNumber || 0);
      }
    });
    return () => unsubscribe();
  }, [exhibitId]);

  const nextNumber = async () => {
    if (loading) return; // 処理中はガード
    setError(null);

    const newNumber = nowServing + 1;

    // エラーチェック：currentNumber >= newNumber の場合
    if (currentNumber >= newNumber) {
      setError(`エラー：呼び出し済みの番号です。現在案内中: ${currentNumber}番、配布済み: ${nowServing}番`);
      return;
    }

    setLoading(true);

    try {
      const ticketRef = doc(db, "tickets", exhibitId);

      console.log(`${exhibitId} の呼び出しを ${newNumber} に更新します...`);

      // updateDocではなくsetDoc({merge: true})にすると、ドキュメントがなくても作成してくれます
      await setDoc(ticketRef, { nowServing: newNumber }, { merge: true });

      const activeRef = doc(db, "active_tickets", `${exhibitId}_${newNumber}`);
      const activeSnap = await getDoc(activeRef);

      if (!activeSnap.exists()) {
        console.log(
          "対象の整理券を発行しているユーザーがいません。通知をスキップします。",
        );
        setLoading(false);
        return;
      }

      const userId = activeSnap.data().userId;

      const result = await notifyUser(userId, newNumber, exhibitId);

      if (result.ok) {
        console.log("LINE通知に成功しました！");
      } else {
        console.error("LINE通知に失敗しました:", result.error);
      }
    } catch (error) {
      console.error("Firestoreの更新中にエラーが発生しました:", error);
      alert("エラーが発生しました。コンソールを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 bg-black text-white min-h-screen text-center flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-6">運営ページ（{exhibitId}）</h1>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-900/30 border-2 border-red-500 text-red-300 p-4 rounded-xl mb-6 max-w-md">
          {error}
        </div>
      )}

      {/* 現在案内中と配布済みを並べて表示 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900 p-8 rounded-2xl border border-white/10">
          <p className="text-slate-500 text-xs mb-2 uppercase tracking-widest">
            Currently Serving
          </p>
          <div className="text-5xl font-mono font-bold text-blue-400">
            {currentNumber} <span className="text-lg text-slate-400">番</span>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-2xl border border-white/10">
          <p className="text-slate-500 text-xs mb-2 uppercase tracking-widest">
            Now Serving
          </p>
          <div className="text-5xl font-mono font-bold text-red-500">
            {nowServing} <span className="text-lg text-slate-400">番</span>
          </div>
        </div>
      </div>

      <button
        onClick={nextNumber}
        disabled={loading}
        className={`px-12 py-6 rounded-2xl text-2xl font-black transition-all shadow-xl
          ${loading ? "bg-slate-700 opacity-50 cursor-not-allowed" : "bg-red-600 hover:bg-red-500 active:scale-95"}`}
      >
        {loading ? "更新中..." : "次の番号を呼ぶ"}
      </button>

      <p className="mt-8 text-slate-500 text-xs uppercase tracking-tighter">
        Admin Console for Precision Lab.
      </p>
    </main>
  );
}

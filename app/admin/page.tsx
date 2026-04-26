"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../lib/firebase";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { notifyUser } from "../actions/notify";

export default function AdminPage() {
  const exhibitId =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("exhibitId") ??
        "kikaku-a")
      : "kikaku-a";

  const [nowServing, setNowServing] = useState(0);
  const [currentNumber, setCurrentNumber] = useState(0);
  const [distributionEnabled, setDistributionEnabled] = useState(true);
  const [loading, setLoading] = useState(false); // 連打防止用
  const [toggleLoading, setToggleLoading] = useState(false); // トグル処理中フラグ
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exhibitId) return;

    const initializeData = async () => {
      // Firebase 匿名認証
      await signInAnonymously(auth);

      // 認証後にリスナーを設定
      const ticketRef = doc(db, "tickets", exhibitId);
      const unsubscribe = onSnapshot(
        ticketRef,
        (snap) => {
          if (snap.exists()) {
            setNowServing(snap.data().nowServing || 0);
            setCurrentNumber(snap.data().currentNumber || 0);
            setDistributionEnabled(snap.data().distributionEnabled ?? true);
          }
        },
        (error) => {
          console.error("onSnapshot error:", error);
        }
      );
      return unsubscribe;
    };

    let unsubscribePromise: Promise<any> | null = null;
    unsubscribePromise = initializeData();

    return () => {
      if (unsubscribePromise) {
        unsubscribePromise.then((unsubscribe) => unsubscribe?.());
      }
    };
  }, [exhibitId]);

  const nextNumber = async () => {
    if (loading) return; // 処理中はガード
    setError(null);

    const newCurrentNumber = currentNumber + 1;

    // エラーチェック：newCurrentNumber > nowServing の場合
    if (newCurrentNumber > nowServing) {
      setError(`エラー：まだ整理券が発行されていません。現在案内中: ${currentNumber}番、配布済み: ${nowServing}番`);
      return;
    }

    setLoading(true);

    try {
      const ticketRef = doc(db, "tickets", exhibitId);

      console.log(`${exhibitId} の現在案内中を ${newCurrentNumber} に更新します...`);

      // currentNumber を更新（呼び出し時刻も記録）
      await setDoc(ticketRef, { currentNumber: newCurrentNumber, currentNumber_called_at: new Date() }, { merge: true });

      const activeRef = doc(db, "active_tickets", `${exhibitId}_${newCurrentNumber}`);
      const activeSnap = await getDoc(activeRef);

      if (!activeSnap.exists()) {
        console.log(
          "対象の整理券を発行しているユーザーがいません。通知をスキップします。",
        );
        setLoading(false);
        return;
      }

      const userId = activeSnap.data().userId;

      const result = await notifyUser(userId, newCurrentNumber, exhibitId);

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

  const toggleDistribution = async (enabled: boolean) => {
    if (toggleLoading) return;
    setToggleLoading(true);

    try {
      const ticketRef = doc(db, "tickets", exhibitId);

      if (enabled) {
        // ON にするだけ
        await setDoc(ticketRef, { distributionEnabled: true }, { merge: true });
        console.log(`${exhibitId} の配布モードを ON に設定しました`);
      } else {
        // OFF にして全配布済みを呼び出し済みに
        await setDoc(
          ticketRef,
          {
            distributionEnabled: false,
            currentNumber: nowServing,
          },
          { merge: true }
        );
        console.log(`${exhibitId} の配布モードを OFF に設定し、currentNumber を ${nowServing} に更新しました`);
      }
    } catch (error) {
      console.error("配布モード更新中にエラーが発生しました:", error);
      alert("エラーが発生しました。コンソールを確認してください。");
    } finally {
      setToggleLoading(false);
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

      {/* 現在案内中（メイン） */}
      <div className="mb-8">
        <p className="text-slate-400 text-sm mb-3 uppercase tracking-widest">
          Currently Serving
        </p>
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-16 rounded-3xl border-2 border-blue-400 shadow-2xl shadow-blue-500/50 animate-pulse">
          <div className="text-[10rem] font-mono font-bold text-white leading-none">
            {currentNumber}
          </div>
          <div className="text-4xl text-blue-200 mt-2">番</div>
        </div>
        <p className="text-slate-500 text-xs mt-4 uppercase tracking-widest">
          配布済み：{nowServing}番
        </p>
      </div>

      <button
        onClick={nextNumber}
        disabled={loading}
        className={`px-12 py-6 rounded-2xl text-2xl font-black transition-all shadow-xl mb-12
          ${loading ? "bg-slate-700 opacity-50 cursor-not-allowed" : "bg-red-600 hover:bg-red-500 active:scale-95"}`}
      >
        {loading ? "更新中..." : "次の番号を呼ぶ"}
      </button>

      {/* 配布モード切り替え */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => toggleDistribution(true)}
          disabled={toggleLoading}
          className={`px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-lg
            ${distributionEnabled
              ? "bg-green-600 hover:bg-green-500 active:scale-95"
              : "bg-slate-700 hover:bg-slate-600 active:scale-95"
            }
            ${toggleLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {toggleLoading ? "更新中..." : "配布モード ON"}
        </button>
        <button
          onClick={() => toggleDistribution(false)}
          disabled={toggleLoading}
          className={`px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-lg
            ${!distributionEnabled
              ? "bg-orange-600 hover:bg-orange-500 active:scale-95"
              : "bg-slate-700 hover:bg-slate-600 active:scale-95"
            }
            ${toggleLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {toggleLoading ? "更新中..." : "配布モード OFF"}
        </button>
      </div>

      <p className="text-slate-400 text-sm mb-12">
        配布モード: {distributionEnabled ? "配布中" : "案内中"}
      </p>

      <p className="mt-8 text-slate-500 text-xs uppercase tracking-tighter">
        Admin Console for Precision Lab.
      </p>
    </main>
  );
}

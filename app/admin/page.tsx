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
  const [statusMsg, setStatusMsg] = useState(""); // 画面にデバッグ状況を表示

  useEffect(() => {
    // リアルタイム監視設定
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
    console.log(`🚀 呼び出しシーケンス開始: ${nextNum}番`);

    try {
      // 1. Firestoreの呼び出し番号を更新（来場者の画面が先に変わる）
      await updateDoc(doc(db, "tickets", "seimitsu-lab"), {
        nowServing: nextNum,
      });
      console.log("✅ FirestoreのnowServingを更新しました");

      // 2. 該当する番号を持つユーザーを検索
      const q = query(
        collection(db, "users"),
        where("ticketNumber", "==", nextNum),
        limit(1),
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const msg = `❌ データベースに ${nextNum}番 のユーザーが見つかりません。DBの番号を確認してください。`;
        console.warn(msg);
        setStatusMsg(msg);
        setIsCalling(false);
        return;
      }

      const userData = querySnapshot.docs[0];
      const userId = userData.id; // ドキュメントIDがLINEのユーザーID
      console.log(
        `👤 通知対象者を発見: ${userId} (${userData.data().displayName})`,
      );

      // 3. 通知APIを叩く
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ticketNumber: nextNum }),
      });

      const result = await response.json();

      if (response.ok) {
        const successMsg = `✨ ${nextNum}番 (${userData.data().displayName}) への通知送信に成功しました！`;
        console.log(successMsg);
        setStatusMsg(successMsg);
      } else {
        const errMsg = `❌ LINE通知失敗: ${JSON.stringify(result.error || "Unknown error")}`;
        console.error(errMsg);
        setStatusMsg(errMsg);
      }
    } catch (error) {
      console.error("🔥 システムエラー:", error);
      setStatusMsg(
        "🔥 通信エラーが発生しました。コンソールを確認してください。",
      );
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
        <div className="bg-gray-800 p-6 rounded-2xl border border-blue-500/30 text-center">
          <p className="text-gray-400 text-sm mb-1">発行済み総数</p>
          <p className="text-5xl font-mono text-blue-400">{currentNumber}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-2xl border border-green-500/30 text-center">
          <p className="text-gray-400 text-sm mb-1">現在の呼び出し番号</p>
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

        {/* 状況表示エリア */}
        <div
          className={`mt-4 p-4 rounded-xl text-sm ${statusMsg.includes("❌") || statusMsg.includes("🔥") ? "bg-red-900/50 text-red-200" : "bg-blue-900/50 text-blue-200"}`}
        >
          {statusMsg || "待機中"}
        </div>

        <p className="text-gray-500 text-sm text-center">
          ※ボタンを押すとFirestoreが更新され、該当者にLINE通知が飛びます。
          <br />
          Vercel Logsで詳細なログを確認できます。
        </p>
      </div>
    </main>
  );
}

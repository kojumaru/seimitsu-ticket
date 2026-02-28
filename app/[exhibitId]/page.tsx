"use client";

import { use, useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

type PageProps = {
  params: Promise<{ exhibitId: string }>;
};

export default function TicketPage({ params }: PageProps) {
  // ✅ Next.js 15 対応
  const { exhibitId } = use(params);

  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [nowServing, setNowServing] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // exhibitId 未確定なら何もしない（完全ガード）
    if (!exhibitId) return;

    const ticketRef = doc(db, "tickets", exhibitId);

    const unsubscribe = onSnapshot(ticketRef, (snap) => {
      if (snap.exists()) {
        setNowServing(snap.data().nowServing || 0);
      }
    });

    const initLiff = async () => {
      await liff.init({ liffId: "あなたのLIFF_ID" });

      if (!liff.isLoggedIn()) return;

      const token = liff.getDecodedIDToken();
      if (!token?.sub) return;

      await checkMyTicket(token.sub);
      setReady(true);
    };

    initLiff();

    return () => unsubscribe();
  }, [exhibitId]);

  const checkMyTicket = async (uid: string) => {
    if (!exhibitId) return;

    const userRef = doc(db, "users", uid, "myTickets", exhibitId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      setTicketNumber(snap.data().ticketNumber);
    }
  };

  const issueTicket = async () => {
    if (!exhibitId) return;

    const profile = await liff.getProfile();
    const ticketRef = doc(db, "tickets", exhibitId);
    const snap = await getDoc(ticketRef);

    const newNumber = (snap.data()?.currentNumber || 0) + 1;

    // 1. 発行数更新
    await setDoc(ticketRef, { currentNumber: newNumber }, { merge: true });

    // 2. ユーザー保存
    await setDoc(doc(db, "users", profile.userId, "myTickets", exhibitId), {
      ticketNumber: newNumber,
      exhibitName: exhibitId,
      issuedAt: new Date(),
    });

    setTicketNumber(newNumber);
  };

  if (!exhibitId) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  return (
    <main className="p-8 text-center bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">展示：{exhibitId}</h1>
      <p className="text-xl mb-8">現在の案内：{nowServing} 番</p>

      {!ready ? (
        <p>LINE認証中...</p>
      ) : ticketNumber ? (
        <div className="text-4xl font-mono text-green-400">
          あなたの番号：{ticketNumber}
        </div>
      ) : (
        <button
          onClick={issueTicket}
          className="bg-blue-600 px-8 py-4 rounded-xl text-xl"
        >
          整理券を発行する
        </button>
      )}
    </main>
  );
}

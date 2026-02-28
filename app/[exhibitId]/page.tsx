// app/[exhibitId]/page.tsx
"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export default function TicketPage({
  params,
}: {
  params: { exhibitId: string };
}) {
  const { exhibitId } = params; // URLから "kikaku-a" などを取得
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [nowServing, setNowServing] = useState(0);

  useEffect(() => {
    // その企画の呼び出し状況をリアルタイム監視
    const unsubscribe = onSnapshot(doc(db, "tickets", exhibitId), (doc) => {
      if (doc.exists()) setNowServing(doc.data().nowServing || 0);
    });

    liff.init({ liffId: "あなたのLIFF_ID" }).then(() => {
      if (liff.isLoggedIn()) {
        const profile = liff.getDecodedIDToken();
        if (profile?.sub) checkMyTicket(profile.sub);
      }
    });
    return () => unsubscribe();
  }, [exhibitId]);

  const checkMyTicket = async (uid: string) => {
    // 企画ごとのチケット情報を取得
    const userDoc = await getDoc(doc(db, "users", uid, "myTickets", exhibitId));
    if (userDoc.exists()) setTicketNumber(userDoc.data().ticketNumber);
  };

  const issueTicket = async () => {
    const profile = await liff.getProfile();
    const ticketRef = doc(db, "tickets", exhibitId);
    const snap = await getDoc(ticketRef);
    const newNumber = (snap.data()?.currentNumber || 0) + 1;

    // 1. 企画の総発行数を更新
    await setDoc(ticketRef, { currentNumber: newNumber }, { merge: true });

    // 2. ユーザーの「企画ごとのチケット」として保存
    await setDoc(doc(db, "users", profile.userId, "myTickets", exhibitId), {
      ticketNumber: newNumber,
      exhibitName: exhibitId, // 企画A or 企画B
      issuedAt: new Date(),
    });

    setTicketNumber(newNumber);
  };

  return (
    <main className="p-8 text-center bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">展示：{exhibitId}</h1>
      <p className="text-xl mb-8">現在の案内：{nowServing} 番</p>
      {ticketNumber ? (
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

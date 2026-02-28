"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "./lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";

export default function TicketPage() {
  // 🔥 クエリから exhibitId を取得
  const exhibitId =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("exhibitId") ??
        "kikaku-a")
      : "kikaku-a";

  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [nowServing, setNowServing] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!exhibitId) return;

    const ticketRef = doc(db, "tickets", exhibitId);

    const unsubscribe = onSnapshot(ticketRef, (snap) => {
      if (snap.exists()) {
        setNowServing(snap.data().nowServing || 0);
      }
    });

    const initLiff = async () => {
      await liff.init({ liffId: "2009242984-XYO590kr" }); // ←あなたのLIFF_ID

      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }

      const token = liff.getDecodedIDToken();
      if (!token?.sub) return;

      await checkMyTicket(token.sub);
      setReady(true);
    };

    initLiff();

    return () => unsubscribe();
  }, [exhibitId]);

  const checkMyTicket = async (uid: string) => {
    const userRef = doc(db, "users", uid, "myTickets", exhibitId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      setTicketNumber(snap.data().ticketNumber);
    }
  };

  const issueTicket = async () => {
    const profile = await liff.getProfile();
    const ticketRef = doc(db, "tickets", exhibitId);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ticketRef);

      const newNumber = (snap.data()?.currentNumber || 0) + 1;

      transaction.set(ticketRef, { currentNumber: newNumber }, { merge: true });

      transaction.set(
        doc(db, "users", profile.userId, "myTickets", exhibitId),
        {
          ticketNumber: newNumber,
          exhibitName: exhibitId,
          issuedAt: new Date(),
        },
      );

      transaction.set(doc(db, "active_tickets", `${exhibitId}_${newNumber}`), {
        userId: profile.userId,
        exhibitId,
        ticketNumber: newNumber,
      });

      setTicketNumber(newNumber);
    });
  };

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

"use client";

import { use, useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "../lib/firebase";
import { doc, getDoc, onSnapshot, runTransaction } from "firebase/firestore";

type PageProps = {
  params: Promise<{ exhibitId: string }>;
};

export default function TicketPage({ params }: PageProps) {
  const { exhibitId } = use(params);

  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [nowServing, setNowServing] = useState(0);
  const [ready, setReady] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  useEffect(() => {
    if (!exhibitId) return;

    const ticketRef = doc(db, "tickets", exhibitId);

    const unsubscribe = onSnapshot(ticketRef, (snap) => {
      if (snap.exists()) {
        setNowServing(snap.data().nowServing || 0);
      }
    });

    const initLiff = async () => {
      await liff.init({ liffId: "あなたのLIFF_ID" });

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
    if (!exhibitId) return;

    const userRef = doc(db, "users", uid, "myTickets", exhibitId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      setTicketNumber(snap.data().ticketNumber);
    }
  };

  const issueTicket = async () => {
    if (!exhibitId || isIssuing) return;

    try {
      setIsIssuing(true);

      const profile = await liff.getProfile();
      const ticketRef = doc(db, "tickets", exhibitId);

      const newNumber = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ticketRef);
        const nextNumber = (snap.data()?.currentNumber || 0) + 1;

        transaction.set(
          ticketRef,
          { currentNumber: nextNumber },
          { merge: true },
        );

        transaction.set(
          doc(db, "users", profile.userId, "myTickets", exhibitId),
          {
            ticketNumber: nextNumber,
            exhibitName: exhibitId,
            issuedAt: new Date(),
          },
        );

        transaction.set(
          doc(db, "active_tickets", `${exhibitId}_${nextNumber}`),
          {
            userId: profile.userId,
            exhibitId,
            ticketNumber: nextNumber,
          },
        );

        return nextNumber;
      });

      setTicketNumber(newNumber);
    } catch (error) {
      console.error("整理券発行エラー:", error);
    } finally {
      setIsIssuing(false);
    }
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
          disabled={isIssuing}
          className="bg-blue-600 px-8 py-4 rounded-xl text-xl disabled:bg-gray-600"
        >
          {isIssuing ? "発行中..." : "整理券を発行する"}
        </button>
      )}
    </main>
  );
}

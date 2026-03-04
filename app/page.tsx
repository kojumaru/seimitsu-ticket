"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "./lib/firebase";
import { doc, getDoc, onSnapshot, runTransaction } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Clock, CheckCircle2, BellRing } from "lucide-react";

const EXHIBIT_INFO: Record<string, { location: string; name: string }> = {
  switch: {
    name: "せいみつスイッチ",
    location: "工学部14号館 3階 プロジェクト室",
  },
  soccer: {
    name: "ロボットサッカー",
    location: "工学部14号館 3階 プロジェクト室",
  },
};

export default function TicketPage() {
  const exhibitId =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("exhibitId") ??
        "kikaku-a")
      : "kikaku-a";

  const currentInfo = EXHIBIT_INFO[exhibitId] || {
    name: exhibitId.toUpperCase(),
    location: "工学部2号館",
  };

  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [nowServing, setNowServing] = useState(0);
  const [ready, setReady] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  useEffect(() => {
    if (!exhibitId) return;
    const ticketRef = doc(db, "tickets", exhibitId);
    const unsubscribe = onSnapshot(ticketRef, (snap) => {
      if (snap.exists()) setNowServing(snap.data().nowServing || 0);
    });

    const initLiff = async () => {
      await liff.init({ liffId: "2009242984-XYO590kr" });
      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }
      const token = liff.getDecodedIDToken();
      if (token?.sub) await checkMyTicket(token.sub);
      setReady(true);
    };
    initLiff();
    return () => unsubscribe();
  }, [exhibitId]);

  const checkMyTicket = async (uid: string) => {
    const userRef = doc(db, "users", uid, "myTickets", exhibitId);
    const snap = await getDoc(userRef);
    if (snap.exists()) setTicketNumber(snap.data().ticketNumber);
  };

  const issueTicket = async () => {
    setIsIssuing(true);
    try {
      const profile = await liff.getProfile();
      const ticketRef = doc(db, "tickets", exhibitId);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ticketRef);
        const newNumber = (snap.data()?.currentNumber || 0) + 1;
        transaction.set(
          ticketRef,
          { currentNumber: newNumber },
          { merge: true },
        );
        transaction.set(
          doc(db, "users", profile.userId, "myTickets", exhibitId),
          {
            ticketNumber: newNumber,
            exhibitName: exhibitId,
            issuedAt: new Date(),
          },
        );
        transaction.set(
          doc(db, "active_tickets", `${exhibitId}_${newNumber}`),
          {
            userId: profile.userId,
            exhibitId,
            ticketNumber: newNumber,
          },
        );
        setTicketNumber(newNumber);
      });
    } finally {
      setIsIssuing(false);
    }
  };

  const waitCount = ticketNumber
    ? Math.max(0, ticketNumber - nowServing)
    : null;

  return (
    <main className="h-screen bg-[#0a0f1e] text-slate-100 p-6 flex flex-col items-center justify-center font-sans overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-sm z-10 flex flex-col gap-6">
        <header className="text-center">
          <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[11px] font-bold tracking-widest uppercase mb-3">
            精密Lab. 整理券システム
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white italic leading-none mb-4">
            {currentInfo.name}
          </h1>
          <div className="flex items-center justify-center gap-2 text-blue-400 font-medium text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {currentInfo.location}
          </div>
        </header>

        <div className="bg-slate-900/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
          <div className="flex flex-col items-center border-b border-white/5 pb-6 mb-6">
            <p className="text-slate-500 text-[11px] font-bold uppercase mb-2 tracking-widest flex items-center gap-2">
              <Clock size={14} className="text-emerald-400" /> 現在の案内
            </p>
            <p className="text-[10rem] font-mono font-bold text-emerald-400 leading-none">
              {nowServing}
              <span className="text-3xl ml-2 font-sans text-slate-500">番</span>
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!ready ? (
              <div className="py-12 text-center">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : ticketNumber ? (
              <motion.div
                key="ticket"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-center shadow-lg">
                  <p className="text-blue-100/60 text-[11px] font-bold uppercase tracking-widest mb-2">
                    あなたの番号
                  </p>
                  <p className="text-7xl font-black text-white tracking-tighter">
                    {ticketNumber}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] text-blue-100 font-bold">
                    <CheckCircle2 size={12} /> 発行済み
                  </div>
                </div>

                <div className="space-y-4 text-center">
                  <p className="text-slate-400 text-sm">
                    あなたの番まであと{" "}
                    <span className="text-white font-bold text-2xl">
                      {waitCount}
                    </span>{" "}
                    人
                  </p>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3 text-left">
                    <BellRing
                      className="text-blue-400 shrink-0 mt-0.5"
                      size={16}
                    />
                    <p className="text-blue-200 text-xs leading-relaxed font-medium">
                      <span className="text-white font-bold">あと10番以内</span>
                      になったら、公式LINEから通知します！
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="py-4 text-center">
                <button
                  onClick={issueTicket}
                  disabled={isIssuing}
                  className="w-full bg-white text-slate-900 py-9 rounded-[2rem] text-2xl font-black transition-all active:scale-95 shadow-2xl disabled:opacity-50"
                >
                  {isIssuing ? "発行中..." : "整理券を受け取る"}
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

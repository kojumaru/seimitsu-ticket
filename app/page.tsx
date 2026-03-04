"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "./lib/firebase";
import { doc, getDoc, onSnapshot, runTransaction } from "firebase/firestore";
// npm install framer-motion lucide-react でアイコンとアニメーションを追加できます
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Users, Clock, CheckCircle2 } from "lucide-react";

export default function TicketPage() {
  const exhibitId =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("exhibitId") ??
        "kikaku-a")
      : "kikaku-a";

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

  // 待ち人数の計算
  const waitCount = ticketNumber
    ? Math.max(0, ticketNumber - nowServing)
    : null;

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-slate-100 p-6 flex flex-col items-center justify-center font-sans">
      {/* 背景の装飾用グラデーション */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md z-10">
        <header className="text-center mb-10">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase mb-4">
            May Festival 2026
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 italic">
            {exhibitId.toUpperCase()}
          </h1>
          <p className="text-slate-400 text-sm">
            精密工学専攻 展示整理券システム
          </p>
        </header>

        {/* メインカード */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Ticket size={120} />
          </div>

          <div className="space-y-8 relative">
            {/* 現在の状況 */}
            <div className="flex justify-between items-end border-b border-white/5 pb-6">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                  <Clock size={14} /> 現在の案内番号
                </p>
                <p className="text-5xl font-mono font-bold text-emerald-400 leading-none">
                  {nowServing}
                  <span className="text-xl ml-1 font-sans text-slate-400">
                    番
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-end gap-1">
                  <Users size={14} /> 混雑状況
                </p>
                <p className="text-slate-300 font-semibold tracking-wide uppercase">
                  {nowServing < 50 ? "スムーズ" : "混雑中"}
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!ready ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 text-center"
                >
                  <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">LINE認証中...</p>
                </motion.div>
              ) : ticketNumber ? (
                <motion.div
                  key="ticket"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="py-4 text-center"
                >
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-3xl shadow-lg shadow-blue-900/20 relative">
                    <p className="text-blue-100/70 text-sm font-bold uppercase mb-2">
                      Your Ticket Number
                    </p>
                    <p className="text-7xl font-black text-white tracking-tighter mb-4">
                      {ticketNumber}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-blue-100">
                      <CheckCircle2 size={18} />
                      <span className="font-semibold uppercase tracking-wide text-sm">
                        整理券発行済み
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 space-y-2">
                    <p className="text-slate-400 text-sm">
                      あなたの番まであと{" "}
                      <span className="text-white font-bold text-lg">
                        {waitCount}
                      </span>{" "}
                      人です
                    </p>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.max(5, 100 - (waitCount || 0) * 5)}%`,
                        }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest pt-4">
                      順番が来たらLINEで通知します
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="action"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-6"
                >
                  <button
                    onClick={issueTicket}
                    disabled={isIssuing}
                    className="group relative w-full bg-white text-slate-900 py-8 rounded-[1.5rem] text-2xl font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-white/5 disabled:opacity-50"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {isIssuing ? "発行中..." : "整理券を受け取る"}
                    </span>
                  </button>
                  <p className="text-center text-slate-500 text-[10px] mt-6 uppercase tracking-widest">
                    ボタンを押すとLINE IDが登録されます
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}

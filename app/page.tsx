"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "./lib/firebase";
import { doc, getDoc, onSnapshot, runTransaction } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Clock, CheckCircle2, BellRing } from "lucide-react";

// 企画ごとの場所データを定義
const EXHIBIT_INFO: Record<string, { location: string; name: string }> = {
  せいみつスイッチ: {
    name: "せいみつスイッチ",
    location: "工学部14号館 3階 プロジェクト室",
  },
  ロボットサッカー: {
    name: "ロボットサッカー",
    location: "工学部14号館 3階 プロジェクト室",
  },
  // 必要に応じて追加してください
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
    <main className="min-h-screen bg-[#0a0f1e] text-slate-100 p-4 flex flex-col items-center justify-center font-sans overflow-hidden">
      {" "}
      // パディングをp-6からp-4に削減
      {/* 背景装飾 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[80px]" />{" "}
        // blurを減らして過剰な広がりを抑える
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[80px]" />{" "}
        // blurを減らして過剰な広がりを抑える
      </div>
      <div className="w-full max-w-md z-10">
        <header className="text-center mb-6">
          {" "}
          // mb-12からmb-6に大幅削減（統一感の修正）
          <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
            精密Lab. 整理券システム
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 italic">
            {" "}
            // mb-3からmb-2に削減
            {currentInfo.name}
          </h1>
          <div className="flex items-center justify-center gap-2 text-blue-400 font-medium text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {currentInfo.location}
          </div>
        </header>

        <div className="bg-slate-900/60 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 shadow-2xl relative">
          {" "}
          // p-10からp-6に、rounded-[3rem]からrounded-2xlに削減
          <div className="space-y-6 relative text-center">
            {" "}
            // space-y-10からspace-y-6に削減
            {/* 現在の状況 */}
            <div className="flex flex-col items-center border-b border-white/5 pb-4">
              {" "}
              // pb-8からpb-4に削減
              <p className="text-slate-500 text-[10px] font-bold uppercase mb-2 flex items-center gap-2 tracking-widest">
                {" "}
                // mb-4からmb-2に削減
                <Clock size={14} className="text-emerald-400" /> 現在の案内番号
              </p>
              <p className="text-5xl font-mono font-bold text-emerald-400 leading-none tracking-tighter">
                {" "}
                // フォントサイズを7xlから5xlに縮小
                {nowServing}
                <span className="text-2xl ml-2 font-sans text-slate-500">
                  番
                </span>
              </p>
            </div>
            <AnimatePresence mode="wait">
              {!ready ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-6"
                >
                  {" "}
                  // py-12からpy-6に削減
                  <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-500 text-xs tracking-widest">
                    INITIALIZING...
                  </p>
                </motion.div>
              ) : ticketNumber ? (
                <motion.div
                  key="ticket"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="space-y-6"
                >
                  {" "}
                  // space-y-8からspace-y-6に削減
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg shadow-blue-900/40 relative">
                    {" "}
                    // p-10からp-6に、rounded-[2rem]からrounded-2xlに削減
                    <p className="text-blue-100/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                      あなたの番号
                    </p>{" "}
                    // mb-3からmb-2に削減
                    <p className="text-6xl font-black text-white tracking-tighter">
                      {" "}
                      {ticketNumber}{" "}
                    </p>{" "}
                    // フォントサイズを8xlから6xlに縮小
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] text-blue-100 font-bold">
                      <CheckCircle2 size={12} /> 発行済み
                    </div>
                  </div>
                  <div className="space-y-4 mt-4">
                    {" "}
                    // space-y-6からspace-y-4に、mt-8からmt-4に削減
                    <div>
                      <p className="text-slate-400 text-sm mb-2">
                        {" "}
                        // mb-3からmb-2に削減 あなたの番まであと{" "}
                        <span className="text-white font-bold text-2xl">
                          {waitCount}
                        </span>{" "}
                        人
                      </p>
                      <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.max(5, 100 - (waitCount || 0) * 10)}%`,
                          }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                        />
                      </div>
                    </div>
                    {/* 通知メッセージの強調 */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 flex items-start gap-3 text-left">
                      {" "}
                      // p-4からp-3に削減
                      <BellRing
                        className="text-blue-400 shrink-0 mt-0.5"
                        size={18}
                      />
                      <p className="text-blue-200 text-xs leading-relaxed font-medium">
                        順番が
                        <span className="text-white font-bold text-sm">
                          あと10番以内
                        </span>
                        になったら、公式LINEから個別に通知いたします!
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="action"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-2"
                >
                  {" "}
                  // py-4からpy-2に削減
                  <button
                    onClick={issueTicket}
                    disabled={isIssuing}
                    className="group relative w-full bg-white text-slate-900 py-6 rounded-2xl text-xl font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl disabled:opacity-50" // py-8からpy-6に、text-2xlからtext-xlに、rounded-3xlからrounded-2xlに削減
                  >
                    {isIssuing ? "発行中..." : "整理券を受け取る"}
                  </button>
                  <p className="text-slate-500 text-[10px] mt-4 tracking-widest uppercase font-bold">
                    {" "}
                    // mt-6からmt-4に削減 One-Tap Digital Ticketing
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

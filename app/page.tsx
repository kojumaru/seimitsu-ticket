"use client";

import { useEffect, useRef, useState } from "react";
import liff from "@line/liff";
import { db } from "./lib/firebase";
import { doc, getDoc, onSnapshot, runTransaction } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

const EXHIBIT_INFO: Record<
  string,
  {
    location: string;
    name: string;
    timePerPerson: number;
    illustration: React.ReactNode;
  }
> = {
  switch: {
    name: "せいみつスイッチ",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    illustration: (
      <svg viewBox="0 0 120 120" width="60%" height="60%">
        <circle
          cx="60"
          cy="60"
          r="48"
          fill="#FFFFFF"
          stroke="#2E0A1A"
          strokeWidth="2"
        />
        <circle
          cx="60"
          cy="60"
          r="34"
          fill="#6B1F3A"
          stroke="#2E0A1A"
          strokeWidth="2"
        />
        <circle
          cx="60"
          cy="60"
          r="22"
          fill="#FFFFFF"
          stroke="#2E0A1A"
          strokeWidth="2"
        />
        <rect x="56" y="30" width="8" height="20" fill="#2E0A1A" rx="2" />
      </svg>
    ),
  },
  soccer: {
    name: "スーパーロボットサッカー",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    illustration: (
      <svg viewBox="0 0 90 80" width="86" height="76">
        <g
          fill="#FFFFFF"
          stroke="#2E0A1A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        >
          <circle cx="45" cy="10" r="3" />
          <line x1="45" y1="12" x2="45" y2="22" strokeWidth="2" />
          <rect x="28" y="22" width="34" height="22" rx="3" />
          <circle cx="37" cy="33" r="2.5" fill="#6B1F3A" stroke="none" />
          <circle cx="53" cy="33" r="2.5" fill="#6B1F3A" stroke="none" />
          <rect
            x="38"
            y="38"
            width="14"
            height="2"
            fill="#6B1F3A"
            stroke="none"
          />
          <rect x="18" y="46" width="54" height="18" rx="3" />
          <circle cx="28" cy="68" r="7" />
          <circle cx="45" cy="68" r="7" />
          <circle cx="62" cy="68" r="7" />
          <circle cx="28" cy="68" r="2" fill="#6B1F3A" stroke="none" />
          <circle cx="45" cy="68" r="2" fill="#6B1F3A" stroke="none" />
          <circle cx="62" cy="68" r="2" fill="#6B1F3A" stroke="none" />
        </g>
      </svg>
    ),
  },
  chess: {
    name: "ロボットチェス",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    illustration: (
      <svg viewBox="0 0 100 100" width="62%" height="62%">
        <g
          fill="#FFFFFF"
          stroke="#2E0A1A"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <path d="M30 85 L70 85 L72 78 L28 78 Z" />
          <path d="M32 78 C 32 60, 40 55, 44 50 C 40 48, 38 44, 40 38 C 34 42, 28 42, 24 36 C 30 28, 42 18, 58 20 C 72 22, 78 38, 76 56 C 76 66, 72 74, 68 78 Z" />
          <circle cx="54" cy="36" r="2" fill="#2E0A1A" stroke="none" />
        </g>
      </svg>
    ),
  },
  arm: {
    name: "ロボットアーム",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    illustration: (
      <svg viewBox="0 0 100 100" width="70%" height="70%">
        <g
          fill="#FFFFFF"
          stroke="#2E0A1A"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <rect x="20" y="80" width="60" height="10" rx="2" />
          <rect x="36" y="55" width="14" height="30" />
          <circle cx="43" cy="55" r="6" />
          <rect
            x="42"
            y="30"
            width="32"
            height="12"
            rx="2"
            transform="rotate(-30 58 36)"
          />
          <circle cx="55" cy="48" r="5" />
          <path d="M72 22 L82 22 L84 30 L70 30 Z" />
        </g>
      </svg>
    ),
  },
};

export default function TicketPage() {
  const exhibitId =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("exhibitId") ??
        "switch")
      : "switch";

  const currentInfo = EXHIBIT_INFO[exhibitId] || EXHIBIT_INFO.switch;

  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [nowServing, setNowServing] = useState(0);
  const [currentNumber, setCurrentNumber] = useState(0);
  const [ready, setReady] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [calledAt, setCalledAt] = useState<Date | null>(null);
  const profileRef = useRef<{ userId: string } | null>(null);

  useEffect(() => {
    if (!exhibitId) return;
    const ticketRef = doc(db, "tickets", exhibitId);
    const unsubscribe = onSnapshot(ticketRef, (snap) => {
      if (snap.exists()) {
        setNowServing(snap.data().nowServing || 0);
        setCurrentNumber(snap.data().currentNumber || 0);
      }
    });

    const initLiff = async () => {
      await liff.init({ liffId: "2009242984-XYO590kr" });
      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }
      const profile = await liff.getProfile();
      profileRef.current = { userId: profile.userId };
      checkMyTicket(profile.userId);
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
    if (!profileRef.current) return;
    setIsIssuing(true);
    setIssueError(null);
    try {
      const { userId } = profileRef.current;
      const ticketRef = doc(db, "tickets", exhibitId);
      let newNumber = 0;
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ticketRef);
        newNumber = (snap.data()?.currentNumber || 0) + 1;
        transaction.set(
          ticketRef,
          { currentNumber: newNumber },
          { merge: true },
        );
        transaction.set(doc(db, "users", userId, "myTickets", exhibitId), {
          ticketNumber: newNumber,
          exhibitName: exhibitId,
          issuedAt: new Date(),
        });
        transaction.set(
          doc(db, "active_tickets", `${exhibitId}_${newNumber}`),
          {
            userId,
            exhibitId,
            ticketNumber: newNumber,
          },
        );
      });
      setTicketNumber(newNumber);
    } catch (e) {
      console.error("issueTicket error:", e);
      setIssueError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsIssuing(false);
    }
  };

  const isCalled = ticketNumber !== null && currentNumber >= ticketNumber;

  // 呼び出された時刻を記録
  useEffect(() => {
    if (isCalled && !calledAt) {
      setCalledAt(new Date());
    }
  }, [isCalled, calledAt]);

  return (
    <main
      className="min-h-screen bg-[#2E0A1A] text-white p-6 flex items-center justify-center"
      style={{ fontFamily: '"Noto Sans JP", system-ui, sans-serif' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
      `}</style>

      <div className="w-full max-w-xs">
        <div
          className="relative"
          style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.35))" }}
        >
          {/* チケットボディ */}
          <div
            className="bg-[#6B1F3A] px-4 pt-5 pb-7.5 rounded-3xl rounded-b-none relative"
            style={{
              WebkitMaskImage:
                "radial-gradient(18px at 50% 0, transparent 98%, black 100%)",
              maskImage:
                "radial-gradient(18px at 50% 0, transparent 98%, black 100%)",
            }}
          >
            {/* チケット画像 */}
            <div className="relative bg-[#8E2D47] rounded-lg overflow-hidden aspect-square mb-5.5">
              {/* チェッカーパターン */}
              <div
                className="absolute inset-0 opacity-55"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #B54560 25%, transparent 25%),
                    linear-gradient(-45deg, #B54560 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #B54560 75%),
                    linear-gradient(-45deg, transparent 75%, #B54560 75%)
                  `,
                  backgroundSize: "40px 40px",
                  backgroundPosition: "0 0, 0 20px, 20px -20px, -20px 0px",
                }}
              />
              {/* フィールドライン */}
              {exhibitId === "soccer" && (
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <g
                    fill="none"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="0.6"
                  >
                    <rect x="3" y="3" width="94" height="94" />
                    <line x1="50" y1="3" x2="50" y2="97" />
                    <circle cx="50" cy="50" r="12" />
                    <rect x="3" y="30" width="16" height="40" />
                    <rect x="81" y="30" width="16" height="40" />
                  </g>
                </svg>
              )}
              {/* イラスト */}
              <div className="absolute inset-0 flex items-center justify-center">
                {currentInfo.illustration}
              </div>
            </div>

            {/* タイトル */}
            <h2
              className="text-[30px] font-black leading-5 mb-4 whitespace-pre-line"
              style={{ letterSpacing: "0.01em" }}
            >
              {currentInfo.name}
            </h2>

            {/* ロケーション */}
            <div className="flex items-center gap-1.5 mb-6 text-xs font-medium">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
              </svg>
              {currentInfo.location}
            </div>

            {/* グリッド */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div>
                <div className="text-xs font-medium mb-1.5">現在案内中：</div>
                <div className="bg-[#4F1128] rounded aspect-square flex items-center justify-center text-[42px] font-bold leading-none">
                  {currentNumber}
                </div>
              </div>
              {!ready ? (
                <div>
                  <div className="text-xs font-medium mb-1.5 text-white/75">
                    —
                  </div>
                  <div className="bg-transparent border-[2.5px] border-white rounded aspect-square flex items-center justify-center text-[42px] font-bold leading-none">
                    —
                  </div>
                </div>
              ) : ticketNumber ? (
                <div>
                  <div className="text-xs font-medium mb-1.5">
                    あなたの番号：
                  </div>
                  <div className="bg-transparent border-[2.5px] border-white rounded aspect-square flex items-center justify-center text-[42px] font-bold leading-none">
                    {ticketNumber}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-medium mb-1.5">待ち人数：</div>
                  <div className="bg-transparent border-[2.5px] border-white rounded aspect-square flex items-center justify-center">
                    <span className="text-[36px] font-bold">
                      {Math.max(0, nowServing - currentNumber)}
                    </span>
                    <span className="text-sm font-bold ml-1">人</span>
                  </div>
                </div>
              )}
            </div>

            {/* コンテンツ */}
            {isCalled ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key="called"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div
                    className="bg-[#FFE08A] text-[#4F1128] py-3.5 px-3.5 rounded text-center font-black text-lg"
                    style={{ letterSpacing: "0.04em" }}
                  >
                    順番になりました！
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-white/75">
                    受付までお越しください。お待ちしております！
                  </p>
                  {calledAt && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-white/60 mb-2">
                        呼び出し時刻：
                        {calledAt.toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm font-black leading-relaxed text-[#FFE08A]">
                        【注意】
                        <br />
                        １時間以内に企画場所へお並びください。
                        <br />
                        大幅に過ぎた場合、失効扱いとします。
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            ) : ticketNumber ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key="issued"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <p className="text-xs font-medium leading-relaxed text-white/75">
                    順番になりましたら精密Lab 公式LINEから通知いたします！
                  </p>
                </motion.div>
              </AnimatePresence>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key="not-issued"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  {issueError && (
                    <p className="text-xs text-[#FFE08A] break-words">
                      {issueError}
                    </p>
                  )}
                  <button
                    onClick={issueTicket}
                    disabled={isIssuing}
                    className="w-full bg-white text-[#6B1F3A] py-4 rounded text-lg font-bold transition-transform active:scale-95 disabled:opacity-50"
                    style={{ letterSpacing: "0.04em" }}
                  >
                    {isIssuing ? "発行中..." : "整理券を受け取る"}
                  </button>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* チケットフッター */}
          <svg
            className="w-full h-10"
            viewBox="0 0 340 40"
            preserveAspectRatio="none"
            style={{ display: "block" }}
          >
            {/* 背景 */}
            <rect width="340" height="40" fill="#6B1F3A" />

            {/* 左下の大きい四分円（弦が底辺） */}
            <circle cx="0" cy="40" r="40" fill="#2E0A1A" />

            {/* 小さい半円 9個（弦が底辺、弧がチケット内側） */}
            <circle cx="70" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="95" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="120" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="145" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="170" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="195" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="220" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="245" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="270" cy="40" r="10" fill="#2E0A1A" />

            {/* 右下の大きい四分円（弦が底辺） */}
            <circle cx="340" cy="40" r="40" fill="#2E0A1A" />
          </svg>
        </div>
      </div>
    </main>
  );
}

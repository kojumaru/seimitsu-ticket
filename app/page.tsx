"use client";

import { useEffect, useRef, useState } from "react";
import liff from "@line/liff";
import { db, auth } from "./lib/firebase";
import { doc, getDoc, onSnapshot, runTransaction } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { notifyIssueTicket } from "./actions/notify";

const EXHIBIT_INFO: Record<
  string,
  {
    location: string;
    name: string;
    timePerPerson: number;
    imageUrl?: string;
    schedules?: string[];
    illustration?: React.ReactNode;
  }
> = {
  switch: {
    name: "せいみつスイッチ",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/switch.png",
    schedules: ["16日（土）~16:00", "17日（日）~18:00"],
  },
  soccer: {
    name: "スーパー\nロボットサッカー",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/soccer.png",
    schedules: ["16日（土）~16:00", "17日（日）~18:00"],
  },
  arm: {
    name: "ワームホール\nロボットアーム",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/arm.png",
    schedules: ["16日（土）~16:00", "17日（日）~18:00"],
  },
  pong: {
    name: "せいみつPONG!",
    location: "14号館 1階142教室",
    timePerPerson: 5,
    imageUrl: "/images/pong.png",
    schedules: ["16日（土）~16:00", "17日（日）~18:00"],
  },
  shooting: {
    name: "お絵描きシューティング",
    location: "14号館 1階142教室",
    timePerPerson: 5,
    imageUrl: "/images/shooting.png",
    schedules: ["16日（土）~16:00", "17日（日）~18:00"],
  },
  tank: {
    name: "ARタンク",
    location: "14号館 1階142教室",
    timePerPerson: 5,
    imageUrl: "/images/tank.png",
    schedules: ["16日（土）~16:00", "17日（日）~18:00"],
  },
  room: {
    name: "現実拡張空間",
    location: "14号館 3階146教室",
    timePerPerson: 5,
    imageUrl: "/images/room.png",
    schedules: ["16日（土）~16:00", "17日（日）~18:00"],
  },
  truck: {
    name: "ジャングル・スコープ",
    location: "14号館 3階146教室",
    timePerPerson: 5,
    imageUrl: "/images/truck.png",
    schedules: ["16日（土）~16:00", "17日（日）~18:00"],
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
  const [nowServing, setNowServing] = useState<number | null>(null);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [distributionEnabled, setDistributionEnabled] = useState<boolean>(true);
  const [ready, setReady] = useState(false);
  const [liffReady, setLiffReady] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [notifyWarning, setNotifyWarning] = useState<string | null>(null);
  const [calledAt, setCalledAt] = useState<Date | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const profileRef = useRef<{ userId: string } | null>(null);

  useEffect(() => {
    if (!exhibitId) return;
    fetch(`/api/tickets?id=${exhibitId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setNowServing(data.nowServing ?? null);
          setCurrentNumber(data.currentNumber ?? null);
          setDistributionEnabled(data.distributionEnabled ?? true);
        }
        setIsLoadingData(false);
      })
      .catch(() => setIsLoadingData(false));
  }, [exhibitId]);

  useEffect(() => {
    if (!exhibitId) return;

    const CACHE_KEY = "liff_userId";

    const initLiff = async () => {
      const cachedUserId = localStorage.getItem(CACHE_KEY);

      if (cachedUserId) {
        // キャッシュあり: Firebase認証だけ先に済ませてすぐ番号表示
        await signInAnonymously(auth);
        profileRef.current = { userId: cachedUserId };
        checkMyTicket(cachedUserId);
        setReady(true);

        // LIFF初期化は並行して実行（発行ボタン用）
        await liff.init({ liffId: "2009242984-XYO590kr" });
        if (!liff.isLoggedIn()) {
          localStorage.removeItem(CACHE_KEY);
          liff.login();
          return;
        }
      } else {
        // キャッシュなし: liff.init と signInAnonymously を並列実行
        await Promise.all([
          liff.init({ liffId: "2009242984-XYO590kr" }),
          signInAnonymously(auth),
        ]);

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        const userId = profile.userId;
        localStorage.setItem(CACHE_KEY, userId);
        profileRef.current = { userId };
        checkMyTicket(userId);
        setReady(true);
      }

      setLiffReady(true);
    };

    const initializeData = async () => {
      try {
        await initLiff();
      } catch (error) {
        console.error("LIFF初期化エラー:", error);
        setIssueError("読み込みに失敗しました。LINEアプリで開き直してください。");
        return;
      }

      // 認証後、リアルタイムリスナーを設定
      const ticketRef = doc(db, "tickets", exhibitId);
      const unsubscribe = onSnapshot(
        ticketRef,
        (snap) => {
          if (snap.exists()) {
            setNowServing(snap.data().nowServing ?? null);
            setCurrentNumber(snap.data().currentNumber ?? null);
            setDistributionEnabled(snap.data().distributionEnabled ?? true);
            // 呼び出し時刻を取得
            const calledAtData = snap.data().currentNumber_called_at;
            if (calledAtData && !calledAt) {
              setCalledAt(
                calledAtData.toDate
                  ? calledAtData.toDate()
                  : new Date(calledAtData),
              );
            }
          }
        },
        (error) => {
          console.error("onSnapshot error:", error);
        },
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

  const checkMyTicket = async (uid: string) => {
    const userRef = doc(db, "users", uid, "myTickets", exhibitId);
    const snap = await getDoc(userRef);
    if (snap.exists()) setTicketNumber(snap.data().ticketNumber);
  };

  const issueTicket = async () => {
    if (!profileRef.current) return;
    if (ticketNumber !== null) return;
    if (!distributionEnabled) {
      setIssueError("現在整理券の配布は終了しています。");
      return;
    }
    const { userId } = profileRef.current;
    setIsIssuing(true);
    setIssueError(null);
    try {
      const ticketRef = doc(db, "tickets", exhibitId);
      let newNumber = 0;
      await runTransaction(db, async (transaction) => {
        const myTicketRef = doc(db, "users", userId, "myTickets", exhibitId);
        const myTicketSnap = await transaction.get(myTicketRef);
        if (myTicketSnap.exists()) throw new Error("ALREADY_ISSUED");

        const snap = await transaction.get(ticketRef);
        newNumber = (snap.data()?.nowServing ?? 0) + 1;
        transaction.update(ticketRef, { nowServing: newNumber });
        transaction.set(myTicketRef, {
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

      // 整理券取得通知を送信（失敗しても整理券取得自体は成功扱い）
      notifyIssueTicket(userId, exhibitId).catch((e) => {
        console.error("notifyIssueTicket error:", e);
        setNotifyWarning("LINE通知の送信に失敗しました。順番になったら運営スタッフにお知らせください。");
      });
    } catch (e) {
      if (e instanceof Error && e.message === "ALREADY_ISSUED") {
        await checkMyTicket(userId);
        return;
      }
      console.error("issueTicket error:", e);
      setIssueError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsIssuing(false);
    }
  };

  const isCalled =
    ticketNumber !== null &&
    currentNumber !== null &&
    currentNumber >= ticketNumber;

  // 呼び出された時刻を記録（Firestoreから取得できない場合のフォールバック）
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
            <div className="relative bg-[#8E2D47] rounded-lg overflow-hidden aspect-square mb-3">
              {/* イラスト */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={currentInfo.imageUrl}
                  alt={currentInfo.name}
                  className="w-4/5 h-4/5 object-cover"
                />
              </div>
            </div>

            {/* タイトル */}
            <h2
              className="text-[30px] font-black leading-relaxed mb-4 whitespace-pre-line"
              style={{ letterSpacing: "0.01em" }}
            >
              {currentInfo.name}
            </h2>

            {/* ロケーション */}
            <div className="flex items-center gap-1.5 mb-6 text-sm font-medium">
              <svg
                className="w-4 h-4 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
              </svg>
              {currentInfo.location}
            </div>

            {/* グリッド */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className="flex flex-col gap-2.5">
                <div>
                  <div className="text-xs font-medium mb-1.5">現在案内中：</div>
                  <div className="bg-[#4F1128] rounded h-18 flex items-center justify-center text-[42px] font-bold leading-none">
                    {currentNumber === null ? (
                      <span className="text-lg">取得中...</span>
                    ) : (
                      <>
                        <span>~</span>
                        <span>{currentNumber}</span>
                        <span className="text-sm font-bold ml-1">番</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium mb-1.5">
                    待ち時間目安：
                  </div>
                  <div className="bg-[#4F1128] rounded h-18 flex items-center justify-center text-[42px] font-bold leading-none">
                    {!ready ? (
                      <span className="text-lg">LINE認証中...</span>
                    ) : currentNumber === null ? (
                      <span className="text-lg">取得中</span>
                    ) : (
                      <>
                        <span className="text-lg">約</span>
                        <span className="mx-1">
                          {nowServing !== null && currentNumber !== null
                            ? currentInfo.timePerPerson *
                              Math.max(0, (ticketNumber ?? nowServing) - currentNumber)
                            : "取得中"}
                        </span>
                        <span className="text-lg">分</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {!ready ? (
                <div className="mt-6">
                  <div className="text-xs font-medium mb-1.5 text-white/75">
                    あなたの番号：
                  </div>
                  <div className="bg-transparent border-[2.5px] border-white rounded aspect-square flex items-center justify-center text-[42px] font-bold leading-none">
                    <span className="text-sm">LINE認証中...</span>
                  </div>
                </div>
              ) : ticketNumber ? (
                <div className="mt-6">
                  <div className="text-xs font-medium mb-1.5">
                    あなたの番号：
                  </div>
                  <div className="bg-transparent border-[2.5px] border-white rounded aspect-square flex items-center justify-center text-[42px] font-bold leading-none">
                    <span>{ticketNumber}</span>
                    <span className="text-sm font-bold ml-1">番</span>
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  <div className="text-xs font-medium mb-1.5">待ち人数：</div>
                  <div className="bg-transparent border-[2.5px] border-white rounded aspect-square flex items-center justify-center text-[36px] font-bold">
                    {nowServing === null || currentNumber === null ? (
                      <span className="text-lg">取得中...</span>
                    ) : (
                      <>
                        <span>{Math.max(0, nowServing - currentNumber)}</span>
                        <span className="text-sm font-bold ml-1">人</span>
                      </>
                    )}
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
                    企画場所までお越しください！お待ちしております！
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
                  {notifyWarning && (
                    <p className="text-xs text-[#FFE08A] break-words">
                      {notifyWarning}
                    </p>
                  )}
                  <p className="text-xs font-medium leading-relaxed text-white/75">
                    順番になりましたら公式LINEから通知いたします！
                    <br />
                    ※お呼び出しから１時間を経過した整理券は
                    <br />
                    無効となる場合があります。ご注意ください。
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
                    disabled={isIssuing || !liffReady || isLoadingData || !distributionEnabled}
                    className="w-full bg-white text-[#6B1F3A] py-4 rounded text-lg font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ letterSpacing: "0.04em" }}
                  >
                    {!liffReady || isLoadingData ? "読み込み中..." : isIssuing ? "発行中..." : !distributionEnabled ? "配布終了" : "整理券を受け取る"}
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
            <circle cx="58" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="86" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="114" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="142" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="170" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="198" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="226" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="254" cy="40" r="10" fill="#2E0A1A" />
            <circle cx="282" cy="40" r="10" fill="#2E0A1A" />

            {/* 右下の大きい四分円（弦が底辺） */}
            <circle cx="340" cy="40" r="40" fill="#2E0A1A" />
          </svg>
        </div>
      </div>
    </main>
  );
}

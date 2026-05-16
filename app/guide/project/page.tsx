"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { COLORS, CONFIG, DEFAULTS, MESSAGES } from "../../lib/constants";
import { LocationIcon, CalendarIcon } from "../../components/icons";

const EXHIBITS = [
  {
    id: "soccer",
    name: "スーパー\nロボットサッカー",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/soccer.png",
    schedules: ["16日（土）~16:00", "17日（日）~18:00"],
  },
  {
    id: "arm",
    name: "ワームホール\nロボットアーム",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/arm.png",
    schedules: ["16日（土）~16:00", "17日（日）~18:00"],
  },
  {
    id: "switch",
    name: "せいみつスイッチ",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/switch.png",
    schedules: ["16日（土）~16:00", "17日（日）~18:00"],
  },
];

interface TicketData {
  nowServing: number | null;
  currentNumber: number | null;
  distributionEnabled: boolean;
}

function ExhibitCard({ exhibit }: { exhibit: (typeof EXHIBITS)[0] }) {
  const [ticketData, setTicketData] = useState<TicketData>({
    nowServing: null,
    currentNumber: null,
    distributionEnabled: DEFAULTS.distributionEnabled,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    // Step 1: APIから初期データを取得（高速）
    const fetchInitialData = async () => {
      try {
        const response = await fetch(`/api/tickets?id=${exhibit.id}`);
        if (response.ok && isMounted) {
          const data = await response.json();
          setTicketData({
            nowServing: data.nowServing ?? null,
            currentNumber: data.currentNumber ?? null,
            distributionEnabled: data.distributionEnabled ?? DEFAULTS.distributionEnabled,
          });
        }
      } catch (error) {
        console.error("Failed to fetch initial ticket data:", error);
      }
    };

    // Step 2: 認証完了後、リアルタイム更新をリッスン
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const ref = doc(db, CONFIG.firebase.ticketsCollection, exhibit.id);
        unsubscribe = onSnapshot(ref, (snap) => {
          if (snap.exists() && isMounted) {
            setTicketData({
              nowServing: snap.data().nowServing ?? null,
              currentNumber: snap.data().currentNumber ?? null,
              distributionEnabled: snap.data().distributionEnabled ?? DEFAULTS.distributionEnabled,
            });
          }
        });
      }
    });

    // 初期データ取得を開始
    fetchInitialData();

    return () => {
      isMounted = false;
      unsubscribeAuth();
      if (unsubscribe) unsubscribe();
    };
  }, [exhibit.id]);

  const waitCount =
    ticketData.nowServing !== null && ticketData.currentNumber !== null
      ? Math.max(0, ticketData.nowServing - ticketData.currentNumber)
      : null;
  const url = `${CONFIG.line.liffUrlBase}?exhibitId=${exhibit.id}`;

  return (
    <div
      className="w-full max-w-sm text-white relative"
      style={{ filter: "drop-shadow(0 16px 32px rgba(0,0,0,0.25))" }}
    >
      {/* チケット上部（ダークレッド） */}
      <div className={`px-4 pt-4 pb-4 relative overflow-hidden rounded-t-3xl`} style={{ backgroundColor: COLORS.darkRed }}>
        {/* 側面ノッチ（切り込み）*/}
        <div
          className="absolute left-0 top-0 bottom-0 w-3 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle ${CONFIG.pattern.notchSize}px at ${CONFIG.pattern.notchSize}px center, transparent ${CONFIG.pattern.notchSize}px, ${COLORS.darkRed} ${CONFIG.pattern.notchSize}px)`,
            backgroundSize: `${CONFIG.pattern.notchSpacing}px ${CONFIG.pattern.notchSpacing}px`,
            backgroundPosition: "0 0",
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-3 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle ${CONFIG.pattern.notchSize}px at -${CONFIG.pattern.notchSize}px center, transparent ${CONFIG.pattern.notchSize}px, ${COLORS.darkRed} ${CONFIG.pattern.notchSize}px)`,
            backgroundSize: `${CONFIG.pattern.notchSpacing}px ${CONFIG.pattern.notchSpacing}px`,
            backgroundPosition: "0 0",
          }}
        />

        {/* チケット画像 */}
        <div className="relative rounded-2xl overflow-hidden aspect-square mb-4 mx-auto max-w-xs" style={{ backgroundColor: COLORS.mediumRed }}>
          {/* チェッカーパターン */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: `
                linear-gradient(45deg, ${COLORS.lightRed} 25%, transparent 25%),
                linear-gradient(-45deg, ${COLORS.lightRed} 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, ${COLORS.lightRed} 75%),
                linear-gradient(-45deg, transparent 75%, ${COLORS.lightRed} 75%)
              `,
              backgroundSize: `${CONFIG.pattern.checkerSize}px ${CONFIG.pattern.checkerSize}px`,
              backgroundPosition: "0 0, 0 16px, 16px -16px, -16px 0px",
            }}
          />
          {/* 画像 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src={exhibit.imageUrl}
              alt={exhibit.name}
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* タイトル */}
        <h2
          className="text-2xl font-black leading-tight mb-3 whitespace-pre-line text-center min-h-16 flex items-center justify-center"
          style={{ letterSpacing: "0.02em" }}
        >
          {exhibit.name}
        </h2>

        {/* ロケーション */}
        <div className="flex items-center justify-center gap-1.5 mb-3 text-xs font-bold">
          <LocationIcon />
          {exhibit.location}
        </div>

        {/* 日程 */}
        <div className="mb-3">
          <div className="flex items-center justify-center gap-1.5 mb-2 text-xs font-bold">
            <CalendarIcon />
            <div className="text-left">
              {exhibit.schedules.map((schedule, i) => (
                <div key={i}>{schedule}</div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white text-center px-1 font-bold">
            {MESSAGES.ticketDeadlineInfo}
          </p>
        </div>

        {/* 待ち時間・現在案内中バナー */}
        <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-2.5 mb-3 text-center w-full">
          <div className="text-base font-bold space-y-1">
            <div>
              {MESSAGES.waitTimeLabel}
              {ticketData.currentNumber === null ? (
                <span>{MESSAGES.loading}</span>
              ) : (
                <span>
                  約{" "}
                  {waitCount !== null
                    ? exhibit.timePerPerson * waitCount
                    : MESSAGES.loading}
                  {MESSAGES.minutes}
                </span>
              )}
            </div>
            <div>
              {MESSAGES.servingLabel} ~{ticketData.currentNumber === null ? MESSAGES.loading : ticketData.currentNumber}番
            </div>
          </div>
        </div>
      </div>

      {/* チケットセパレーター（波型） */}
      <div
        className="h-0"
        style={{
          backgroundColor: COLORS.darkRed,
          WebkitMaskImage: `radial-gradient(circle ${CONFIG.pattern.notchSize}px at 50% 0, transparent 99%, #000 100%) center bottom / ${CONFIG.pattern.notchSpacing}px 100% repeat-x`,
          maskImage: `radial-gradient(circle ${CONFIG.pattern.notchSize}px at 50% 0, transparent 99%, #000 100%) center bottom / ${CONFIG.pattern.notchSpacing}px 100% repeat-x`,
        }}
      />

      {/* チケット下部（クリーム色） */}
      <div className="px-4 py-4 flex flex-col items-center gap-1 rounded-b-3xl" style={{ backgroundColor: COLORS.cream }}>
        {ticketData.distributionEnabled === false ? (
          <div className="rounded-xl px-6 py-4 text-center w-full" style={{ backgroundColor: COLORS.mediumRed }}>
            <p className="text-white text-xl font-black">{MESSAGES.serving}</p>
            <p className="text-white/80 text-xs mt-1">
              {MESSAGES.noTicketRequired}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white p-2.5 rounded-lg">
              <QRCodeSVG value={url} size={100} />
            </div>
            <p className="text-center text-xs font-bold" style={{ color: COLORS.darkRed }}>
              {MESSAGES.scanQR}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: COLORS.bgRed,
        fontFamily: '"Noto Sans JP", system-ui, sans-serif',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
      `}</style>

      {/* ヘッダーバナー */}
      <div className="px-8 py-8" style={{ backgroundColor: COLORS.bgRed }}>
        <div className="w-full max-w-7xl mx-auto flex justify-between items-start gap-8">
          {/* 左側 */}
          <div className="flex-1">
            <h1
              className="text-5xl font-black text-white mb-3"
              style={{ letterSpacing: "0.05em" }}
            >
              {MESSAGES.ticketDistributionTitle}
            </h1>
            <p className="text-2xl font-bold text-white">
              {MESSAGES.ticketDistributionSubtitle}
            </p>
          </div>

          {/* 右側 */}
          <div className="flex-1 text-right">
            <p className="text-xs text-white leading-relaxed text-justify whitespace-pre-wrap font-bold">
              {`【整理券発行に関するご案内】\n本システムでは、混雑緩和と呼び出し通知のためにLINEユーザー識別子を利用します。\n   使用目的：順番待ちの管理及び公式LINEからの呼び出し通知に使用します。\n   情報の破棄：五月祭終了後、全てのデータは速やかに完全消去されます。\n   その他：五月祭以外の目的の利用や第三者への提供は一切行いません。\n本システムの利用には上記への同意が必須となります。`}
            </p>
          </div>
        </div>
      </div>

      {/* LINEカメラ案内バナー */}
      <div className="px-8 pb-4">
        <div className="w-full max-w-7xl mx-auto bg-[#FFE08A] text-[#4F1128] rounded-xl px-5 py-3 text-center font-bold text-sm">
          ⚠️ QRコードは必ず<span className="text-base font-black">LINEアプリのカメラ</span>で読み取ってください
          <br />
          <span className="text-xs font-medium">うまく読み取れない場合はLINEを再起動してお試しください</span>
        </div>
      </div>

      {/* カード一覧 */}
      <div className="flex-1 px-6 -mt-5 flex flex-col items-center justify-center">
        <div className="w-full max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXHIBITS.map((exhibit) => (
              <ExhibitCard key={exhibit.id} exhibit={exhibit} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

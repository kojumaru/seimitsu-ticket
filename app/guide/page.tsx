"use client";

import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";

const EXHIBITS = [
  {
    id: "soccer",
    name: "スーパー\nロボットサッカー",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/soccer.png",
    schedules: ["16日（土）10:00-16:00", "17日（日）10:00-18:00"],
  },
  {
    id: "chess",
    name: "ロボット\nチェス",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/chess.png",
    schedules: ["16日（土）10:00-16:00", "17日（日）10:00-18:00"],
  },
  {
    id: "arm",
    name: "ロボット\nアーム",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/arm.png",
    schedules: ["16日（土）10:00-16:00", "17日（日）10:00-18:00"],
  },
  {
    id: "switch",
    name: "せいみつ\nスイッチ",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/switch.png",
    schedules: ["16日（土）10:00-16:00", "17日（日）10:00-18:00"],
  },
];

function ExhibitCard({ exhibit }: { exhibit: (typeof EXHIBITS)[0] }) {
  const [nowServing, setNowServing] = useState<number | null>(null);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);

  useEffect(() => {
    const ref = doc(db, "tickets", exhibit.id);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setNowServing(snap.data().nowServing ?? null);
        setCurrentNumber(snap.data().currentNumber ?? null);
      }
    });
    return () => unsubscribe();
  }, [exhibit.id]);

  const waitCount = (nowServing !== null && currentNumber !== null) ? Math.max(0, nowServing - currentNumber) : null;
  const url = `https://liff.line.me/2009242984-XYO590kr?exhibitId=${exhibit.id}`;

  return (
    <div
      className="w-full max-w-sm text-white relative"
      style={{ filter: "drop-shadow(0 16px 32px rgba(0,0,0,0.25))" }}
    >
      {/* チケット上部（ダークレッド） */}
      <div className="bg-[#6B1F3A] px-4 pt-4 pb-6 relative overflow-hidden">
        {/* 側面ノッチ（切り込み）*/}
        <div
          className="absolute left-0 top-0 bottom-0 w-3 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle 6px at 6px center, transparent 6px, #6B1F3A 6px)",
            backgroundSize: "12px 12px",
            backgroundPosition: "0 0",
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-3 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle 6px at -6px center, transparent 6px, #6B1F3A 6px)",
            backgroundSize: "12px 12px",
            backgroundPosition: "0 0",
          }}
        />

        {/* チケット画像 */}
        <div className="relative bg-[#8E2D47] rounded-2xl overflow-hidden aspect-square mb-4 mx-auto max-w-xs">
          {/* チェッカーパターン */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #B54560 25%, transparent 25%),
                linear-gradient(-45deg, #B54560 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #B54560 75%),
                linear-gradient(-45deg, transparent 75%, #B54560 75%)
              `,
              backgroundSize: "32px 32px",
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
          className="text-2xl font-black leading-tight mb-3 whitespace-pre-line text-center"
          style={{ letterSpacing: "0.02em" }}
        >
          {exhibit.name}
        </h2>

        {/* ロケーション */}
        <div className="flex items-center justify-center gap-1.5 mb-3 text-xs font-medium">
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
          </svg>
          {exhibit.location}
        </div>

        {/* 日程 */}
        <div className="flex items-center justify-center gap-1.5 mb-4 text-xs font-medium">
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H7zm0-2h10a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm2 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm2 5a1 1 0 1 0-2 0v2a1 1 0 1 0 2 0v-2z" />
          </svg>
          <div className="text-left">
            <div>{exhibit.schedules[0]}</div>
            <div>{exhibit.schedules[1]}</div>
          </div>
        </div>

        {/* 待ち人数バナー */}
        <div className="bg-white/20 backdrop-blur rounded-xl px-3 py-2.5 mb-3 text-center">
          <div className="text-sm font-bold">
            {currentNumber === null ? (
              <span>待ち人数: 取得中...</span>
            ) : (
              <span>待ち人数: {waitCount} 人</span>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="text-center text-xs font-medium text-white/80 space-y-1">
          <div>現在案内中: {currentNumber === null ? "取得中..." : currentNumber}番</div>
          <div>待ち時間目安: {exhibit.timePerPerson}分</div>
        </div>
      </div>

      {/* チケットセパレーター（波型） */}
      <div
        className="h-4 bg-[#6B1F3A]"
        style={{
          WebkitMaskImage:
            "radial-gradient(circle 6px at 50% 0, transparent 99%, #000 100%) center bottom / 12px 100% repeat-x",
          maskImage:
            "radial-gradient(circle 6px at 50% 0, transparent 99%, #000 100%) center bottom / 12px 100% repeat-x",
        }}
      />

      {/* チケット下部（クリーム色） */}
      <div className="bg-[#F2E7E0] px-4 py-4 flex flex-col items-center gap-2">
        <div className="bg-white p-2.5 rounded-lg">
          <QRCodeSVG value={url} size={100} />
        </div>
        <p className="text-center text-xs font-bold text-[#6B1F3A]">SCAN TO GET TICKET</p>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <main
      className="min-h-screen bg-[#A64C60] p-6 flex flex-col items-center justify-center"
      style={{ fontFamily: '"Noto Sans JP", system-ui, sans-serif' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
      `}</style>

      <div className="w-full max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {EXHIBITS.map((exhibit) => (
            <ExhibitCard key={exhibit.id} exhibit={exhibit} />
          ))}
        </div>
      </div>
    </main>
  );
}

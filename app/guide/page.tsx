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
  },
  {
    id: "chess",
    name: "ロボット\nチェス",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/chess.png",
  },
  {
    id: "arm",
    name: "ロボット\nアーム",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/arm.png",
  },
  {
    id: "switch",
    name: "せいみつ\nスイッチ",
    location: "14号館 3階プロジェクト室",
    timePerPerson: 5,
    imageUrl: "/images/switch.png",
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
    <div className="flex flex-col items-center gap-4">
      <div
        className="w-80 text-white relative"
        style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.35))" }}
      >
        {/* チケットボディ */}
        <div
          className="bg-[#6B1F3A] px-4 pt-5 pb-7.5 rounded-3xl rounded-b-none relative"
          style={{
            WebkitMaskImage: "radial-gradient(18px at 50% 0, transparent 98%, black 100%)",
            maskImage: "radial-gradient(18px at 50% 0, transparent 98%, black 100%)",
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
            className="text-[30px] font-black leading-5 mb-4 whitespace-pre-line"
            style={{ letterSpacing: "0.01em" }}
          >
            {exhibit.name}
          </h2>

          {/* ロケーション */}
          <div className="flex items-center gap-1.5 mb-6 text-sm font-medium">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
            </svg>
            {exhibit.location}
          </div>

          {/* グリッド */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div>
              <div className="text-xs font-medium mb-1.5">現在案内中：</div>
              <div className="bg-[#4F1128] rounded aspect-square flex items-center justify-center text-[42px] font-bold leading-none">
                {currentNumber === null ? <span className="text-lg">取得中...</span> : currentNumber}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium mb-1.5">待ち人数：</div>
              <div className="bg-transparent border-[2.5px] border-white rounded aspect-square flex items-center justify-center text-[36px] font-bold">
                {waitCount === null ? (
                  <span className="text-lg">取得中...</span>
                ) : (
                  <>
                    <span>{waitCount}</span>
                    <span className="text-sm font-bold ml-1">人</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* フッター */}
          <p className="text-xs font-medium leading-relaxed text-white/75">
            QRコードをスキャンして整理券を取得してください
          </p>
        </div>

        {/* チケットフッター（波型） */}
        <div
          className="h-3.5 bg-[#6B1F3A]"
          style={{
            WebkitMaskImage: "radial-gradient(circle 8px at 12px 14px, transparent 99%, #000 100%) center top / 24px 100% repeat-x",
            maskImage: "radial-gradient(circle 8px at 12px 14px, transparent 99%, #000 100%) center top / 24px 100% repeat-x",
            marginTop: "-1px",
          }}
        />
      </div>

      {/* QRコード */}
      <div className="bg-white p-3 rounded-lg">
        <QRCodeSVG value={url} size={120} />
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[#2E0A1A] text-white p-6 flex flex-col items-center justify-center" style={{ fontFamily: '"Noto Sans JP", system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
      `}</style>

      <div className="w-full max-w-7xl flex flex-col gap-8 text-center">
        <header>
          <h1 className="text-3xl font-black tracking-tight mb-2">
            整理券ガイド
          </h1>
          <p className="text-slate-400 text-sm">
            各企画の現在の状況
          </p>
        </header>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {EXHIBITS.map((exhibit) => (
            <ExhibitCard key={exhibit.id} exhibit={exhibit} />
          ))}
        </div>
      </div>
    </main>
  );
}

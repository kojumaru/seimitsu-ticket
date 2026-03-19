"use client";

import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { Clock, MapPin } from "lucide-react";

const EXHIBITS = [
  {
    id: "soccer",
    name: "ロボットサッカー",
    location: "工学部14号館 3階 プロジェクト室",
    timePerPerson: 5,
  },
  {
    id: "chess",
    name: "ロボットチェス",
    location: "工学部14号館 3階 プロジェクト室",
    timePerPerson: 5,
  },
  {
    id: "arm",
    name: "ロボットアーム",
    location: "工学部14号館 3階 プロジェクト室",
    timePerPerson: 5,
  },
  {
    id: "switch",
    name: "せいみつスイッチ",
    location: "工学部14号館 3階 プロジェクト室",
    timePerPerson: 5,
  },
];

function ExhibitCard({ exhibit }: { exhibit: (typeof EXHIBITS)[0] }) {
  const [nowServing, setNowServing] = useState(0);
  const [currentNumber, setCurrentNumber] = useState(0);

  useEffect(() => {
    const ref = doc(db, "tickets", exhibit.id);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setNowServing(snap.data().nowServing || 0);
        setCurrentNumber(snap.data().currentNumber || 0);
      }
    });
    return () => unsubscribe();
  }, [exhibit.id]);

  const waitCount = Math.max(0, currentNumber - nowServing);
  const estimatedTime = waitCount * exhibit.timePerPerson;
  const url = `https://liff.line.me/2009242984-XYO590kr?exhibitId=${exhibit.id}`;

  return (
    <div className="bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] border border-white/10 p-6 flex flex-col items-center gap-4 shadow-2xl w-full">
      <h2 className="text-xl font-black text-white tracking-tight">
        {exhibit.name}
      </h2>
      <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold">
        <MapPin size={12} />
        {exhibit.location}
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-inner">
        <QRCodeSVG value={url} size={160} />
      </div>

      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
        <Clock size={14} className="text-emerald-400" />
        <p className="text-emerald-100 text-sm font-medium">
          待ち時間目安: 約{" "}
          <span className="text-emerald-400 font-bold text-lg">
            {estimatedTime}
          </span>{" "}
          分
        </p>
      </div>

      <div className="flex items-center gap-4 text-slate-400 text-xs">
        <span>
          現在案内中:{" "}
          <span className="text-white font-bold">{nowServing}</span> 番
        </span>
        <span>
          待ち人数:{" "}
          <span className="text-white font-bold">{waitCount}</span> 人
        </span>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-slate-100 p-6 flex flex-col items-center justify-center font-sans">
      {/* 背景装飾 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-6xl z-10 flex flex-col gap-6 text-center">
        <header>
          <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[11px] font-bold tracking-widest uppercase mb-3">
            精密Lab. 整理券システム
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white italic leading-tight">
            整理券 受け取りはこちら
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            QRコードをスキャンして整理券を取得してください
          </p>
        </header>

        <div className="grid grid-cols-4 gap-4">
          {EXHIBITS.map((exhibit) => (
            <ExhibitCard key={exhibit.id} exhibit={exhibit} />
          ))}
        </div>
      </div>
    </main>
  );
}

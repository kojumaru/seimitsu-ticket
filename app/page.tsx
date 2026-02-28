"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";
import { db } from "./lib/firebase"; // パスを最新の状態に合わせました
import { doc, updateDoc, increment, getDoc, setDoc } from "firebase/firestore";

export default function Home() {
  const [userId, setUserId] = useState<string>("");
  const [profileName, setProfileName] = useState("");
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    liff.init({ liffId: "2009242984-XYO590kr" }).then(async () => {
      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        setUserId(profile.userId);
        setProfileName(profile.displayName);

        // 1. すでに整理券を持っているかチェック
        const userRef = doc(db, "users", profile.userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          // 持っていればその番号を表示
          setTicketNumber(userSnap.data().ticketNumber);
        }
      } else {
        liff.login();
      }
      setLoading(false);
    });
  }, []);

  const issueTicket = async () => {
    if (!userId) return;

    // 2. 二重チェック（念のため発行直前にも確認）
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      setTicketNumber(userSnap.data().ticketNumber);
      return;
    }

    // 3. 全体のカウンターを+1して、自分の番号として保存
    const ticketRef = doc(db, "tickets", "seimitsu-lab");

    try {
      // カウンターを更新
      await updateDoc(ticketRef, { currentNumber: increment(1) });
    } catch {
      // 初回のみドキュメントを作成
      await setDoc(ticketRef, { currentNumber: 1 });
    }

    // 更新後の最新番号を取得
    const snap = await getDoc(ticketRef);
    const newNumber = snap.data()?.currentNumber;

    // 4. ユーザー情報としてデータベースに刻印（これで二重発行を防ぐ）
    await setDoc(userRef, {
      displayName: profileName,
      ticketNumber: newNumber,
      issuedAt: new Date(),
    });

    setTicketNumber(newNumber);
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        読み込み中...
      </div>
    );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-blue-50 text-black">
      <h1 className="text-3xl font-bold text-blue-600 mb-8">精密Lab. 整理券</h1>

      {profileName && (
        <p className="mb-4 text-lg">
          こんにちは、<span className="font-bold">{profileName}</span>さん
        </p>
      )}

      {ticketNumber ? (
        <div className="bg-white p-12 rounded-3xl shadow-2xl text-center border-4 border-blue-200">
          <p className="text-gray-500 text-sm mb-2">あなたの整理番号</p>
          <p className="text-8xl font-black text-blue-600 mb-4">
            {ticketNumber}
          </p>
          <p className="text-xs text-gray-400">
            ※この画面をスタッフに提示してください
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="mb-6 text-gray-600">
            整理券を発行して、待ち時間を有効に使いましょう。
          </p>
          <button
            onClick={issueTicket}
            className="bg-blue-500 text-white px-12 py-6 rounded-full font-bold text-2xl shadow-xl hover:bg-blue-600 active:scale-95 transition-all"
          >
            整理券を発行する
          </button>
        </div>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../lib/firebase";
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { notifyUser } from "../actions/notify";

// 企画IDから名前へのマッピング
const EXHIBIT_NAMES: Record<string, string> = {
  pong: "せいみつPONG!",
  shooting: "お絵描きシューティング",
  tank: "ARタンク",
  room: "現実拡張空間",
  truck: "ジャングル・スコープ",
  soccer: "スーパーロボットサッカー",
  chess: "ロボットチェス",
  arm: "ワームホールロボットアーム",
  switch: "せいみつスイッチ",
  "kikaku-a": "企画A",
};

export default function AdminPage() {
  const exhibitId =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("exhibitId") ??
        "kikaku-a")
      : "kikaku-a";

  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [nowServing, setNowServing] = useState(0);
  const [currentNumber, setCurrentNumber] = useState(0);
  const [distributionEnabled, setDistributionEnabled] = useState(true);
  const [loading, setLoading] = useState(false); // 連打防止用
  const [toggleLoading, setToggleLoading] = useState(false); // トグル処理中フラグ
  const [error, setError] = useState<string | null>(null);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        setIsAdmin(adminDoc.exists());
      } else {
        setIsAdmin(false);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestoreリスナー（管理者認証済みのみ）
  useEffect(() => {
    if (!isAdmin || !exhibitId) return;

    const ticketRef = doc(db, "tickets", exhibitId);
    const unsubscribe = onSnapshot(
      ticketRef,
      (snap) => {
        if (snap.exists()) {
          setNowServing(snap.data().nowServing || 0);
          setCurrentNumber(snap.data().currentNumber || 0);
          setDistributionEnabled(snap.data().distributionEnabled ?? true);
        }
      },
      (error) => {
        console.error("onSnapshot error:", error);
      },
    );
    return () => unsubscribe();
  }, [isAdmin, exhibitId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setLoginError("メールアドレスまたはパスワードが正しくありません");
    } finally {
      setLoginLoading(false);
    }
  };

  // エラーメッセージを2秒後に自動消去
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 2000);
  };

  const nextNumber = async () => {
    if (loading) return; // 処理中はガード
    setError(null);

    const newCurrentNumber = currentNumber + 1;

    // エラーチェック：newCurrentNumber > nowServing の場合
    if (newCurrentNumber > nowServing) {
      showError(
        `エラー：まだ整理券が発行されていません。現在案内中: ${currentNumber}番、配布済み: ${nowServing}番`,
      );
      return;
    }

    setLoading(true);

    try {
      const ticketRef = doc(db, "tickets", exhibitId);

      console.log(
        `${exhibitId} の現在案内中を ${newCurrentNumber} に更新します...`,
      );

      // currentNumber を更新（呼び出し時刻も記録）
      await setDoc(
        ticketRef,
        {
          currentNumber: newCurrentNumber,
          currentNumber_called_at: serverTimestamp(),
        },
        { merge: true },
      );

      const activeRef = doc(
        db,
        "active_tickets",
        `${exhibitId}_${newCurrentNumber}`,
      );
      const activeSnap = await getDoc(activeRef);

      if (!activeSnap.exists()) {
        console.log(
          "対象の整理券を発行しているユーザーがいません。通知をスキップします。",
        );
        setLoading(false);
        return;
      }

      const userId = activeSnap.data().userId;

      const result = await notifyUser(userId, newCurrentNumber, exhibitId);

      if (result.ok) {
        console.log("LINE通知に成功しました！");
      } else {
        console.error("LINE通知に失敗しました:", result.error);
      }
    } catch (error) {
      console.error("Firestoreの更新中にエラーが発生しました:", error);
      alert("エラーが発生しました。コンソールを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const toggleDistribution = async (enabled: boolean) => {
    if (toggleLoading) return;
    setToggleLoading(true);

    try {
      const ticketRef = doc(db, "tickets", exhibitId);

      if (enabled) {
        // ON にするだけ
        await setDoc(ticketRef, { distributionEnabled: true }, { merge: true });
        console.log(`${exhibitId} の配布モードを ON に設定しました`);
      } else {
        // OFF にして全配布済みを呼び出し済みに
        // 現在の currentNumber から nowServing までの全員に通知を送る
        const oldCurrentNumber = currentNumber;

        await setDoc(
          ticketRef,
          {
            distributionEnabled: false,
            currentNumber: nowServing,
            currentNumber_called_at: serverTimestamp(),
          },
          { merge: true },
        );
        console.log(
          `${exhibitId} の配布モードを OFF に設定し、currentNumber を ${nowServing} に更新しました`,
        );

        // oldCurrentNumber + 1 から nowServing までの人に通知を送る
        for (let ticketNum = oldCurrentNumber + 1; ticketNum <= nowServing; ticketNum++) {
          try {
            const activeRef = doc(
              db,
              "active_tickets",
              `${exhibitId}_${ticketNum}`,
            );
            const activeSnap = await getDoc(activeRef);

            if (activeSnap.exists()) {
              const userId = activeSnap.data().userId;
              const result = await notifyUser(userId, ticketNum, exhibitId);
              if (result.ok) {
                console.log(`${ticketNum}番の人に通知を送信しました`);
              } else {
                console.error(
                  `${ticketNum}番の人への通知に失敗しました:`,
                  result.error,
                );
              }
            }
          } catch (notifyError) {
            console.error(
              `${ticketNum}番への通知処理中にエラー:`,
              notifyError,
            );
          }
        }
      }
    } catch (error) {
      console.error("配布モード更新中にエラーが発生しました:", error);
      alert("エラーが発生しました。コンソールを確認してください。");
    } finally {
      setToggleLoading(false);
    }
  };

  const exhibitName = EXHIBIT_NAMES[exhibitId] || exhibitId;

  if (!authChecked) {
    return (
      <main className="p-8 bg-[#A64C60]/40 text-white min-h-screen flex items-center justify-center">
        <p>認証確認中...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="p-8 bg-[#A64C60]/40 text-white min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-8">管理者ログイン</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-80">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white"
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white"
          />
          {loginError && (
            <p className="text-red-300 text-sm text-center">{loginError}</p>
          )}
          <button
            type="submit"
            disabled={loginLoading}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${loginLoading ? "bg-white/20 opacity-50 cursor-not-allowed" : "bg-[#8E2D47] hover:bg-[#6B1F3A]"}`}
          >
            {loginLoading ? "ログイン中..." : "ログイン"}
          </button>
        </form>
        <p className="mt-8 text-white/50 text-xs uppercase tracking-tighter">
          Admin Console for Precision Lab.
        </p>
      </main>
    );
  }

  return (
    <main className="p-8 bg-[#A64C60]/40 text-white min-h-screen text-center flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-6">運営ページ（{exhibitName}）</h1>

      {/* エラー表示 */}
      {error && (
        <div className="bg-white/20 border-2 border-white/40 text-white p-4 rounded-xl mb-6 max-w-md">
          {error}
        </div>
      )}

      {/* 現在案内中（メイン） */}
      <div className="mb-12">
        <div className="bg-gradient-to-br from-[#8E2D47] to-[#6B1F3A] p-10 rounded-3xl border-2 border-[#8E2D47] shadow-2xl shadow-[#8E2D47]/50">
          <p className="text-white text-base font-bold mb-4 uppercase tracking-widest">
            呼び出し済み番号
          </p>
          <div className="text-8xl font-mono font-bold text-white leading-none">
            ~{currentNumber}
          </div>
          <div className="text-3xl text-[#F2E7E0] mt-2">番</div>
        </div>
        <div className="bg-[#6B1F3A]/50 backdrop-blur border-2 border-[#8E2D47] rounded-2xl px-8 py-4 mt-6 inline-block">
          <p className="text-2xl font-black text-[#F2E7E0]">
            現在取得されている整理券：{" "}
            <span className="text-4xl text-white">{nowServing}番</span>
          </p>
        </div>
      </div>

      <button
        onClick={nextNumber}
        disabled={loading}
        className={`px-12 py-6 rounded-2xl text-2xl font-black transition-all shadow-xl mb-12
          ${loading ? "bg-white/20 opacity-50 cursor-not-allowed" : "bg-[#8E2D47] hover:bg-[#6B1F3A] active:scale-95"}`}
      >
        {loading ? "更新中..." : "次の番号を呼ぶ"}
      </button>

      {/* 配布モード切り替え（トグルスイッチ） */}
      <div className="flex flex-col items-center gap-6 mb-12">
        <div className="flex items-center gap-6">
          <span
            className={`text-lg font-bold transition-colors ${distributionEnabled ? "text-white" : "text-white/60"}`}
          >
            整理券配布中
          </span>
          <button
            onClick={() => toggleDistribution(!distributionEnabled)}
            disabled={toggleLoading}
            className={`relative w-24 h-12 rounded-full transition-all shadow-lg ${
              distributionEnabled
                ? "bg-[#6B1F3A] hover:bg-[#8E2D47]"
                : "bg-[#8E2D47] hover:bg-[#6B1F3A]"
            } ${toggleLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div
              className={`absolute top-1 w-10 h-10 rounded-full bg-[#F2E7E0] transition-transform duration-300 ${
                distributionEnabled ? "translate-x-1" : "translate-x-13"
              }`}
            />
          </button>
          <span
            className={`text-lg font-bold transition-colors ${!distributionEnabled ? "text-white" : "text-white/60"}`}
          >
            整理券なし
          </span>
        </div>
        <p className="text-white text-lg font-bold">
          {toggleLoading
            ? "更新中..."
            : `現在: ${distributionEnabled ? "整理券配布中" : "整理券なし"}`}
        </p>
      </div>

      <button
        onClick={() => signOut(auth)}
        className="mt-4 text-white/40 text-xs hover:text-white/70 transition-colors"
      >
        ログアウト
      </button>

      <p className="mt-4 text-white/50 text-xs uppercase tracking-tighter">
        Admin Console for Precision Lab.
      </p>
    </main>
  );
}

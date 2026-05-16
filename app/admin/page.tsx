"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../lib/firebase";
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp, writeBatch, deleteField } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { notifyUser } from "../actions/notify";

const EXHIBIT_NAMES: Record<string, string> = {
  pong: "せいみつPONG!",
  shooting: "お絵描きシューティング",
  tank: "ARタンク",
  room: "現実拡張空間",
  truck: "ジャングル・スコープ",
  soccer: "スーパーロボットサッカー",
  arm: "ワームホールロボットアーム",
  switch: "せいみつスイッチ",
};

const EXHIBITS = [
  { id: "switch", name: "せいみつスイッチ", location: "3階プロジェクト室" },
  { id: "soccer", name: "スーパーロボットサッカー", location: "3階プロジェクト室" },
  { id: "arm", name: "ワームホールロボットアーム", location: "3階プロジェクト室" },
  { id: "pong", name: "せいみつPONG!", location: "1階142教室" },
  { id: "shooting", name: "お絵描きシューティング", location: "1階142教室" },
  { id: "tank", name: "ARタンク", location: "1階142教室" },
  { id: "room", name: "現実拡張空間", location: "3階146教室" },
  { id: "truck", name: "ジャングル・スコープ", location: "3階146教室" },
];

interface TicketState {
  nowServing: number;
  currentNumber: number;
  distributionEnabled: boolean;
}

function ExhibitAdminCard({ exhibit }: { exhibit: (typeof EXHIBITS)[0] }) {
  const [state, setState] = useState<TicketState>({
    nowServing: 0,
    currentNumber: 0,
    distributionEnabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(db, "tickets", exhibit.id);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setState({
          nowServing: snap.data().nowServing || 0,
          currentNumber: snap.data().currentNumber || 0,
          distributionEnabled: snap.data().distributionEnabled ?? true,
        });
      }
    });
    return () => unsubscribe();
  }, [exhibit.id]);

  const showCardError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  };

  const nextNumber = async () => {
    if (loading) return;
    const newCurrentNumber = state.currentNumber + 1;
    if (newCurrentNumber > state.nowServing) {
      showCardError("整理券が発行されていません");
      return;
    }
    setLoading(true);
    try {
      const ticketRef = doc(db, "tickets", exhibit.id);
      await setDoc(
        ticketRef,
        { currentNumber: newCurrentNumber, currentNumber_called_at: serverTimestamp() },
        { merge: true },
      );
      const activeRef = doc(db, "active_tickets", `${exhibit.id}_${newCurrentNumber}`);
      const activeSnap = await getDoc(activeRef);
      if (!activeSnap.exists()) {
        showCardError(`${newCurrentNumber}番のデータが見つかりません。口頭でお知らせください。`);
        return;
      }
      const result = await notifyUser(activeSnap.data().userId, newCurrentNumber, exhibit.id);
      if (!result.ok) {
        showCardError(`${newCurrentNumber}番への通知失敗。口頭でお知らせください。`);
      }
    } catch (e) {
      console.error(e);
      showCardError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const waitCount = Math.max(0, state.nowServing - state.currentNumber);
  const canCallNext = state.currentNumber < state.nowServing;

  return (
    <div className="bg-[#6B1F3A] rounded-2xl p-4 text-white flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h2 className="font-black text-sm leading-tight">{exhibit.name}</h2>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
              state.distributionEnabled
                ? "bg-green-500/30 text-green-300"
                : "bg-white/20 text-white/50"
            }`}
          >
            {state.distributionEnabled ? "配布中" : "配布終了"}
          </span>
        </div>
        <p className="text-white/50 text-xs">{exhibit.location}</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="bg-[#4F1128] rounded-lg py-2 px-1">
          <div className="text-2xl font-bold leading-none">{state.currentNumber}</div>
          <div className="text-xs text-white/50 mt-1">呼び出し済み</div>
        </div>
        <div className="bg-[#4F1128] rounded-lg py-2 px-1">
          <div className="text-2xl font-bold leading-none">{state.nowServing}</div>
          <div className="text-xs text-white/50 mt-1">発行済み</div>
        </div>
        <div className="bg-[#4F1128] rounded-lg py-2 px-1">
          <div className="text-2xl font-bold leading-none">{waitCount}</div>
          <div className="text-xs text-white/50 mt-1">待ち人数</div>
        </div>
      </div>
      {error && <p className="text-[#FFE08A] text-xs leading-snug">{error}</p>}
      <button
        onClick={nextNumber}
        disabled={loading || !canCallNext}
        className="w-full bg-[#8E2D47] hover:bg-[#A64C60] disabled:opacity-40 disabled:cursor-not-allowed py-2.5 rounded-xl font-black text-sm transition-colors active:scale-95"
      >
        {loading ? "更新中..." : "次の番号を呼ぶ"}
      </button>
    </div>
  );
}

export default function AdminPage() {
  const exhibitId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("exhibitId")
      : null;

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
  const [resetLoading, setResetLoading] = useState(false); // 全リセット処理中
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

  // Firestoreリスナー（個別管理画面のみ）
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
    if (loading || !exhibitId) return;
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
        showError(`${newCurrentNumber}番の整理券データが見つかりません。通知をスキップしました。`);
        setLoading(false);
        return;
      }

      const userId = activeSnap.data().userId;

      const result = await notifyUser(userId, newCurrentNumber, exhibitId);

      if (!result.ok) {
        console.error("LINE通知に失敗しました:", result.error);
        showError(`${newCurrentNumber}番へのLINE通知送信に失敗しました。口頭でお知らせください。`);
      }
    } catch (error) {
      console.error("Firestoreの更新中にエラーが発生しました:", error);
      alert("エラーが発生しました。コンソールを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const toggleDistribution = async (enabled: boolean) => {
    if (toggleLoading || !exhibitId) return;
    setToggleLoading(true);

    try {
      const ticketRef = doc(db, "tickets", exhibitId);

      if (enabled) {
        // ON にするだけ
        await setDoc(ticketRef, { distributionEnabled: true }, { merge: true });
;
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
        // oldCurrentNumber + 1 から nowServing までの人に並列通知
        const ticketNums = Array.from(
          { length: nowServing - oldCurrentNumber },
          (_, i) => oldCurrentNumber + 1 + i,
        );
        await Promise.allSettled(
          ticketNums.map(async (ticketNum) => {
            const activeRef = doc(
              db,
              "active_tickets",
              `${exhibitId}_${ticketNum}`,
            );
            const activeSnap = await getDoc(activeRef);
            if (!activeSnap.exists()) return;
            const userId = activeSnap.data().userId;
            const result = await notifyUser(userId, ticketNum, exhibitId);
            if (!result.ok) {
              console.error(`${ticketNum}番への通知失敗:`, result.error);
            }
          }),
        );
      }
    } catch (error) {
      console.error("配布モード更新中にエラーが発生しました:", error);
      alert("エラーが発生しました。コンソールを確認してください。");
    } finally {
      setToggleLoading(false);
    }
  };

  const resetAll = async () => {
    if (resetLoading) return;
    const confirmed = window.confirm(
      "全8企画の整理券データをリセットしますか？\n\n・全企画の番号が0に戻ります\n・配布状態が「配布中」に戻ります\n\nこの操作は取り消せません。",
    );
    if (!confirmed) return;
    setResetLoading(true);
    try {
      const batch = writeBatch(db);
      for (const exhibit of EXHIBITS) {
        const ref = doc(db, "tickets", exhibit.id);
        batch.set(ref, {
          nowServing: 0,
          currentNumber: 0,
          distributionEnabled: true,
          currentNumber_called_at: deleteField(),
        }, { merge: true });
      }
      await batch.commit();
    } catch (e) {
      console.error("リセット中にエラーが発生しました:", e);
      alert("リセットに失敗しました。コンソールを確認してください。");
    } finally {
      setResetLoading(false);
    }
  };

  const exhibitName = exhibitId ? (EXHIBIT_NAMES[exhibitId] || exhibitId) : "";

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

  // exhibitId なし → 全企画ダッシュボード
  if (!exhibitId) {
    return (
      <main
        className="min-h-screen bg-[#2E0A1A] text-white p-4"
        style={{ fontFamily: '"Noto Sans JP", system-ui, sans-serif' }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');`}</style>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-black">運営ダッシュボード</h1>
            <button
              onClick={() => signOut(auth)}
              className="text-white/40 text-xs hover:text-white/70 transition-colors"
            >
              ログアウト
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {EXHIBITS.map((exhibit) => (
              <ExhibitAdminCard key={exhibit.id} exhibit={exhibit} />
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <button
              onClick={resetAll}
              disabled={resetLoading}
              className="px-6 py-2.5 rounded-xl text-sm font-bold border border-white/20 text-white/40 hover:border-red-400/60 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {resetLoading ? "リセット中..." : "全企画リセット"}
            </button>
          </div>
          <p className="mt-4 text-center text-white/30 text-xs uppercase tracking-tighter">
            Admin Console for Precision Lab.
          </p>
        </div>
      </main>
    );
  }

  // exhibitId あり → 個別管理画面
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
            onClick={() => {
              if (distributionEnabled) {
                if (!window.confirm("整理券の配布を終了しますか？\n待機中の全員にLINE通知が送信されます。この操作は取り消せません。")) return;
              }
              toggleDistribution(!distributionEnabled);
            }}
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

"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../lib/firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { notifyUser } from "../actions/notify";

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

function ExhibitAdminCard({
  exhibit,
}: {
  exhibit: (typeof EXHIBITS)[0];
}) {
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

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  };

  const nextNumber = async () => {
    if (loading) return;
    const newCurrentNumber = state.currentNumber + 1;
    if (newCurrentNumber > state.nowServing) {
      showError("整理券が発行されていません");
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
        showError(`${newCurrentNumber}番のデータが見つかりません。口頭でお知らせください。`);
        return;
      }
      const result = await notifyUser(activeSnap.data().userId, newCurrentNumber, exhibit.id);
      if (!result.ok) {
        showError(`${newCurrentNumber}番への通知失敗。口頭でお知らせください。`);
      }
    } catch (e) {
      console.error(e);
      showError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const waitCount = Math.max(0, state.nowServing - state.currentNumber);
  const canCallNext = state.currentNumber < state.nowServing;

  return (
    <div className="bg-[#6B1F3A] rounded-2xl p-4 text-white flex flex-col gap-3">
      {/* ヘッダー */}
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

      {/* 数字グリッド */}
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

      {/* エラー */}
      {error && <p className="text-[#FFE08A] text-xs leading-snug">{error}</p>}

      {/* ボタン */}
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

export default function GuideAdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

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

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-[#2E0A1A] text-white flex items-center justify-center">
        <p>認証確認中...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main
        className="min-h-screen bg-[#2E0A1A] text-white flex flex-col items-center justify-center p-8"
        style={{ fontFamily: '"Noto Sans JP", system-ui, sans-serif' }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');`}</style>
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
            className={`px-8 py-3 rounded-xl font-bold transition-all ${
              loginLoading
                ? "bg-white/20 opacity-50 cursor-not-allowed"
                : "bg-[#8E2D47] hover:bg-[#6B1F3A]"
            }`}
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
    <main
      className="min-h-screen bg-[#2E0A1A] text-white p-4"
      style={{ fontFamily: '"Noto Sans JP", system-ui, sans-serif' }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');`}</style>

      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black">運営ダッシュボード</h1>
          <button
            onClick={() => signOut(auth)}
            className="text-white/40 text-xs hover:text-white/70 transition-colors"
          >
            ログアウト
          </button>
        </div>

        {/* 企画グリッド */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {EXHIBITS.map((exhibit) => (
            <ExhibitAdminCard key={exhibit.id} exhibit={exhibit} />
          ))}
        </div>

        <p className="mt-6 text-center text-white/30 text-xs uppercase tracking-tighter">
          Admin Console for Precision Lab.
        </p>
      </div>
    </main>
  );
}

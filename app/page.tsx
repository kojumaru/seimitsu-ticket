"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";

export default function Home() {
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    // LIFFの初期化
    liff.init({ liffId: "2009242984-XYO590kr" }).then(() => {
      if (liff.isLoggedIn()) {
        liff.getProfile().then((profile) => {
          setProfileName(profile.displayName);
        });
      } else {
        liff.login(); // ログインしていなければログイン画面へ
      }
    });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-blue-50">
      <h1 className="text-2xl font-bold text-blue-600">
        精密Lab. 整理券システム
      </h1>
      {profileName && (
        <p className="mt-4 text-lg">
          ようこそ、<span className="font-bold">{profileName}</span> さん！
        </p>
      )}
      <button className="mt-8 bg-blue-500 text-white px-6 py-3 rounded-full font-bold shadow-lg">
        整理券を発行する
      </button>
    </main>
  );
}

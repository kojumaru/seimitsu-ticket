import { NextResponse } from "next/server";

// フロントエンドと同じ辞書を定義します
const EXHIBIT_INFO: Record<string, { name: string }> = {
  switch: {
    name: "せいみつスイッチ",
  },
  soccer: {
    name: "ロボットサッカー",
  },
  example: {
    name: "サンプル企画",
  },
  // FirebaseのドキュメントIDが増えたらここにも追加してください
};

export async function POST(req: Request) {
  const { userId, ticketNumber, exhibitId } = await req.json();

  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  // 辞書から表示用の名前を取得（見つからない場合は ID をそのまま使用）
  const displayName = EXHIBIT_INFO[exhibitId]?.name || exhibitId.toUpperCase();

  const message = {
    to: userId,
    messages: [
      {
        type: "text",
        text: `【${displayName}】お待たせしました！${ticketNumber}番の方、お越しください！`,
      },
    ],
  };

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    // デバッグ用にエラー内容をログに出力しておくと精密な修正がしやすくなります
    const errorData = await res.json();
    console.error("LINE API Error:", errorData);
    return NextResponse.json({ error: "LINE通知失敗" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

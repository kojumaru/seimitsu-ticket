import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, ticketNumber } = await request.json();
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!token) {
      console.error("❌ 環境変数 LINE_CHANNEL_ACCESS_TOKEN が空です！");
      return NextResponse.json({ error: "Token missing" }, { status: 500 });
    }

    console.log(`📩 LINEへ送信要求: To=${userId}, Number=${ticketNumber}`);

    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: "text",
            text: `【精密Lab.】${ticketNumber}番の方、お越しください！`,
          },
        ],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ LINE API エラー詳細:", JSON.stringify(result));
      return NextResponse.json({ error: result }, { status: response.status });
    }

    console.log("✨ LINE通知送信成功！");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("🔥 API内部エラー:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

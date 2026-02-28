import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId, ticketNumber, exhibitId } = await req.json();

  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  const message = {
    to: userId,
    messages: [
      {
        type: "text",
        text: `【${exhibitId}】${ticketNumber}番の方、お越しください！`,
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
    return NextResponse.json({ error: "LINE通知失敗" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

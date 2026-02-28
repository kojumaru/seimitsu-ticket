import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId, ticketNumber } = await request.json();
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token)
    return NextResponse.json({ error: "Token missing" }, { status: 500 });

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
          text: `【精密Lab.】お待たせしました！\n整理券番号 ${ticketNumber} 番の方、ブース受付までお越しください！`,
        },
      ],
    }),
  });

  return NextResponse.json({ success: response.ok });
}

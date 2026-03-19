const EXHIBIT_NAMES: Record<string, string> = {
  switch: "せいみつスイッチ",
  soccer: "ロボットサッカー",
  chess: "ロボットチェス",
  arm: "ロボットアーム",
  example: "サンプル企画",
};

export async function sendLineNotification(
  userId: string,
  ticketNumber: number,
  exhibitId: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const displayName = EXHIBIT_NAMES[exhibitId] || exhibitId.toUpperCase();

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
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
          text: `【${displayName}】お待たせしました！${ticketNumber}番の方、お越しください！`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error("LINE API Error:", error);
    return { ok: false, error: "LINE通知失敗" };
  }

  return { ok: true };
}

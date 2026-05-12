const EXHIBITS: Record<string, { name: string; location: string }> = {
  pong: { name: "せいみつPONG!", location: "14号館 1階142教室" },
  shooting: { name: "お絵描きシューティング", location: "14号館 1階142教室" },
  tank: { name: "ARタンク", location: "14号館 1階142教室" },
  room: { name: "現実拡張空間", location: "14号館 3階146教室" },
  truck: { name: "ジャングル・スコープ", location: "14号館 3階146教室" },
  soccer: {
    name: "スーパーロボットサッカー",
    location: "14号館 3階プロジェクト室",
  },
  arm: {
    name: "ワームホールロボットアーム",
    location: "14号館 3階プロジェクト室",
  },
  switch: { name: "せいみつスイッチ", location: "14号館 3階プロジェクト室" },
};

export async function sendLineNotification(
  userId: string,
  ticketNumber: number,
  exhibitId: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const exhibit = EXHIBITS[exhibitId];
  const displayName = exhibit?.name || exhibitId.toUpperCase();
  const location = exhibit?.location || "企画場所";
  const ticketPageUrl = `https://liff.line.me/2009242984-XYO590kr?exhibitId=${exhibitId}`;

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
          text: `【${displayName}】\nお待たせしました！${ticketNumber}番の方、${location}へお越しください！\n\n注意：\nこのお呼び出しから一時間以内に企画場所へお越いただけない場合失効扱いとなる場合があります。\n\n整理券ページを再度開く:\n${ticketPageUrl}`,
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

export async function sendLineIssueNotification(
  userId: string,
  exhibitId: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const exhibit = EXHIBITS[exhibitId];
  const displayName = exhibit?.name || exhibitId.toUpperCase();
  const location = exhibit?.location || "企画場所";
  const ticketPageUrl = `https://liff.line.me/2009242984-XYO590kr?exhibitId=${exhibitId}`;

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
          text: `【${displayName}】の整理券を取得しました！\n\nこの券は「列に並ぶための予約券」です。\n① 順番が来るまでは、他の展示など自由にお過ごしください。\n② 順番になりましたら、このLINEで通知します。\n③ 通知が届きましたら、${location}の列へお越しください。\n\n整理券ページを再度開く:\n${ticketPageUrl}`,
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

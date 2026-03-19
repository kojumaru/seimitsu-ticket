"use server";

import { sendLineNotification } from "../lib/proxy";

export async function notifyUser(
  userId: string,
  ticketNumber: number,
  exhibitId: string,
) {
  return await sendLineNotification(userId, ticketNumber, exhibitId);
}

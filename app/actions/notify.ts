"use server";

import { sendLineNotification, sendLineIssueNotification } from "../lib/proxy";

export async function notifyUser(
  userId: string,
  ticketNumber: number,
  exhibitId: string,
) {
  return await sendLineNotification(userId, ticketNumber, exhibitId);
}

export async function notifyIssueTicket(
  userId: string,
  exhibitId: string,
) {
  return await sendLineIssueNotification(userId, exhibitId);
}

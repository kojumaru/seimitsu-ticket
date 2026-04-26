import { doc, getDoc } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticketId = searchParams.get("id");

    if (!ticketId) {
      return NextResponse.json(
        { error: "Missing ticket ID" },
        { status: 400 }
      );
    }

    // Firestore から最新のチケット情報を取得
    const ticketRef = doc(db, "tickets", ticketId);
    const snapshot = await getDoc(ticketRef);

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      nowServing: snapshot.data().nowServing ?? null,
      currentNumber: snapshot.data().currentNumber ?? null,
      distributionEnabled: snapshot.data().distributionEnabled ?? true,
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

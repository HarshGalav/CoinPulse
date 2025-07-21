import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminDb } from "@/lib/firebase-admin";
import { authOptions } from "@/lib/auth-config";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notificationsRef = adminDb.collection("notifications");
    const snapshot = await notificationsRef
      .where("userEmail", "==", session.user.email)
      .orderBy("triggeredAt", "desc")
      .limit(50)
      .get();

    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

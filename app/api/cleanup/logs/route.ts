import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Protect with a secret so only your cron job can trigger this.
// Set CLEANUP_SECRET in your environment variables.
const CLEANUP_SECRET = process.env.CLEANUP_SECRET;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!CLEANUP_SECRET || authHeader !== `Bearer ${CLEANUP_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businesses = await prisma.business.findMany({
    select: { id: true, logRetentionDays: true },
  });

  let totalDeleted = 0;

  for (const business of businesses) {
    // null = permanent retention, skip
    if (business.logRetentionDays === null) continue;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - business.logRetentionDays);

    // Delete logs for closed orders (paid or cancelled) whose log entries
    // are older than the retention window.
    const result = await prisma.orderEditLog.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        order: {
          businessId: business.id,
          status: { in: ["paid", "cancelled"] },
        },
      },
    });

    totalDeleted += result.count;
  }

  return NextResponse.json({ deleted: totalDeleted });
}

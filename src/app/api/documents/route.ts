import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.document.create({
    data: {
      title: "Untitled Document",
      ownerId: session.user.id,
      members: { create: { userId: session.user.id, role: "OWNER" } },
    },
  });

  const wantsRedirect = req.headers.get("content-type")?.includes("form");
  if (wantsRedirect) {
    return NextResponse.redirect(new URL(`/documents/${doc.id}`, req.url), { status: 303 });
  }
  return NextResponse.json({ id: doc.id });
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const SignupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine(({ password, confirmPassword }) => password === confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export async function POST(req: NextRequest) {
  const parsed = SignupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a name, valid email, and password of at least 8 characters." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: { name: parsed.data.name, email: parsed.data.email, passwordHash },
      select: { id: true },
    });
  } catch (error) {
    // The preflight check above gives a friendly response; this catches a
    // concurrent signup for the same email at the database uniqueness boundary.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ id: user.id }, { status: 201 });
}

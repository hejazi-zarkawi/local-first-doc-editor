import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";
import { auth, getDocumentRole } from "@/lib/auth";

const AiRequestSchema = z.object({
  mode: z.enum(["summarize", "continue"]),
  text: z.string().max(20000), // bounded, same OOM-prevention principle as sync payloads
});

const PROMPTS = {
  summarize: (text: string) => `Summarize the following document in 3 concise bullet points:\n\n${text}`,
  continue: (text: string) => `Continue writing the following document in the same voice and style, adding 2-3 sentences:\n\n${text}`,
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getDocumentRole(session.user.id, documentId);
  if (!role || role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = AiRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI is not configured on this server (missing GROQ_API_KEY)" }, { status: 501 });
  }

  try {
    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: PROMPTS[parsed.data.mode](parsed.data.text),
      maxTokens: 300,
    });
    return NextResponse.json({ result: text });
  } catch (err) {
    return NextResponse.json({ error: "AI request failed" }, { status: 502 });
  }
}

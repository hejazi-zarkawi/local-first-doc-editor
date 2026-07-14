import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await prisma.documentMember.findMany({
    where: { userId: session.user.id },
    include: { document: true },
    orderBy: { document: { updatedAt: "desc" } },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your documents</h1>
        <form action="/api/documents" method="post">
          <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
            New document
          </button>
        </form>
      </div>

      <ul className="flex flex-col gap-3">
        {memberships.map((m: (typeof memberships)[number]) => (
          <li key={m.documentId}>
            <Link
              href={`/documents/${m.documentId}`}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300"
            >
              <span className="font-medium">{m.document.title}</span>
              <span className="text-xs uppercase tracking-wide text-neutral-500">{m.role}</span>
            </Link>
          </li>
        ))}
        {memberships.length === 0 && (
          <li className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
            No documents yet. Create one to get started.
          </li>
        )}
      </ul>
    </main>
  );
}

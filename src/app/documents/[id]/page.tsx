import { notFound, redirect } from "next/navigation";
import { auth, getDocumentRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = await getDocumentRole(session.user.id, id);
  if (!role) notFound();

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{doc.title}</h1>
      <DocumentEditor documentId={id} role={role} />
    </main>
  );
}

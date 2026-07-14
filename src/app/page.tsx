import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArrowRight, CheckCircle2, FileText, History, ShieldCheck, WifiOff } from "lucide-react";
import { DocumentDashboard } from "@/components/dashboard/DocumentDashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return <LandingPage />;

  const memberships = await prisma.documentMember.findMany({
    where: { userId: session.user.id },
    include: { document: true },
    orderBy: { document: { updatedAt: "desc" } },
  });

  return (
    <DocumentDashboard
      user={{ name: session.user.name ?? null, email: session.user.email ?? null }}
      documents={memberships.map((membership) => ({
        id: membership.documentId,
        title: membership.document.title,
        role: membership.role,
        updatedAt: membership.document.updatedAt.toISOString(),
      }))}
    />
  );
}

const features = [
  {
    icon: WifiOff,
    title: "Work offline, naturally",
    description: "Write anywhere. Your changes are saved on your device first and sync when you reconnect.",
  },
  {
    icon: History,
    title: "Every version, within reach",
    description: "Capture important moments and restore a previous version without losing your document history.",
  },
  {
    icon: ShieldCheck,
    title: "Collaboration you control",
    description: "Invite teammates as owners, editors, or viewers and keep document access appropriately scoped.",
  },
];

function LandingPage() {
  return (
    <main className="overflow-hidden">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-neutral-950">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-950 text-white">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          LocalFirst Docs
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition hover:text-neutral-950">
            Login
          </Link>
          <Link href="/signup" className="rounded-lg bg-neutral-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 sm:px-4">
            Get started
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-14 lg:px-8 lg:pb-32 lg:pt-24">
        <div className="absolute left-1/2 top-0 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Built for uninterrupted thinking
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-6xl lg:text-7xl">
            Your ideas should not wait for Wi-Fi.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-neutral-600 sm:text-xl">
            A calm, collaborative workspace that keeps every word safe on your device and seamlessly brings your team back in sync.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-neutral-950/15 transition hover:-translate-y-0.5 hover:bg-neutral-700">
              Get started for free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-medium text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-50">
              Login to your workspace
            </Link>
          </div>
          <p className="mt-4 text-xs text-neutral-500">No credit card required. Start writing in seconds.</p>
        </div>

        <div className="mx-auto mt-16 max-w-4xl rounded-2xl border border-neutral-200 bg-white p-3 shadow-2xl shadow-neutral-300/40 sm:p-5">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-left sm:p-8">
            <div className="mb-8 flex items-center justify-between border-b border-neutral-200 pb-4">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">All changes synced</span>
            </div>
            <p className="text-sm font-medium text-neutral-400">Project brief</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Make space for the work that matters.</p>
            <div className="mt-5 h-2 w-full rounded-full bg-neutral-200" />
            <div className="mt-3 h-2 w-4/5 rounded-full bg-neutral-200" />
            <div className="mt-3 h-2 w-3/5 rounded-full bg-neutral-200" />
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">Designed for momentum</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">A document editor that keeps up with real life.</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 transition hover:-translate-y-1 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/60">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-neutral-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <div className="rounded-3xl bg-neutral-950 px-6 py-14 text-center text-white sm:px-12 sm:py-16">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" aria-hidden="true" />
          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Start with a blank page. Go anywhere.</h2>
          <p className="mx-auto mt-4 max-w-xl text-neutral-300">Create your workspace and keep writing, whether you are online, offline, or somewhere in between.</p>
          <Link href="/signup" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-emerald-50">
            Get started <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}

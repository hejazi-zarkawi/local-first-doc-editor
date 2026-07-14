"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FileText } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Unable to create your account.");
        return;
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        router.push("/login");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-sm flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-10 flex items-center gap-2 self-start font-semibold tracking-tight text-neutral-950">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-950 text-white"><FileText className="h-5 w-5" /></span>
        LocalFirst Docs
      </Link>
      <p className="text-sm font-medium text-emerald-700">Create your workspace</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">Start writing freely.</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">Your first document is only a few details away.</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="text-sm font-medium text-neutral-800">Name
          <input required maxLength={100} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10" />
        </label>
        <label className="text-sm font-medium text-neutral-800">Email
          <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10" />
        </label>
        <label className="text-sm font-medium text-neutral-800">Password
          <input type="password" required minLength={8} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10" />
        </label>
        <label className="text-sm font-medium text-neutral-800">Confirm password
          <input type="password" required minLength={8} placeholder="Repeat your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10" />
        </label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="mt-2 rounded-lg bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-600">Already have an account? <Link href="/login" className="font-medium text-neutral-950 underline underline-offset-4">Login</Link></p>
    </main>
  );
}

"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButtons() {
  const { data: session, status } = useSession();
  if (status === "loading") return <span className="text-sm text-gray-400">Betöltés…</span>;
  if (!session) {
    return (
      <button onClick={() => signIn("google")} className="underline">
        Bejelentkezés
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">{session.user?.name || session.user?.email}</span>
      <button onClick={() => signOut()} className="underline">Kijelentkezés</button>
    </div>
  );
}

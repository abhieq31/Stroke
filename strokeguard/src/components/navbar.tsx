"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, Menu, X } from "lucide-react";
import { signOut } from "@/app/actions";

const LINKS = [
  { href: "/predict", label: "Risk Check" },
  { href: "/about", label: "The Science" },
];

export function Navbar({
  user,
  authEnabled,
}: {
  user: { email: string | null } | null;
  authEnabled: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = authEnabled ? [...LINKS, { href: "/history", label: "History" }] : LINKS;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
          </span>
          StrokeGuard <span className="text-brand-600">AI</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === l.href
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {l.label}
            </Link>
          ))}

          {authEnabled ? (
            user ? (
              <form action={signOut} className="ml-2">
                <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="ml-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
              >
                Sign in
              </Link>
            )
          ) : null}
        </div>

        <button
          className="rounded-lg p-2 text-slate-600 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-5 py-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {l.label}
            </Link>
          ))}
          {authEnabled &&
            (user ? (
              <form action={signOut}>
                <button className="mt-1 w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white"
              >
                Sign in
              </Link>
            ))}
        </div>
      )}
    </header>
  );
}

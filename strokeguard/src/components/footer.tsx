import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-slate-500">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p>
            <span className="font-semibold text-slate-700">StrokeGuard AI</span> — an
            explainable stroke-risk screening demo.
          </p>
          <div className="flex gap-5">
            <Link href="/predict" className="hover:text-brand-700">
              Risk Check
            </Link>
            <Link href="/about" className="hover:text-brand-700">
              The Science
            </Link>
          </div>
        </div>
        <p className="mt-5 max-w-3xl text-xs leading-relaxed text-slate-400">
          For educational and research purposes only. Not a medical device and not a
          substitute for professional medical advice, diagnosis, or treatment. If you
          think you may be having a stroke, call your local emergency number immediately.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          © {new Date().getFullYear()} Abhi Patel. Built with Next.js, Supabase &amp;
          scikit-learn.
        </p>
      </div>
    </footer>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { Archive, FileOutput, Hash, Scissors } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function BookletStudioPage() {
  return (
    <main className="theme-page min-h-screen bg-[#07090e] p-6 text-zinc-200 sm:p-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-start justify-between border-b border-zinc-800/80 pb-6">
          <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-indigo-400">PDF tools</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Choose a workspace</h1>
          <p className="mt-2 text-sm text-zinc-400">Open each PDF workflow on its own focused page.</p>
          </div>
          <ThemeToggle />
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <ToolLink href="/booklet-imposition" icon={<FileOutput />} title="Booklet imposition" description="Arrange PDF pages into print-ready 2-up saddle-stitch sheets." />
          <ToolLink href="/pdf-page-remover" icon={<Scissors />} title="PDF page remover" description="Preview, reorder, rotate, and remove pages from a PDF." />
          <ToolLink href="/pdf-page-numberer" icon={<Hash />} title="Add page numbers" description="Add and style page numbers on every PDF page." />
          <ToolLink href="/pdf-splitter" icon={<Archive />} title="Split PDF" description="Split a PDF into page ranges and download one ZIP archive." />
        </div>
      </div>
    </main>
  );
}

function ToolLink({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-xl border border-zinc-800 bg-[#0f1422] p-5 transition-colors hover:border-indigo-500/60 hover:bg-[#141b2d]">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">{icon}</div>
      <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
      <span className="mt-5 inline-block text-xs font-medium text-indigo-400">Open tool</span>
    </Link>
  );
}

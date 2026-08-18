export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 bg-gradient-to-br from-primary to-[#6c53f5] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-primary-foreground shadow-md">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coin text-lg shadow-inner ring-2 ring-white/25">
          😊
        </div>
        <div className="min-w-0">
          <h1 className="font-display truncate text-lg font-bold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-white/70">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

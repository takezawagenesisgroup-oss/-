export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-story-1 via-story-2 to-story-3 text-base">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-card text-sm">😊</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-display truncate text-base font-bold leading-tight tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-blue-900 to-blue-700 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-white shadow-md">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl">😊</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-blue-100">{subtitle}</p>}
          </div>
        </div>
      </div>
    </header>
  );
}

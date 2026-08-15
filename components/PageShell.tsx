export function PageShell({
  title,
  step,
  totalSteps,
  children,
}: {
  title: string;
  step?: number;
  totalSteps?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        {step && totalSteps ? (
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
            <span>
              STEP {step} / {totalSteps}
            </span>
            <div className="h-1.5 flex-1 rounded-full bg-zinc-200">
              <div
                className="h-1.5 rounded-full bg-emerald-600 transition-all"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        ) : null}
        <h1 className="mb-6 text-xl font-bold text-zinc-900">{title}</h1>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

export type Tab = 'home' | 'post' | 'events' | 'exchange' | 'mypage';

interface TabDef {
  id: Tab;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: 'home', label: 'ホーム', icon: '🏠' },
  { id: 'post', label: '投稿する', icon: '📸' },
  { id: 'events', label: 'イベント', icon: '🎉' },
  { id: 'exchange', label: 'コイン交換', icon: '🪙' },
  { id: 'mypage', label: 'マイページ', icon: '📅' },
];

export default function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-blue-700' : 'text-slate-400'
              }`}
            >
              <span className={`text-xl leading-none ${isActive ? 'scale-110' : ''} transition-transform`}>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`mt-0.5 h-1 w-6 rounded-full ${isActive ? 'bg-blue-600' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

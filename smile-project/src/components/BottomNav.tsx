import { Home, Sparkles, Coins, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Tab = 'home' | 'post' | 'points' | 'exchange';

interface TabDef {
  id: Tab;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: 'home', label: 'イベント報告', icon: Home },
  { id: 'points', label: 'ポイント', icon: Sparkles },
  { id: 'exchange', label: 'ポイント交換', icon: Coins },
];

export default function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              aria-label={tab.label}
              className={cn(
                'flex flex-1 items-center justify-center py-3.5 transition-transform active:scale-90',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-6" strokeWidth={isActive ? 2.4 : 1.8} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

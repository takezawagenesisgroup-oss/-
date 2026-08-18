import { Home, Camera, PartyPopper, Coins, CalendarDays, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Tab = 'home' | 'post' | 'events' | 'exchange' | 'mypage';

interface TabDef {
  id: Tab;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: 'home', label: 'ホーム', icon: Home },
  { id: 'post', label: '投稿する', icon: Camera },
  { id: 'events', label: 'イベント', icon: PartyPopper },
  { id: 'exchange', label: 'コイン交換', icon: Coins },
  { id: 'mypage', label: 'マイページ', icon: CalendarDays },
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

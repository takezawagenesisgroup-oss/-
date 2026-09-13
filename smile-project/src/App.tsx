import { useState } from 'react';
import { StoreProvider } from './data/store';
import Header from './components/Header';
import BottomNav, { type Tab } from './components/BottomNav';
import HomeFeed from './pages/HomeFeed';
import PostCreate from './pages/PostCreate';
import Points from './pages/Points';
import Exchange from './pages/Exchange';

const TITLES: Record<Tab, { title: string; subtitle: string }> = {
  home: { title: 'スマイルプロジェクト', subtitle: '四季のイベントを写真でシェアしよう' },
  post: { title: 'イベント報告', subtitle: '事前準備・当日の様子を投稿' },
  points: { title: 'ポイント', subtitle: 'みんなの獲得ポイントを見てみよう' },
  exchange: { title: 'ポイント交換', subtitle: 'ためたポイントをご褒美に交換しよう' },
};

function App() {
  const [tab, setTab] = useState<Tab>('home');
  const { title, subtitle } = TITLES[tab];

  return (
    <StoreProvider>
      <div className="flex min-h-svh flex-col bg-background">
        <Header title={title} subtitle={subtitle} />
        <main className="relative flex-1 pb-6">
          {tab === 'home' && <HomeFeed onCreateReport={() => setTab('post')} />}
          {tab === 'post' && <PostCreate onDone={setTab} />}
          {tab === 'points' && <Points onNavigate={setTab} />}
          {tab === 'exchange' && <Exchange />}
        </main>
        <BottomNav active={tab === 'post' ? 'home' : tab} onChange={setTab} />
      </div>
    </StoreProvider>
  );
}

export default App;

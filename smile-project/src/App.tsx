import { useState } from 'react';
import { StoreProvider } from './data/store';
import Header from './components/Header';
import BottomNav, { type Tab } from './components/BottomNav';
import HomeFeed from './pages/HomeFeed';
import PostCreate from './pages/PostCreate';
import Events from './pages/Events';
import Exchange from './pages/Exchange';
import MyPage from './pages/MyPage';

const TITLES: Record<Tab, { title: string; subtitle: string }> = {
  home: { title: 'スマイルプロジェクト', subtitle: '四季のイベントを写真でシェアしよう' },
  post: { title: 'イベント報告', subtitle: '事前準備・当日の様子を投稿' },
  events: { title: 'イベント', subtitle: '四季の成長プロジェクト＆ポイントランキング' },
  exchange: { title: 'ポイント交換', subtitle: 'ためたポイントをご褒美に交換しよう' },
  mypage: { title: 'マイページ', subtitle: 'ポイントの記録' },
};

function App() {
  const [tab, setTab] = useState<Tab>('home');
  const { title, subtitle } = TITLES[tab];

  return (
    <StoreProvider>
      <div className="flex min-h-svh flex-col bg-background">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 pb-6">
          {tab === 'home' && <HomeFeed />}
          {tab === 'post' && <PostCreate onDone={setTab} />}
          {tab === 'events' && <Events />}
          {tab === 'exchange' && <Exchange />}
          {tab === 'mypage' && <MyPage onNavigate={setTab} />}
        </main>
        <BottomNav active={tab} onChange={setTab} />
      </div>
    </StoreProvider>
  );
}

export default App;

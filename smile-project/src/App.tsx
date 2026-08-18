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
  home: { title: 'スマイルプロジェクト', subtitle: '今日も1分、笑顔をシェアしよう' },
  post: { title: 'スマイル投稿', subtitle: '自己採点して仲間に共有' },
  events: { title: 'イベント', subtitle: '四季の成長プロジェクト＆週間ランキング' },
  exchange: { title: 'コイン交換', subtitle: 'Genesisコインをご褒美に交換しよう' },
  mypage: { title: 'マイページ', subtitle: 'コインとスタンプの記録' },
};

function App() {
  const [tab, setTab] = useState<Tab>('home');
  const { title, subtitle } = TITLES[tab];

  return (
    <StoreProvider>
      <div className="flex min-h-svh flex-col bg-[#eef2f9]">
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

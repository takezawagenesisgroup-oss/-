import { useState } from 'react';
import { StoreProvider } from './data/store';
import Header from './components/Header';
import BottomNav, { type Tab } from './components/BottomNav';
import HomeFeed from './pages/HomeFeed';
import PostCreate from './pages/PostCreate';
import Ranking from './pages/Ranking';
import MyPage from './pages/MyPage';

const TITLES: Record<Tab, { title: string; subtitle: string }> = {
  home: { title: 'スマイルプロジェクト', subtitle: '今日も1分、笑顔をシェアしよう' },
  post: { title: 'スマイル投稿', subtitle: '自己採点して仲間に共有' },
  ranking: { title: 'ランキング', subtitle: '週間ランキングと月間イベント' },
  mypage: { title: 'マイページ', subtitle: 'ポイントとスタンプの記録' },
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
          {tab === 'ranking' && <Ranking />}
          {tab === 'mypage' && <MyPage />}
        </main>
        <BottomNav active={tab} onChange={setTab} />
      </div>
    </StoreProvider>
  );
}

export default App;

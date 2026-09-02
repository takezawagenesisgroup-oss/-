import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kehai.unlockAll.v1';
const AI_CHAT_STORAGE_KEY = 'kehai.aiChatUnlock.v1';
export const AI_CHAT_UNLOCK_PRICE_JPY = 300;

// ---------------------------------------------------------------------------
// ストア連携の差し込みポイント。凪・隣のapp/purchases.tsと同じスタブ実装。
// App Store Connect / Google Play Console 側での非消耗型商品の作成、
// react-native-iap 等への差し替え手順もそちらと同様。
// ---------------------------------------------------------------------------
async function purchaseUnlockAll(): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return true;
}

async function restorePreviousPurchase(): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored === 'true';
}
// ---------------------------------------------------------------------------

export function usePurchase() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => setIsUnlocked(value === 'true'))
      .finally(() => setLoading(false));
  }, []);

  const unlock = useCallback(async () => {
    setPurchasing(true);
    try {
      const success = await purchaseUnlockAll();
      if (success) {
        await AsyncStorage.setItem(STORAGE_KEY, 'true');
        setIsUnlocked(true);
      }
      return success;
    } finally {
      setPurchasing(false);
    }
  }, []);

  const restore = useCallback(async () => {
    setPurchasing(true);
    try {
      const restored = await restorePreviousPurchase();
      if (restored) setIsUnlocked(true);
      return restored;
    } finally {
      setPurchasing(false);
    }
  }, []);

  return { isUnlocked, loading, purchasing, unlock, restore };
}

// キャラクター解放とは別枠の「AIと話す」課金モード用の購入フック。
// 実運用ではAI応答生成に継続コスト(バックエンドのLLM API利用料)がかかる
// ため、買い切りよりサブスクリプション向きの機能だが、ストア連携が未実装の
// このスタブでは同じ買い切り型のAsyncStorageフラグとして仮実装している。
export function useAiChatPurchase() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(AI_CHAT_STORAGE_KEY)
      .then((value) => setIsUnlocked(value === 'true'))
      .finally(() => setLoading(false));
  }, []);

  const unlock = useCallback(async () => {
    setPurchasing(true);
    try {
      const success = await purchaseUnlockAll();
      if (success) {
        await AsyncStorage.setItem(AI_CHAT_STORAGE_KEY, 'true');
        setIsUnlocked(true);
      }
      return success;
    } finally {
      setPurchasing(false);
    }
  }, []);

  const restore = useCallback(async () => {
    setPurchasing(true);
    try {
      const stored = await AsyncStorage.getItem(AI_CHAT_STORAGE_KEY);
      const restored = stored === 'true';
      if (restored) setIsUnlocked(true);
      return restored;
    } finally {
      setPurchasing(false);
    }
  }, []);

  return { isUnlocked, loading, purchasing, unlock, restore };
}

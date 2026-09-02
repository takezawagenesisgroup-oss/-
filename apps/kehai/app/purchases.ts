import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kehai.unlockAll.v1';
const PREMIUM_STORAGE_KEY = 'kehai.premium.v1';
// キャラ解放(¥480買い切り)とは別枠の月額プラン。「AIと話すモード」はメッセージ
// ごとにLLM API利用料という継続コストがかかる機能なので買い切りに向かず、
// 「名前で呼んでもらう機能」はコストゼロだがAIチャットと抱き合わせることで
// 月額プランの提供価値を底上げする狙いでバンドルしている。
export const PREMIUM_PRICE_JPY = 480;
export const PREMIUM_PRICE_LABEL = `¥${PREMIUM_PRICE_JPY}/月`;

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

// キャラクター解放とは別枠の「プレミアムプラン」(AIと話すモード + 名前で
// 呼んでもらう機能)用の購入フック。月額サブスクリプションという位置づけだが、
// 実際の定期購読課金にはストア側でのサブスクリプション商品登録と、更新/解約
// 状態をサーバー側で検証する仕組み(App Store Server Notifications /
// Play Real-time Developer Notifications)が別途必要で、このリポジトリの
// 開発環境だけでは用意・疎通確認ができない。そのため現状は凪・隣と同じ
// AsyncStorageスタブで「購入済みかどうか」だけを表現しており、更新・解約の
// タイミング管理は本番実装で追加する必要がある。
export function usePremiumPurchase() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREMIUM_STORAGE_KEY)
      .then((value) => setIsUnlocked(value === 'true'))
      .finally(() => setLoading(false));
  }, []);

  const unlock = useCallback(async () => {
    setPurchasing(true);
    try {
      const success = await purchaseUnlockAll();
      if (success) {
        await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, 'true');
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
      const stored = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
      const restored = stored === 'true';
      if (restored) setIsUnlocked(true);
      return restored;
    } finally {
      setPurchasing(false);
    }
  }, []);

  return { isUnlocked, loading, purchasing, unlock, restore };
}

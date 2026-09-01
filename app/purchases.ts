import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'nagi.unlockAll.v1';

// ---------------------------------------------------------------------------
// ストア連携の差し込みポイント
//
// ここは実際の課金SDK(react-native-iap や expo-in-app-purchases)に
// 差し替える前提のスタブ実装。App Store Connect / Google Play Console 側で
// 非消耗型(non-consumable)商品を作成できるのはApple/Googleアカウントを
// 持つ人間の作業のため、このリポジトリだけでは完結できない。
//
// 差し替え手順の目安(react-native-iap の場合):
//   1. App Store Connect / Play Console に非消耗型商品を作成
//      (例: プロダクトID "unlock_all_sounds")
//   2. `npm install react-native-iap` して initConnection()
//   3. requestPurchase({ sku: 'unlock_all_sounds' }) を purchaseUnlockAll() の
//      中身と差し替え、購入完了イベント(purchaseUpdatedListener)を待って
//      finishTransaction() を呼んでから true を返す
//   4. restorePurchases() は getAvailablePurchases() の結果で判定する
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

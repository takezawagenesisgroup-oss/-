import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kehai.nickname.v1';
const MAX_LENGTH = 12;

// ニックネームの設定自体は無料。設定した名前を実際にセリフの中で
// 呼んでもらえるかどうか(name.ts参照)はプレミアム機能側で判定する。
export function useNickname() {
  const [nickname, setNicknameState] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => setNicknameState(value ?? ''))
      .finally(() => setLoading(false));
  }, []);

  const setNickname = useCallback((value: string) => {
    const trimmed = value.slice(0, MAX_LENGTH);
    setNicknameState(trimmed);
    AsyncStorage.setItem(STORAGE_KEY, trimmed).catch(() => {});
  }, []);

  return { nickname, setNickname, loading };
}

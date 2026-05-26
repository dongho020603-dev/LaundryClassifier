import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@closet_items';

export interface ClosetItem {
  id: string;
  name: string;
  category: '상의' | '하의' | '아우터' | '기타';
  memo: string;
  labels: string[];       // 인식된 심볼 라벨 키 배열
  overallState: string;   // 'safe' | 'caution' | 'forbidden' | 'pro'
  savedAt: string;        // ISO date string
}

export async function getClosetItems(): Promise<ClosetItem[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

export async function saveClosetItem(item: ClosetItem): Promise<void> {
  const items = await getClosetItems();
  items.unshift(item);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function deleteClosetItem(id: string): Promise<void> {
  const items = await getClosetItems();
  const filtered = items.filter(i => i.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

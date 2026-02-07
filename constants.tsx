
import { Category, CategoryType } from './types';

export const HSK_CATEGORIES: Category[] = [
  { id: 'hsk1', name: 'HSK 1', type: CategoryType.HSK, level: 1, icon: '🌱' },
  { id: 'hsk2', name: 'HSK 2', type: CategoryType.HSK, level: 2, icon: '🌿' },
  { id: 'hsk3', name: 'HSK 3', type: CategoryType.HSK, level: 3, icon: '🌳' },
  { id: 'hsk4', name: 'HSK 4', type: CategoryType.HSK, level: 4, icon: '⛰️' },
  { id: 'hsk5', name: 'HSK 5', type: CategoryType.HSK, level: 5, icon: '🏔️' },
  { id: 'hsk6', name: 'HSK 6', type: CategoryType.HSK, level: 6, icon: '🏆' },
];

export const YCT_CATEGORIES: Category[] = [
  { id: 'yct1', name: 'YCT 1', type: CategoryType.YCT, level: 21, icon: '🧸' },
  { id: 'yct2', name: 'YCT 2', type: CategoryType.YCT, level: 22, icon: '🎈' },
  { id: 'yct3', name: 'YCT 3', type: CategoryType.YCT, level: 23, icon: '🚲' },
  { id: 'yct4', name: 'YCT 4', type: CategoryType.YCT, level: 24, icon: '🎨' },
  { id: 'yct5', name: 'YCT 5', type: CategoryType.YCT, level: 25, icon: '🪁' },
  { id: 'yct6', name: 'YCT 6', type: CategoryType.YCT, level: 26, icon: '🚀' },
];

export const TOPIC_CATEGORIES: Category[] = [
  { id: 'food', name: 'Ẩm thực', type: CategoryType.TOPIC, level: 10, icon: '🥟' },
  { id: 'travel', name: 'Du lịch', type: CategoryType.TOPIC, level: 11, icon: '✈️' },
  { id: 'business', name: 'Kinh doanh', type: CategoryType.TOPIC, level: 12, icon: '💼' },
  { id: 'daily', name: 'Đời sống', type: CategoryType.TOPIC, level: 13, icon: '🏠' },
  { id: 'tech', name: 'Công nghệ', type: CategoryType.TOPIC, level: 14, icon: '💻' },
  { id: 'emotion', name: 'Cảm xúc', type: CategoryType.TOPIC, level: 15, icon: '❤️' },
];


import React from 'react';
import { Category, CategoryType } from './types';

export const HSK_CATEGORIES: Category[] = [
  { id: 'hsk1', name: 'HSK 1', type: CategoryType.HSK, level: 1, icon: '🌱' },
  { id: 'hsk2', name: 'HSK 2', type: CategoryType.HSK, level: 2, icon: '🌿' },
  { id: 'hsk3', name: 'HSK 3', type: CategoryType.HSK, level: 3, icon: '🌳' },
  { id: 'hsk4', name: 'HSK 4', type: CategoryType.HSK, level: 4, icon: '⛰️' },
  { id: 'hsk5', name: 'HSK 5', type: CategoryType.HSK, level: 5, icon: '🏔️' },
  { id: 'hsk6', name: 'HSK 6', type: CategoryType.HSK, level: 6, icon: '🏆' },
];

export const TOPIC_CATEGORIES: Category[] = [
  { id: 'food', name: 'Ẩm thực', type: CategoryType.TOPIC, icon: '🥟' },
  { id: 'travel', name: 'Du lịch', type: CategoryType.TOPIC, icon: '✈️' },
  { id: 'business', name: 'Kinh doanh', type: CategoryType.TOPIC, icon: '💼' },
  { id: 'daily', name: 'Đời sống', type: CategoryType.TOPIC, icon: '🏠' },
  { id: 'tech', name: 'Công nghệ', type: CategoryType.TOPIC, icon: '💻' },
  { id: 'emotion', name: 'Cảm xúc', type: CategoryType.TOPIC, icon: '❤️' },
];

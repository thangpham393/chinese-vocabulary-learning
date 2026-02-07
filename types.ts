
export enum CategoryType {
  HSK = 'HSK',
  TOPIC = 'TOPIC',
  YCT = 'YCT'
}

export interface VocabularyItem {
  id: string;
  word: string;
  pinyin: string;
  partOfSpeech: string;
  definitionVi: string;
  definitionEn: string;
  exampleZh: string;
  exampleVi: string;
  imageUrl?: string;
}

export interface Lesson {
  id: string;
  number: number;
  title: string;
  description: string;
  level?: number;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  level: number;
  icon: string;
}

export enum AppMode {
  HOME = 'HOME',
  LESSON_SELECT = 'LESSON_SELECT',
  STUDY_MODE_SELECT = 'STUDY_MODE_SELECT',
  FLASHCARD = 'FLASHCARD',
  REVIEW = 'REVIEW',
  LISTENING = 'LISTENING',
  GLOBAL_REVIEW_SELECT = 'GLOBAL_REVIEW_SELECT'
}

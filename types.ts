
export enum CategoryType {
  HSK = 'HSK',
  TOPIC = 'TOPIC'
}

export interface VocabularyItem {
  id: string;
  word: string; // Hanzi
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
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  level?: number;
  icon: string;
}

export enum AppMode {
  HOME = 'HOME',
  LESSON_SELECT = 'LESSON_SELECT',
  LOADING = 'LOADING',
  STUDY_MODE_SELECT = 'STUDY_MODE_SELECT',
  FLASHCARD = 'FLASHCARD',
  REVIEW = 'REVIEW',
  SUMMARY = 'SUMMARY',
  LISTENING_PRACTICE_SELECT = 'LISTENING_PRACTICE_SELECT',
  LISTENING_PRACTICE = 'LISTENING_PRACTICE'
}

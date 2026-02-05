
import { Lesson, VocabularyItem } from "../types";

// Khởi tạo các record trống. Dữ liệu sẽ được lấp đầy bởi người dùng qua tính năng Import.
export const HSK_STATIC_LESSONS: Record<number, Lesson[]> = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
};

export const HSK_STATIC_VOCABULARY: Record<string, VocabularyItem[]> = {};

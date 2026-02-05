
import React from 'react';
import { Category } from '../types';

interface CategoryCardProps {
  category: Category;
  onClick: (category: Category) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick }) => {
  return (
    <button
      onClick={() => onClick(category)}
      className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-indigo-400 hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group"
    >
      <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
        {category.icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{category.name}</h3>
      <p className="text-sm text-gray-500">
        {category.type === 'HSK' ? `Cấp độ ${category.level}` : 'Chủ đề từ vựng'}
      </p>
    </button>
  );
};

export default CategoryCard;


import React from 'react';
import { Category, CategoryType } from '../types';

interface CategoryCardProps {
  category: Category;
  onClick: (category: Category) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick }) => {
  const getGradient = (cat: Category) => {
    if (cat.type === CategoryType.YCT) return 'from-rose-50 to-rose-100/30 text-rose-600';
    if (cat.level <= 2) return 'from-emerald-50 to-emerald-100/30 text-emerald-600';
    if (cat.level <= 4) return 'from-blue-50 to-blue-100/30 text-blue-600';
    if (cat.level <= 6) return 'from-indigo-50 to-indigo-100/30 text-indigo-600';
    return 'from-slate-50 to-slate-100/30 text-slate-600';
  };

  const getIconBg = (cat: Category) => {
    if (cat.type === CategoryType.YCT) return 'bg-rose-500';
    if (cat.level <= 2) return 'bg-emerald-500';
    if (cat.level <= 4) return 'bg-blue-500';
    if (cat.level <= 6) return 'bg-indigo-500';
    return 'bg-slate-900';
  };

  return (
    <button
      onClick={() => onClick(category)}
      className={`relative overflow-hidden bg-white p-6 rounded-[2.5rem] bento-shadow bento-shadow-hover transition-all duration-500 flex flex-col items-center text-center group border border-slate-50 hover:-translate-y-2`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${getGradient(category)} opacity-50 blur-3xl -mr-16 -mt-16 group-hover:opacity-100 transition-opacity`}></div>
      
      <div className={`w-20 h-20 ${getIconBg(category)} rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-2xl shadow-slate-200 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
        {category.icon}
      </div>
      
      <div className="relative z-10">
        <h3 className="text-xl font-extrabold text-slate-900 mb-1 group-hover:text-black transition-colors">{category.name}</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          {category.type} {category.type !== CategoryType.TOPIC ? `LVL ${category.type === CategoryType.YCT ? category.level - 20 : category.level}` : ''}
        </p>
      </div>

      <div className="mt-8 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
        <span className="text-xs font-bold text-slate-600">Bắt đầu học</span>
        <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
      </div>
    </button>
  );
};

export default CategoryCard;

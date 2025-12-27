
import React from 'react';

interface BigButtonProps {
  label: string;
  icon?: string;
  onClick: () => void;
  color?: 'maya-blue' | 'maya-teal' | 'red' | 'yellow' | 'slate';
  fullWidth?: boolean;
  disabled?: boolean;
}

const BigButton: React.FC<BigButtonProps> = ({ 
  label, 
  icon, 
  onClick, 
  color = 'maya-blue', 
  fullWidth = true,
  disabled = false
}) => {
  const colorClasses = {
    'maya-blue': 'bg-[#0a3a6b] active:bg-[#082d54] text-white',
    'maya-teal': 'bg-[#26bba4] active:bg-[#1e9683] text-white',
    red: 'bg-rose-600 active:bg-rose-800 text-white',
    yellow: 'bg-amber-500 active:bg-amber-600 text-white',
    slate: 'bg-slate-200 text-slate-700 active:bg-slate-300'
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`
        ${fullWidth ? 'w-full' : ''}
        ${colorClasses[color]}
        ${disabled ? 'opacity-50 grayscale' : 'shadow-xl'}
        flex flex-col items-center justify-center p-8 rounded-[2rem] 
        transition-all transform active:scale-95 border-b-8 
        ${color === 'slate' ? 'border-slate-400' : 'border-black/20'}
      `}
    >
      {icon && <i className={`${icon} text-5xl mb-4`}></i>}
      <span className="text-2xl font-black uppercase tracking-widest italic">{label}</span>
    </button>
  );
};

export default BigButton;

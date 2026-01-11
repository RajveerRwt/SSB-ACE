
import React from 'react';

export const SSBLogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield Base - Dark Navy with Slate Border */}
      <path d="M50 95C25 82 12 55 12 25L50 8L88 25C88 55 75 82 50 95Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="3"/>
      
      {/* Wings - Yellow/Gold */}
      <path d="M50 78 C35 72 20 50 18 30 L30 30 C35 45 42 62 50 68 Z" fill="#fbbf24"/>
      <path d="M50 78 C65 72 80 50 82 30 L70 30 C65 45 58 62 50 68 Z" fill="#fbbf24"/>
      
      <path d="M50 65 C40 60 30 45 28 35 L38 35 C40 42 45 55 50 58 Z" fill="#fbbf24"/>
      <path d="M50 65 C60 60 70 45 72 35 L62 35 C60 42 55 55 50 58 Z" fill="#fbbf24"/>

      {/* Center Target - Navy & Yellow */}
      <circle cx="50" cy="78" r="8" fill="#1e293b" stroke="#fbbf24" strokeWidth="2"/>
      <circle cx="50" cy="78" r="3" fill="#fbbf24"/>
    </svg>
  );
};

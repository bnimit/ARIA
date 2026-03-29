'use client';
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  padding?: string | number;
}

export function Card({ children, style, className, onClick, hoverable, padding = '22px' }: CardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding,
        boxShadow: 'var(--shadow)',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        cursor: onClick || hoverable ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={
        hoverable || onClick
          ? (e) => {
              e.currentTarget.style.borderColor = 'var(--border-2)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          : undefined
      }
      onMouseLeave={
        hoverable || onClick
          ? (e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'var(--shadow)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

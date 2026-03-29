"use client";

import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, footer, width = 480 }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(13, 13, 20, 0.40)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        width: '100%',
        maxWidth: width,
        animation: 'fadeInScale 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.14), 0 4px 12px rgba(0, 0, 0, 0.06)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--ink-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '17px',
              lineHeight: 1,
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--ink)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.color = 'var(--ink-3)';
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>{children}</div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            background: 'var(--surface-2)',
            borderRadius: '0 0 calc(var(--radius-xl) - 1px) calc(var(--radius-xl) - 1px)',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

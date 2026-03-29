'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { Sidebar } from './Sidebar';

const AUTH_PATHS = ['/auth/'];

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
}

function TopBar() {
  const { user } = useAuth();

  return (
    <div style={{
      height: 64,
      background: '#FFFFFF',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      flexShrink: 0,
    }}>
      {/* Search bar */}
      <div style={{ position: 'relative', width: 340 }}>
        <span style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--ink-3)',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search communities, posts, jobs..."
          style={{
            width: '100%',
            height: 38,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '0 14px 0 36px',
            fontSize: '13.5px',
            color: 'var(--ink)',
            fontFamily: "'Nunito', sans-serif",
            outline: 'none',
          }}
        />
      </div>

      {/* Right side: notifications + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Notification bell */}
        <button style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--ink-2)',
          position: 'relative',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {/* Notification dot */}
          <span style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#EF4444',
            border: '1.5px solid white',
          }} />
        </button>

        {/* User avatar */}
        {user && (
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0D7A65, #14B89A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: 'white',
            cursor: 'pointer',
            flexShrink: 0,
          }}>
            {initials(user.name)}
          </div>
        )}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading } = useAuth();
  const isAuthPage = AUTH_PATHS.some(p => pathname.startsWith(p));

  if (isAuthPage) return <>{children}</>;

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)',
      }}>
        <div style={{
          width: 28, height: 28,
          border: '2.5px solid var(--border-2)',
          borderTopColor: 'var(--brand)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar />
        <main style={{
          flex: 1,
          padding: '28px 32px',
          overflowX: 'hidden',
          overflowY: 'auto',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}

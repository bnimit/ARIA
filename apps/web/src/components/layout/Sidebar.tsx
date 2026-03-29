"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

const mainNav = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/subreddits',
    label: 'Communities',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/>
      </svg>
    ),
  },
  {
    href: '/jobs',
    label: 'Jobs',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
];

const otherNav = [
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

function SidebarLink({
  href, label, icon, active,
}: {
  href: string; label: string; icon: React.ReactNode; active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 12px',
        borderRadius: '10px',
        fontSize: '13.5px',
        fontWeight: active ? 700 : 500,
        color: active ? '#0D7A65' : '#64748B',
        background: active ? 'rgba(13,122,101,0.09)' : 'transparent',
        transition: 'all 0.13s ease',
        textDecoration: 'none',
        letterSpacing: '-0.01em',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
          e.currentTarget.style.color = 'var(--ink)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#64748B';
        }
      }}
    >
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        flexShrink: 0,
      }}>
        {icon}
      </span>
      {label}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '10px',
      fontWeight: 700,
      color: '#9CA3AF',
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
      padding: '0 12px',
      marginBottom: '4px',
      marginTop: '20px',
    }}>
      {children}
    </div>
  );
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: '#FFFFFF',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
    }}>

      {/* ── Logo ────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Logomark: teal gradient square */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #0D7A65 0%, #14B89A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2"  y="9"  width="2" height="7" rx="1" fill="white" opacity="0.5"/>
              <rect x="5"  y="6"  width="2" height="10" rx="1" fill="white" opacity="0.7"/>
              <rect x="8"  y="3"  width="2" height="13" rx="1" fill="white"/>
              <rect x="11" y="5"  width="2" height="11" rx="1" fill="white" opacity="0.7"/>
              <rect x="14" y="8"  width="2" height="8"  rx="1" fill="white" opacity="0.5"/>
            </svg>
          </div>
          <div>
            <div style={{
              fontFamily: "'Nunito', sans-serif",
              fontSize: '17px',
              fontWeight: 900,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}>
              ARIA
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--ink-3)', marginTop: '3px', fontWeight: 500 }}>
              Reddit Intelligence
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 14px 4px' }} />

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav style={{ padding: '4px 10px 0', flex: 1 }}>
        <SectionLabel>Main Menu</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {mainNav.map((item) => (
            <SidebarLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>

        <SectionLabel>Other</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {otherNav.map((item) => (
            <SidebarLink key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      {/* ── User footer ─────────────────────────────────────── */}
      <div style={{ padding: '12px 10px 18px' }}>
        <div style={{ height: 1, background: 'var(--border)', marginBottom: '12px' }} />
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: '8px 10px', borderRadius: 10,
            background: 'var(--surface-2)',
          }}>
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #0D7A65, #14B89A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: 'white',
            }}>
              {initials(user.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ink-3)', padding: '2px', borderRadius: 5,
                display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-3)'; }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

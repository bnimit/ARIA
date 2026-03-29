'use client';

import React from 'react';

// ── Auth page shell ────────────────────────────────────────────────────────────
// Full-screen centered layout with animated background mesh

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      fontFamily: "'Nunito', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      padding: '24px',
    }}>
      {/* Ambient background orbs */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
      }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: '55vw', height: '55vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13,122,101,0.07) 0%, transparent 70%)',
          animation: 'authOrb1 12s ease-in-out infinite alternate',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-8%',
          width: '45vw', height: '45vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,184,154,0.06) 0%, transparent 70%)',
          animation: 'authOrb2 10s ease-in-out infinite alternate',
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '20%',
          width: '25vw', height: '25vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14,165,160,0.05) 0%, transparent 70%)',
          animation: 'authOrb3 14s ease-in-out infinite alternate',
        }} />
      </div>

      {/* Logo mark — top center */}
      <div style={{
        position: 'absolute', top: '28px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '8px',
        animation: 'authSlideDown 0.5s cubic-bezier(0.16,1,0.3,1) both',
        zIndex: 2,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'linear-gradient(135deg, #0D7A65 0%, #14B89A 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59,123,248,0.30)',
        }}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <rect x="2"  y="9"  width="2" height="7" rx="1" fill="white" opacity="0.5"/>
            <rect x="5"  y="6"  width="2" height="10" rx="1" fill="white" opacity="0.7"/>
            <rect x="8"  y="3"  width="2" height="13" rx="1" fill="white"/>
            <rect x="11" y="5"  width="2" height="11" rx="1" fill="white" opacity="0.7"/>
            <rect x="14" y="8"  width="2" height="8"  rx="1" fill="white" opacity="0.5"/>
          </svg>
        </div>
        <span style={{
          fontWeight: 900, fontSize: '17px', color: 'var(--ink)',
          letterSpacing: '-0.04em',
        }}>ARIA</span>
      </div>

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 400,
        background: 'var(--surface)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        boxShadow: '0 2px 4px rgba(17,24,39,0.04), 0 12px 40px rgba(17,24,39,0.08)',
        padding: '40px 36px',
        animation: 'authCardIn 0.55s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Keep AuthLayout for backward compat (wraps AuthShell) ─────────────────────
export function AuthLayout({ children, brand: _brand }: {
  children: React.ReactNode;
  brand: { title: string; subtitle: string };
}) {
  return <AuthShell>{children}</AuthShell>;
}

// ── Form field wrapper ────────────────────────────────────────────────────────

export function Field({ label, htmlFor, children, extra, delay = 0 }: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
  delay?: number;
}) {
  return (
    <div style={{
      animation: `authSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '6px',
      }}>
        <label htmlFor={htmlFor} style={{
          fontSize: '12px', fontWeight: 700, color: 'var(--ink-3)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {label}
        </label>
        {extra}
      </div>
      {children}
    </div>
  );
}

// ── Text input ────────────────────────────────────────────────────────────────

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%', height: '44px', padding: '0 14px',
        background: 'var(--surface-2)',
        border: '1.5px solid var(--border)',
        borderRadius: '10px',
        color: 'var(--ink)', fontSize: '14px',
        fontFamily: "'Nunito', sans-serif", fontWeight: 600,
        outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
        ...props.style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--brand)';
        e.currentTarget.style.background = 'var(--surface)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,123,248,0.12)';
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'var(--surface-2)';
        e.currentTarget.style.boxShadow = 'none';
        props.onBlur?.(e);
      }}
    />
  );
}

// ── Password input ────────────────────────────────────────────────────────────

export function PasswordInput({
  show, onToggle, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { show: boolean; onToggle: () => void }) {
  return (
    <div style={{ position: 'relative' }}>
      <Input {...props} type={show ? 'text' : 'password'} style={{ paddingRight: '44px' }} />
      <button
        type="button" onClick={onToggle}
        style={{
          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: 'var(--ink-3)',
          cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}
      >
        {show ? (
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '10px 12px', borderRadius: '10px',
      background: 'var(--error-dim)',
      border: '1px solid rgba(220,38,38,0.18)',
      fontSize: '12.5px', color: 'var(--error)', fontWeight: 600,
      animation: 'authSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {message}
    </div>
  );
}

// ── Submit button ─────────────────────────────────────────────────────────────

export function SubmitButton({ loading, children, delay = 0 }: {
  loading: boolean;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%', height: '46px',
        background: loading ? 'rgba(59,123,248,0.65)' : 'var(--brand)',
        color: '#fff', border: 'none',
        borderRadius: '12px', fontSize: '14px', fontWeight: 700,
        fontFamily: "'Nunito', sans-serif",
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        transition: 'all 0.15s',
        boxShadow: loading ? 'none' : '0 4px 16px rgba(59,123,248,0.28)',
        letterSpacing: '-0.01em',
        animation: `authSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
      }}
      onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.filter = 'brightness(0.93)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
      onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {loading && (
        <span style={{
          width: 15, height: 15,
          border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
          borderRadius: '50%', animation: 'spin 0.65s linear infinite',
          flexShrink: 0,
        }} />
      )}
      {children}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function AuthDivider() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      margin: '4px 0',
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: '11px', color: 'var(--ink-4)', fontWeight: 600, letterSpacing: '0.04em' }}>OR</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

export const authStyles = {
  heading: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: '22px', fontWeight: 900, color: 'var(--ink)',
    letterSpacing: '-0.04em', lineHeight: 1.2,
  } as React.CSSProperties,
  subheading: {
    fontSize: '13px', color: 'var(--ink-3)', marginTop: '5px', fontWeight: 500, lineHeight: 1.5,
  } as React.CSSProperties,
  forgotLink: {
    fontSize: '11.5px', color: 'var(--brand)', fontWeight: 700, textDecoration: 'none',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,
  switchText: {
    textAlign: 'center' as const, fontSize: '13px', color: 'var(--ink-3)',
    marginTop: '20px', fontWeight: 500,
  },
  switchLink: {
    color: 'var(--brand)', fontWeight: 700, textDecoration: 'none',
  } as React.CSSProperties,
};

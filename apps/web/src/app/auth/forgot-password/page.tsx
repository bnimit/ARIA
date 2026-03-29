'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/auth';
import { AuthShell, Field, Input, ErrorBanner, SubmitButton, authStyles } from '@/components/auth/AuthUI';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setSent(true);
      if (res._devToken) setDevToken(res._devToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell>
        <div style={{ textAlign: 'center', animation: 'authCardIn 0.45s cubic-bezier(0.16,1,0.3,1) both' }}>
          {/* Check icon */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--success-dim)',
            border: '1.5px solid rgba(22,163,74,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--success)" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 style={authStyles.heading}>Check your email</h1>
          <p style={{ ...authStyles.subheading, marginTop: '8px' }}>
            If <strong style={{ color: 'var(--ink-2)', fontWeight: 700 }}>{email}</strong> has an account,
            a reset link was sent.
          </p>

          {devToken && (
            <div style={{
              marginTop: '20px', padding: '12px 14px', borderRadius: '10px', textAlign: 'left',
              background: 'var(--brand-dim)', border: '1px solid var(--brand-border)',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                Dev Token
              </div>
              <code style={{ fontSize: '11px', color: 'var(--ink-2)', wordBreak: 'break-all', fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
                {devToken}
              </code>
              <div style={{ marginTop: '8px' }}>
                <Link href={`/auth/reset-password?token=${devToken}`} style={{ fontSize: '12px', color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }}>
                  Use this token →
                </Link>
              </div>
            </div>
          )}

          <Link href="/auth/signin" style={{ ...authStyles.switchLink, display: 'inline-block', marginTop: '24px', fontSize: '13px' }}>
            ← Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div style={{ marginBottom: '28px', animation: 'authSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) 80ms both' }}>
        <h1 style={authStyles.heading}>Reset password</h1>
        <p style={authStyles.subheading}>Enter your email and we'll send a reset link</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Field label="Email" htmlFor="email" delay={120}>
          <Input
            id="email" type="email" autoFocus
            placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        {error && <ErrorBanner message={error} />}

        <SubmitButton loading={loading} delay={160}>Send reset link</SubmitButton>
      </form>

      <p style={{ ...authStyles.switchText, animation: 'authSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) 200ms both' }}>
        <Link href="/auth/signin" style={authStyles.switchLink}>← Back to sign in</Link>
      </p>
    </AuthShell>
  );
}

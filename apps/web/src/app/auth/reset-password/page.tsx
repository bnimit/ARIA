'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/auth';
import { AuthShell, Field, PasswordInput, ErrorBanner, SubmitButton, authStyles } from '@/components/auth/AuthUI';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!token) { setError('Reset token is missing. Please request a new link.'); return; }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace('/auth/signin'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ textAlign: 'center', animation: 'authCardIn 0.45s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--success-dim)', border: '1.5px solid rgba(22,163,74,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--success)" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 style={authStyles.heading}>Password updated</h1>
        <p style={{ ...authStyles.subheading, marginTop: '8px' }}>
          Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '28px', animation: 'authSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) 80ms both' }}>
        <h1 style={authStyles.heading}>New password</h1>
        <p style={authStyles.subheading}>Choose a strong password for your account</p>
      </div>

      {!token && (
        <div style={{
          marginBottom: '16px', padding: '10px 12px', borderRadius: '10px',
          background: 'var(--warning-dim)', border: '1px solid rgba(217,119,6,0.2)',
          fontSize: '12.5px', color: 'var(--warning)', fontWeight: 600,
        }}>
          No reset token found — please request a new link.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Field label="New password" htmlFor="password" delay={120}>
          <PasswordInput
            id="password" value={password} onChange={(e) => setPassword(e.target.value)}
            show={showPassword} onToggle={() => setShowPassword(s => !s)}
            placeholder="At least 8 characters"
            required
          />
        </Field>

        <Field label="Confirm password" htmlFor="confirmPassword" delay={160}>
          <PasswordInput
            id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            show={showPassword} onToggle={() => setShowPassword(s => !s)}
            placeholder="Re-enter new password"
            required
          />
        </Field>

        {error && <ErrorBanner message={error} />}

        <SubmitButton loading={loading} delay={200}>Set new password</SubmitButton>
      </form>

      <p style={{ ...authStyles.switchText, animation: 'authSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) 240ms both' }}>
        <Link href="/auth/signin" style={authStyles.switchLink}>← Back to sign in</Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px' }}>
          Loading…
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}

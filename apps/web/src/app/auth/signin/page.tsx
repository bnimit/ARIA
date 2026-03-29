'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from '@/lib/auth';
import { useAuth } from '@/components/auth/AuthProvider';
import { AuthShell, Field, Input, PasswordInput, ErrorBanner, SubmitButton, authStyles } from '@/components/auth/AuthUI';

export default function SignInPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await signIn(email.trim(), password);
      login(token, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {/* Header */}
      <div style={{ marginBottom: '28px', animation: 'authSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) 80ms both' }}>
        <h1 style={authStyles.heading}>Welcome back</h1>
        <p style={authStyles.subheading}>Sign in to continue to your workspace</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Field label="Email" htmlFor="email" delay={120}>
          <Input
            id="email" type="email" autoComplete="email" autoFocus
            placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          delay={160}
          extra={<Link href="/auth/forgot-password" style={authStyles.forgotLink}>Forgot?</Link>}
        >
          <PasswordInput
            id="password" value={password} onChange={(e) => setPassword(e.target.value)}
            show={showPassword} onToggle={() => setShowPassword(s => !s)}
            placeholder="Your password"
            required
          />
        </Field>

        {error && <ErrorBanner message={error} />}

        <SubmitButton loading={loading} delay={200}>Sign in</SubmitButton>
      </form>

      <p style={{ ...authStyles.switchText, animation: 'authSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) 240ms both' }}>
        No account?{' '}
        <Link href="/auth/signup" style={authStyles.switchLink}>Create one</Link>
      </p>
    </AuthShell>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signUp } from '@/lib/auth';
import { useAuth } from '@/components/auth/AuthProvider';
import { AuthShell, Field, Input, PasswordInput, ErrorBanner, SubmitButton, authStyles } from '@/components/auth/AuthUI';

export default function SignUpPage() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await signUp(email.trim(), password, name.trim());
      login(token, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {/* Header */}
      <div style={{ marginBottom: '28px', animation: 'authSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) 80ms both' }}>
        <h1 style={authStyles.heading}>Create account</h1>
        <p style={authStyles.subheading}>Start analyzing Reddit communities for free</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Field label="Name" htmlFor="name" delay={120}>
          <Input
            id="name" type="text" autoComplete="name" autoFocus
            placeholder="Your name"
            value={name} onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <Field label="Email" htmlFor="email" delay={155}>
          <Input
            id="email" type="email" autoComplete="email"
            placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field label="Password" htmlFor="password" delay={190}>
          <PasswordInput
            id="password" value={password} onChange={(e) => setPassword(e.target.value)}
            show={showPassword} onToggle={() => setShowPassword(s => !s)}
            placeholder="At least 8 characters"
            required
          />
        </Field>

        <Field label="Confirm password" htmlFor="confirmPassword" delay={225}>
          <Input
            id="confirmPassword" type="password"
            placeholder="Re-enter password"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Field>

        {error && <ErrorBanner message={error} />}

        <SubmitButton loading={loading} delay={260}>Create account</SubmitButton>
      </form>

      <p style={{ ...authStyles.switchText, animation: 'authSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) 300ms both' }}>
        Already have an account?{' '}
        <Link href="/auth/signin" style={authStyles.switchLink}>Sign in</Link>
      </p>
    </AuthShell>
  );
}

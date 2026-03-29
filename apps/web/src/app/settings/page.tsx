"use client";

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { getSettings, saveSettings, Settings } from '@/lib/api';

type ToastKind = 'success' | 'error' | 'info';

function Toast({ kind, message, onDismiss }: { kind: ToastKind; message: string; onDismiss: () => void }) {
  const icons: Record<ToastKind, string> = { success: '✓', error: '✕', info: 'ℹ' };
  const colors: Record<ToastKind, string> = {
    success: 'var(--success)',
    error: 'var(--error)',
    info: 'var(--brand)',
  };

  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`toast ${kind}`}>
      <span style={{ color: colors[kind], fontWeight: 700, flexShrink: 0 }}>{icons[kind]}</span>
      <span>{message}</span>
    </div>
  );
}

interface KeyFieldProps {
  label: string;
  description: string;
  placeholder: string;
  currentMasked?: string;
  value: string;
  onChange: (v: string) => void;
  provider: string;
}

function KeyField({ label, description, placeholder, currentMasked, value, onChange, provider }: KeyFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '14px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', marginBottom: '4px' }}>
            {label}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-3)', lineHeight: 1.5, fontWeight: 400 }}>{description}</div>
        </div>
        {currentMasked && (
          <div
            style={{
              padding: '3px 10px',
              borderRadius: '100px',
              background: 'var(--success-dim)',
              border: '1px solid rgba(22, 163, 74, 0.22)',
              fontSize: '11px',
              color: 'var(--success)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            ✓ Configured
          </div>
        )}
      </div>

      {currentMasked && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--surface-2)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius)',
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Current:
          </span>
          <span style={{ fontSize: '12px', color: 'var(--ink-2)', fontFamily: "'DM Mono', monospace" }}>
            {currentMasked}
          </span>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            height: '40px',
            padding: '0 40px 0 14px',
            background: 'var(--surface-2)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--ink)',
            fontSize: '13px',
            outline: 'none',
            fontFamily: "'DM Mono', monospace",
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = 'var(--brand)')}
          onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = 'var(--border)')}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--ink-3)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {show ? (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; kind: ToastKind; message: string }[]>([]);

  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  const addToast = (kind: ToastKind, message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, kind, message }]);
  };

  const removeToast = (id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSettings(s);
      })
      .catch(() => {
        addToast('error', 'Failed to load settings');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Partial<Settings> = {};
      if (anthropicKey.trim()) updates.anthropicKey = anthropicKey.trim();
      if (openaiKey.trim()) updates.openaiKey = openaiKey.trim();
      if (geminiKey.trim()) updates.geminiKey = geminiKey.trim();

      if (Object.keys(updates).length === 0) {
        addToast('info', 'No changes to save');
        return;
      }

      await saveSettings(updates);
      addToast('success', 'API keys saved successfully');

      // Refresh to show new masked values
      const fresh = await getSettings();
      setSettings(fresh);
      setAnthropicKey('');
      setOpenaiKey('');
      setGeminiKey('');
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header
        title="Settings"
        subtitle="Configure AI provider API keys"
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <Spinner size={28} />
        </div>
      ) : (
        <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Info banner */}
          <div
            style={{
              background: 'var(--brand-dim)',
              border: '1.5px solid var(--brand-border)',
              borderRadius: 'var(--radius)',
              padding: '12px 16px',
              fontSize: '13px',
              color: 'var(--ink-2)',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: 'var(--brand)', fontFamily: "'Nunito', sans-serif" }}>🔒 API keys are encrypted at rest.</strong>
            {' '}Leave a field empty to keep the existing key. Enter a new value to update it.
          </div>

          <KeyField
            label="Anthropic API Key"
            description="Used for Claude models (claude-3-haiku, claude-3-sonnet). Recommended for best analysis quality."
            placeholder="sk-ant-api03-..."
            currentMasked={settings.anthropicKey}
            value={anthropicKey}
            onChange={setAnthropicKey}
            provider="anthropic"
          />

          <KeyField
            label="OpenAI API Key"
            description="Used for GPT-4 and GPT-3.5 models as an alternative analysis provider."
            placeholder="sk-..."
            currentMasked={settings.openaiKey}
            value={openaiKey}
            onChange={setOpenaiKey}
            provider="openai"
          />

          <KeyField
            label="Google Gemini API Key"
            description="Used for Gemini Pro models. Available as a fallback when other providers are unavailable."
            placeholder="AIza..."
            currentMasked={settings.geminiKey}
            value={geminiKey}
            onChange={setGeminiKey}
            provider="gemini"
          />

          {/* Save */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <Button variant="primary" size="lg" loading={saving} onClick={handleSave}>
              Save API Keys
            </Button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

          {/* About */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '22px',
              boxShadow: 'var(--shadow)',
            }}
          >
            <h3 style={{ fontFamily: "'Nunito', sans-serif", fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginBottom: '14px', letterSpacing: '-0.03em' }}>
              About Reddit Intel
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Platform', value: 'Reddit Intelligence SaaS' },
                { label: 'Version', value: '0.0.1' },
                { label: 'API', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-3)', width: '80px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--ink-2)', fontFamily: "'DM Mono', monospace" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} kind={t.kind} message={t.message} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </>
  );
}

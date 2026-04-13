'use client';

import { useState, useEffect } from 'react';

const TARGET = new Date('2026-04-17T10:00:00').getTime();

interface T { days: number; hours: number; minutes: number; seconds: number; }

function calc(): T {
  const d = TARGET - Date.now();
  if (d <= 0) return { days:0, hours:0, minutes:0, seconds:0 };
  return {
    days:    Math.floor(d / 86400000),
    hours:   Math.floor((d / 3600000) % 24),
    minutes: Math.floor((d / 60000)   % 60),
    seconds: Math.floor((d / 1000)    % 60),
  };
}

function Block({ value, label }: { value: number; label: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'var(--black-1)',
      border: '1px solid var(--border)',
      borderTop: '2px solid var(--orange)',
      borderRadius: 'var(--radius)',
      padding: '12px 16px',
      minWidth: 68,
    }}>
      <span style={{
        fontFamily: 'Bebas Neue, cursive',
        fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
        lineHeight: 1,
        color: 'var(--white)',
        letterSpacing: '0.02em',
      }}>{String(value).padStart(2,'0')}</span>
      <span style={{
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        fontSize: '0.6rem',
        color: 'var(--gray-2)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginTop: 5,
      }}>{label}</span>
    </div>
  );
}

export default function CountdownTimer() {
  const [t, setT] = useState<T | null>(null);
  useEffect(() => {
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  const done = t && !t.days && !t.hours && !t.minutes && !t.seconds;

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '0.68rem', color: 'var(--gray-2)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.9rem' }}>
        {done ? "C'est l'heure !" : 'Début du tournoi dans'}
      </p>
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <Block value={t?.days    ?? 0} label="jours" />
        <Colon />
        <Block value={t?.hours   ?? 0} label="heures" />
        <Colon />
        <Block value={t?.minutes ?? 0} label="min" />
        <Colon />
        <Block value={t?.seconds ?? 0} label="sec" />
      </div>
    </div>
  );
}

function Colon() {
  return <span style={{ fontFamily: 'Bebas Neue, cursive', fontSize: '1.8rem', color: 'var(--gray-3)', lineHeight: 1, paddingBottom: 12, userSelect: 'none' }}>:</span>;
}

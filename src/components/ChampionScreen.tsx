'use client';

import { useEffect, useRef } from 'react';
import { playChampionFanfare } from '@/lib/sounds';

interface Player { pseudo: string; avatar: string; game: string; }
interface Props  { champion: Player; onClose: () => void; }

export default function ChampionScreen({ champion, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { playChampionFanfare(); } catch (_) {}

    const container = containerRef.current;
    if (!container) return;
    const particles: HTMLElement[] = [];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      const x = (Math.random() - 0.5) * 400;
      const size = 4 + Math.random() * 7;
      el.style.cssText = `
        position: absolute;
        left: 50%;
        bottom: 20%;
        width: ${size}px;
        height: ${size}px;
        background: ${Math.random() > 0.5 ? '#FFD700' : '#FF6B00'};
        border-radius: 50%;
        --tx: ${x}px;
        animation: gold-particle ${1.5 + Math.random() * 2}s ease-out ${Math.random() * 1.5}s forwards infinite;
        pointer-events: none;
        z-index: 1;
      `;
      container.appendChild(el);
      particles.push(el);
    }

    const confetti: HTMLElement[] = [];
    const colors = ['#FFD700', '#FF6B00', '#ffffff', '#ff9900'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        width: ${7 + Math.random() * 9}px;
        height: ${7 + Math.random() * 9}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation-duration: ${2 + Math.random() * 3}s;
        animation-delay: ${Math.random() * 2}s;
      `;
      document.body.appendChild(el);
      confetti.push(el);
    }

    let cleanupTimer: ReturnType<typeof setTimeout>;
    return () => {
      particles.forEach((p) => p.remove());
      cleanupTimer = setTimeout(() => confetti.forEach((p) => p.remove()), 5000);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.96)',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 24,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--gray-2)', borderRadius: 'var(--radius-sm)',
          padding: '6px 14px', cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', fontSize: '0.82rem',
        }}
      >
        Fermer ✕
      </button>

      <div
        ref={containerRef}
        style={{
          position: 'relative', textAlign: 'center',
          padding: '3rem 2rem', maxWidth: 560, width: '100%', overflow: 'hidden',
          background: 'var(--black-1)', border: '1px solid var(--border)',
          borderTop: '2px solid var(--orange)',
          borderRadius: 'var(--radius)',
        }}
      >
        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem', lineHeight: 1 }}>👑</div>

        <div style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 600,
          fontSize: '0.68rem', color: 'var(--gray-2)',
          letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.75rem',
        }}>
          Champion du Tournoi
        </div>

        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>
          {champion.avatar}
        </div>

        <div style={{
          fontFamily: 'Bebas Neue, cursive',
          fontSize: 'clamp(3rem, 12vw, 6rem)',
          color: '#FFD700',
          letterSpacing: '0.04em',
          lineHeight: 1,
          marginBottom: '0.5rem',
        }}>
          {champion.pseudo}
        </div>

        <div style={{
          fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
          color: 'var(--gray-2)', marginBottom: '2rem',
        }}>
          {champion.game}
        </div>

        <div style={{ position: 'relative', width: 220, margin: '0 auto' }}>
          <NeymarCelebrate />
        </div>

        <div style={{ marginTop: '1.5rem', fontSize: '1.3rem', letterSpacing: '0.4em' }}>
          ⭐ ⭐ ⭐
        </div>
      </div>
    </div>
  );
}

function NeymarCelebrate() {
  return (
    <svg width="220" height="300" viewBox="0 0 220 300" style={{ display: 'block', margin: '0 auto', filter: 'drop-shadow(0 10px 30px rgba(255,215,0,0.25))' }}>
      <defs>
        <linearGradient id="goldJersey" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#CC9900" />
        </linearGradient>
        <linearGradient id="skinG2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8956C" />
          <stop offset="100%" stopColor="#A0714F" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="60" rx="30" ry="34" fill="#1a0800" />
      <path d="M100 44 Q110 22 120 44 Q114 40 110 38 Q106 40 100 44Z" fill="#2a1000" />
      <ellipse cx="110" cy="86" rx="32" ry="36" fill="url(#skinG2)" />
      <ellipse cx="97" cy="80" rx="6" ry="7" fill="#1a0a00" />
      <ellipse cx="123" cy="80" rx="6" ry="7" fill="#1a0a00" />
      <circle cx="99" cy="78" r="2" fill="white" />
      <circle cx="125" cy="78" r="2" fill="white" />
      <path d="M93 100 Q110 118 127 100" stroke="#7a4020" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M95 102 Q110 116 125 102" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="78" cy="92" r="3.5" fill="#FFD700" />
      <rect x="96" y="118" width="28" height="18" rx="5" fill="url(#skinG2)" />
      <path d="M68 134 L58 228 L162 228 L152 134 Q132 122 110 122 Q88 122 68 134Z" fill="url(#goldJersey)" />
      <text x="110" y="190" textAnchor="middle" fontFamily="Bebas Neue, cursive" fontSize="40" fill="white" opacity="0.9" fontWeight="bold">10</text>
      <g style={{ transform: 'rotate(-60deg)', transformOrigin: '58px 134px' }}>
        <rect x="38" y="134" width="24" height="72" rx="12" fill="url(#goldJersey)" />
        <ellipse cx="50" cy="212" rx="13" ry="11" fill="url(#skinG2)" />
      </g>
      <g style={{ transform: 'rotate(60deg)', transformOrigin: '162px 134px' }}>
        <rect x="158" y="134" width="24" height="72" rx="12" fill="url(#goldJersey)" />
        <ellipse cx="170" cy="212" rx="13" ry="11" fill="url(#skinG2)" />
      </g>
      <rect x="70" y="226" width="80" height="32" rx="4" fill="#1a2a1a" />
      <rect x="76" y="256" width="24" height="28" rx="2" fill="#222" />
      <path d="M70 280 Q80 290 100 286 L100 280Z" fill="#111" />
      <rect x="120" y="256" width="24" height="28" rx="2" fill="#222" />
      <path d="M120 280 Q134 290 150 286 L150 280Z" fill="#111" />
    </svg>
  );
}

'use client';

import { useEffect } from 'react';

interface Props {
  player: { pseudo: string; game: string; avatar: string };
  onDone: () => void;
}

export default function NeymarWelcome({ player, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 4200);
    return () => clearTimeout(t);
  }, [onDone]);

  useEffect(() => {
    const colors = ['#FF6B00', '#FFD700', '#ffffff', '#ff4500'];
    const pieces: HTMLElement[] = [];
    for (let i = 0; i < 50; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const color = colors[Math.floor(Math.random() * colors.length)];
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        background: ${color};
        width: ${5 + Math.random() * 7}px;
        height: ${5 + Math.random() * 7}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation-duration: ${1.5 + Math.random() * 2}s;
        animation-delay: ${Math.random() * 0.5}s;
      `;
      document.body.appendChild(el);
      pieces.push(el);
    }
    const cleanup = setTimeout(() => pieces.forEach((p) => p.remove()), 4500);
    return () => { clearTimeout(cleanup); pieces.forEach((p) => p.remove()); };
  }, []);

  return (
    <div className="neymar-container">
      {/* Speech bubble */}
      <div style={{
        background: '#0A0A0A',
        border: '1px solid var(--orange)',
        borderRadius: 8,
        padding: '16px 22px',
        maxWidth: 280,
        textAlign: 'center',
        marginBottom: 16,
        marginLeft: 'auto',
        marginRight: 'auto',
        position: 'relative',
      }}>
        {/* Arrow */}
        <div style={{
          position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid var(--orange)',
        }} />
        <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{player.avatar}</div>
        <div style={{ fontFamily: 'Bebas Neue, cursive', fontSize: '1.1rem', color: 'var(--orange)', letterSpacing: '0.08em', marginBottom: 4 }}>
          BIENVENUE DANS LA COMPÉTITION !
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--white)', marginBottom: 2 }}>
          {player.pseudo}
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--gray-2)' }}>
          {player.game}
        </div>
      </div>

      {/* Neymar + ball */}
      <div style={{ position: 'relative', width: 200, margin: '0 auto' }}>
        <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)' }}>
          <SpinningSoccerBall />
        </div>
        <NeymarSVG />
      </div>
    </div>
  );
}

function SpinningSoccerBall() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="spinning-ball">
      <circle cx="18" cy="18" r="16" fill="#111" stroke="#FF6B00" strokeWidth="2" />
      <polygon points="18,4 22,12 30,12 24,18 26,26 18,22 10,26 12,18 6,12 14,12" fill="none" stroke="#FF6B00" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="4" fill="#FF6B00" />
    </svg>
  );
}

function NeymarSVG() {
  return (
    <svg width="200" height="280" viewBox="0 0 200 280" style={{ display: 'block', margin: '0 auto', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}>
      <defs>
        <linearGradient id="jerseyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF8C33" />
          <stop offset="100%" stopColor="#CC5500" />
        </linearGradient>
        <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8956C" />
          <stop offset="100%" stopColor="#A0714F" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="58" rx="28" ry="32" fill="#1a0800" />
      <path d="M92 42 Q100 20 108 42 Q104 38 100 36 Q96 38 92 42Z" fill="#2a1000" />
      <ellipse cx="100" cy="82" rx="30" ry="34" fill="url(#skinGrad)" />
      <ellipse cx="70" cy="84" rx="7" ry="9" fill="#B8856C" />
      <ellipse cx="130" cy="84" rx="7" ry="9" fill="#B8856C" />
      <ellipse cx="88" cy="77" rx="5" ry="5.5" fill="#1a0a00" />
      <ellipse cx="112" cy="77" rx="5" ry="5.5" fill="#1a0a00" />
      <circle cx="90" cy="75" r="1.5" fill="white" />
      <circle cx="114" cy="75" r="1.5" fill="white" />
      <path d="M82 70 Q88 67 94 70" stroke="#1a0a00" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M106 70 Q112 67 118 70" stroke="#1a0a00" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M97 84 Q100 90 103 84" stroke="#8a5535" strokeWidth="1.5" fill="none" />
      <path d="M85 96 Q100 108 115 96" stroke="#7a4020" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M87 98 Q100 106 113 98" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="70" cy="90" r="3" fill="#FFD700" />
      <rect x="90" y="112" width="20" height="18" rx="4" fill="url(#skinGrad)" />
      <path d="M60 128 L52 220 L148 220 L140 128 Q120 118 100 118 Q80 118 60 128Z" fill="url(#jerseyGrad)" />
      <text x="100" y="182" textAnchor="middle" fontFamily="Bebas Neue, cursive" fontSize="36" fill="white" fontWeight="bold" opacity="0.95">10</text>
      <path d="M85 120 Q100 132 115 120" stroke="#CC5500" strokeWidth="3" fill="none" />
      <rect x="36" y="128" width="22" height="68" rx="11" fill="url(#jerseyGrad)" />
      <ellipse cx="47" cy="202" rx="12" ry="10" fill="url(#skinGrad)" />
      <g className="arm-wave" style={{ transformOrigin: '152px 128px' }}>
        <rect x="142" y="128" width="22" height="68" rx="11" fill="url(#jerseyGrad)" />
        <ellipse cx="153" cy="202" rx="12" ry="10" fill="url(#skinGrad)" />
      </g>
      <rect x="62" y="218" width="76" height="30" rx="4" fill="#1a2a1a" />
      <line x1="100" y1="218" x2="100" y2="248" stroke="#0a1a0a" strokeWidth="2" />
      <rect x="70" y="246" width="22" height="22" rx="0" fill="#222" />
      <rect x="68" y="266" width="26" height="8" rx="0" fill="#222" />
      <rect x="70" y="268" width="22" height="6" rx="0" fill="white" opacity="0.8" />
      <path d="M64 272 Q72 280 94 276 L94 272Z" fill="#111" />
      <rect x="108" y="246" width="22" height="22" rx="0" fill="#222" />
      <rect x="106" y="266" width="26" height="8" rx="0" fill="#222" />
      <rect x="108" y="268" width="22" height="6" rx="0" fill="white" opacity="0.8" />
      <path d="M106 272 Q120 280 136 276 L136 272Z" fill="#111" />
    </svg>
  );
}

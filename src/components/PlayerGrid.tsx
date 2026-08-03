'use client';

import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { playClickSound } from '@/lib/sounds';

interface Player { _id: string; pseudo: string; game: string; avatar: string; joinedAt: number; }

const GAME_COLORS: Record<string, string> = {
  'FIFA':'#00a651','eFootball':'#1a6fdd','Rocket League':'#e84c00','Valorant':'#ff4655',
  'Mortal Kombat':'#cc0000','Street Fighter':'#d42b00','Call of Duty':'#7a9e3a',
  'Fortnite':'#9747d4','NBA 2K':'#1d428a','Tekken':'#e8a000',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'à l\'instant';
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h/24)}j`;
}

interface Props { players: Player[]; isAdmin?: boolean; }

export default function PlayerGrid({ players, isAdmin }: Props) {
  const removePlayer = useMutation(api.players.remove);

  if (!players.length) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎮</div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.95rem', color: 'var(--gray-2)', marginBottom: '0.3rem' }}>
          Aucun joueur inscrit
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'var(--gray-3)' }}>
          Partage le lien d'inscription pour commencer !
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '36px 1fr 1fr auto',
        padding: '6px 12px',
        fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.62rem',
        color: 'var(--gray-3)', textTransform: 'uppercase', letterSpacing: '0.1em',
        gap: '1rem',
      }}>
        <span>#</span>
        <span>Joueur</span>
        <span>Jeu</span>
        <span>Inscrit</span>
      </div>

      {players.map((p, i) => {
        const color = GAME_COLORS[p.game] ?? '#555';
        return (
          <div
            key={p._id}
            style={{
              display: 'grid', gridTemplateColumns: '36px 1fr 1fr auto',
              gap: '1rem', alignItems: 'center',
              padding: '10px 12px',
              background: '#0D0D0D',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${color}`,
              borderRadius: 4,
              animationDelay: `${i * 0.04}s`,
            }}
            className="fade-up"
          >
            {/* Rank */}
            <div style={{
              fontFamily: 'Bebas Neue, cursive',
              fontSize: i < 3 ? '1.1rem' : '0.9rem',
              color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--gray-3)',
              textAlign: 'center', lineHeight: 1,
            }}>
              {i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}`}
            </div>

            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `${color}10`, border: `1px solid ${color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', flexShrink: 0,
              }}>
                {p.avatar}
              </div>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.pseudo}
              </div>
            </div>

            {/* Game badge */}
            <div>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 9px', borderRadius: 3,
                background: `${color}10`, border: `1px solid ${color}28`,
                color, fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.7rem',
                whiteSpace: 'nowrap',
              }}>
                {p.game}
              </span>
            </div>

            {/* Time + remove */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '0.68rem', color: 'var(--gray-3)', whiteSpace: 'nowrap' }}>
                {timeAgo(p.joinedAt)}
              </span>
              {isAdmin && (
                <button
                  className="btn btn-danger"
                  style={{ padding: '3px 9px', fontSize: '0.68rem' }}
                  onClick={async () => {
                    playClickSound();
                    if (confirm(`Supprimer ${p.pseudo} ?`)) await removePlayer({ id: p._id as any });
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

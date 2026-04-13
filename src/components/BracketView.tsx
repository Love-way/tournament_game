'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { playClickSound } from '@/lib/sounds';

interface Player { _id: string; pseudo: string; avatar: string; game: string; }
interface Match  { _id: string; round: number; matchIndex: number; player1Id?: string; player2Id?: string; winnerId?: string; tournamentId: string; }
interface Props  { matches: Match[]; players: Player[]; isAdmin?: boolean; onChampion?: (p: Player) => void; }

const GAME_COLORS: Record<string,string> = {
  'FIFA':'#00a651','eFootball':'#1a6fdd','Rocket League':'#e84c00','Valorant':'#ff4655',
  'Mortal Kombat':'#cc0000','Street Fighter':'#d42b00','Call of Duty':'#7a9e3a',
  'Fortnite':'#9747d4','NBA 2K':'#1d428a','Tekken':'#e8a000',
};

const SLOT_H  = 80;   // slot height in round 1 (doubles each round)
const COL_W   = 180;  // match card column width
const CONN_W  = 40;   // connector column width
const LABEL_H = 30;   // round label height

function roundLabel(round: number, total: number) {
  const f = total - round;
  if (f === 0) return 'Finale';
  if (f === 1) return '½ Finale';
  if (f === 2) return 'Quarts';
  if (f === 3) return 'Huitièmes';
  return `Tour ${round}`;
}

export default function BracketView({ matches, players, isAdmin, onChampion }: Props) {
  const setWinnerMut = useMutation(api.matches.setWinner);
  const pMap = new Map(players.map(p => [p._id, p]));

  const roundsMap = new Map<number, Match[]>();
  for (const m of matches) {
    if (!roundsMap.has(m.round)) roundsMap.set(m.round, []);
    roundsMap.get(m.round)!.push(m);
  }
  const sorted      = [...roundsMap.keys()].sort((a,b) => a-b);
  const totalRounds = sorted.length;
  const finalRound  = Math.max(...sorted);
  const finalMatch  = roundsMap.get(finalRound)?.[0];
  const champion    = finalMatch?.winnerId ? pMap.get(finalMatch.winnerId) : undefined;

  async function setWin(matchId: string, playerId: string, round: number) {
    if (!isAdmin) return;
    playClickSound();
    await setWinnerMut({ matchId: matchId as any, winnerId: playerId as any });
    if (round === finalRound) {
      const p = pMap.get(playerId);
      if (p && onChampion) onChampion(p);
    }
  }

  if (!matches.length) return (
    <p style={{ color:'var(--gray-2)', fontFamily:'Inter, sans-serif', padding:'1rem', textAlign:'center', fontSize:'0.9rem' }}>
      Le bracket sera généré au lancement du tournoi.
    </p>
  );

  return (
    <div>
      {/* Champion banner */}
      {champion && (
        <div style={{
          display:'flex', alignItems:'center', gap:'1rem',
          background:'rgba(255,215,0,0.04)', border:'1px solid rgba(255,215,0,0.18)',
          borderRadius:6, padding:'1rem 1.25rem', marginBottom:'1.5rem',
        }}>
          <span style={{ fontSize:'2rem' }}>👑</span>
          <div>
            <div style={{ fontFamily:'Inter, sans-serif', fontWeight:500, fontSize:'0.65rem', color:'var(--gray-2)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:3 }}>Champion du tournoi</div>
            <div style={{ fontFamily:'Bebas Neue, cursive', fontSize:'2rem', color:'#FFD700', letterSpacing:'0.04em', lineHeight:1 }}>{champion.pseudo}</div>
            <div style={{ fontFamily:'Inter, sans-serif', fontSize:'0.8rem', color:'var(--gray-2)', marginTop:2 }}>{champion.avatar} · {champion.game}</div>
          </div>
        </div>
      )}

      {isAdmin && (
        <p style={{ fontFamily:'Inter, sans-serif', fontSize:'0.72rem', color:'var(--gray-3)', marginBottom:'1rem' }}>
          Cliquer sur un joueur pour le désigner vainqueur
        </p>
      )}

      {/* Bracket tree */}
      <div style={{ overflowX:'auto', paddingBottom:'1rem' }}>
        <div style={{ display:'flex', alignItems:'flex-start', minWidth:'max-content' }}>
          {sorted.map((round, roundIdx) => {
            const rMatches = (roundsMap.get(round) ?? []).sort((a,b) => a.matchIndex - b.matchIndex);
            const slotH    = SLOT_H * Math.pow(2, roundIdx);
            const isFinal  = round === finalRound;

            return (
              <div key={round} style={{ display:'flex', alignItems:'flex-start' }}>

                {/* Connector lines (not before round 1) */}
                {roundIdx > 0 && (
                  <ConnectorColumn count={rMatches.length} slotH={slotH} />
                )}

                {/* Round column */}
                <div style={{ width:COL_W, flexShrink:0 }}>
                  {/* Label */}
                  <div style={{
                    height:LABEL_H, display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'Inter, sans-serif', fontWeight:700, fontSize:'0.62rem',
                    color: isFinal ? 'var(--orange)' : 'var(--gray-2)',
                    letterSpacing:'0.1em', textTransform:'uppercase',
                  }}>
                    {isFinal ? '🏆 ' : ''}{roundLabel(round, totalRounds)}
                  </div>

                  {/* Match slots */}
                  {rMatches.map(match => {
                    const p1 = match.player1Id ? pMap.get(match.player1Id) : undefined;
                    const p2 = match.player2Id ? pMap.get(match.player2Id) : undefined;
                    const hasWinner = !!match.winnerId;
                    const isBye = (!!p1 && !p2) || (!p1 && !!p2);

                    return (
                      <div key={match._id} style={{ height:slotH, display:'flex', alignItems:'center' }}>
                        <div style={{
                          width:'100%',
                          background:'#0D0D0D',
                          border:`1px solid ${hasWinner ? 'rgba(255,215,0,0.22)' : isBye ? 'rgba(255,255,255,0.06)' : 'var(--border)'}`,
                          borderRadius:4, overflow:'hidden',
                        }}>
                          {/* Status bar */}
                          {(hasWinner || isBye) && (
                            <div style={{
                              height:2,
                              background: hasWinner ? '#FFD700' : 'var(--border)',
                            }} />
                          )}
                          <PlayerRow
                            player={p1}
                            isWinner={match.winnerId === p1?._id}
                            clickable={!!(isAdmin && !hasWinner && p1)}
                            onClick={() => p1 && setWin(match._id, p1._id, round)}
                          />
                          <div style={{ height:1, background:'var(--border)' }} />
                          <PlayerRow
                            player={p2}
                            isWinner={match.winnerId === p2?._id}
                            clickable={!!(isAdmin && !hasWinner && p2)}
                            onClick={() => p2 && setWin(match._id, p2._id, round)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Connector column (SVG lines between rounds) ── */
function ConnectorColumn({ count, slotH }: { count: number; slotH: number }) {
  const prevSlotH = slotH / 2;
  const totalH    = count * slotH;

  return (
    <div style={{ width:CONN_W, flexShrink:0 }}>
      {/* Align with the label row above match slots */}
      <div style={{ height:LABEL_H }} />
      <svg width={CONN_W} height={totalH} style={{ display:'block' }}>
        {Array.from({ length:count }, (_, i) => {
          const topY  = i * slotH + prevSlotH / 2;      // center of top feed match
          const botY  = i * slotH + prevSlotH * 1.5;    // center of bottom feed match
          const midY  = i * slotH + slotH / 2;          // center of current match
          const midX  = CONN_W / 2;
          const color = '#2E2E2E';

          return (
            <g key={i}>
              {/* Stub from top match → midX */}
              <line x1={0} y1={topY} x2={midX} y2={topY} stroke={color} strokeWidth={1.5} />
              {/* Vertical from top to bottom */}
              <line x1={midX} y1={topY} x2={midX} y2={botY} stroke={color} strokeWidth={1.5} />
              {/* Stub from bottom match → midX */}
              <line x1={0} y1={botY} x2={midX} y2={botY} stroke={color} strokeWidth={1.5} />
              {/* Line to current match */}
              <line x1={midX} y1={midY} x2={CONN_W} y2={midY} stroke={color} strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Player row inside a match card ── */
function PlayerRow({ player, isWinner, clickable, onClick }: {
  player?: { _id: string; pseudo: string; avatar: string; game: string };
  isWinner: boolean;
  clickable: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = player ? (GAME_COLORS[player.game] ?? '#555') : undefined;

  return (
    <div
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => clickable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:'flex', alignItems:'center', gap:7,
        padding:'7px 10px', minHeight:34,
        cursor: clickable ? 'pointer' : 'default',
        background: isWinner
          ? 'rgba(255,215,0,0.06)'
          : hovered
          ? 'rgba(255,107,0,0.07)'
          : 'transparent',
        borderLeft: color ? `3px solid ${isWinner ? '#FFD700' : color + '60'}` : '3px solid transparent',
        transition:'background 0.1s',
      }}
    >
      {player ? (
        <>
          <span style={{ fontSize:'0.95rem', lineHeight:1, flexShrink:0 }}>{player.avatar}</span>
          <span style={{
            fontFamily:'Inter, sans-serif', fontWeight: isWinner ? 700 : 500,
            fontSize:'0.78rem',
            color: isWinner ? '#FFD700' : 'var(--gray-1)',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1,
          }}>
            {player.pseudo}
          </span>
          {isWinner && <span style={{ fontSize:'0.7rem', color:'#FFD700', flexShrink:0 }}>✓</span>}
        </>
      ) : (
        <span style={{ fontFamily:'Inter, sans-serif', fontSize:'0.72rem', color:'var(--gray-3)', fontStyle:'italic' }}>
          En attente…
        </span>
      )}
    </div>
  );
}

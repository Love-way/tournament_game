'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import PlayerGrid from '@/components/PlayerGrid';
import BracketView from '@/components/BracketView';
import CountdownTimer from '@/components/CountdownTimer';
import NeymarWelcome from '@/components/NeymarWelcome';
import ChampionScreen from '@/components/ChampionScreen';
import { playWhistle, playClickSound, playRegistrationMelody } from '@/lib/sounds';
import { shuffle } from '@/lib/bracket';

const ThreeScene = dynamic(() => import('@/components/ThreeScene'), { ssr: false });

const GAMES   = ['FIFA','eFootball','Rocket League','Valorant','Mortal Kombat','Street Fighter','Call of Duty','Fortnite','NBA 2K','Tekken'];
const AVATARS = ['🐉','🦁','🐺','🦊','🐯','🦅','🦋','🐬','🦄','🔥','⚡','🌪️','💎','🎯','👑'];
const ADMIN_PW = 'admin123';

const GAME_COLORS: Record<string,string> = {
  'FIFA':'#00a651','eFootball':'#1a6fdd','Rocket League':'#e84c00','Valorant':'#ff4655',
  'Mortal Kombat':'#cc0000','Street Fighter':'#d42b00','Call of Duty':'#7a9e3a',
  'Fortnite':'#9747d4','NBA 2K':'#1d428a','Tekken':'#e8a000',
};

interface Player   { _id: string; pseudo: string; game: string; avatar: string; joinedAt: number; }
interface Match    { _id: string; round: number; matchIndex: number; player1Id?: string; player2Id?: string; winnerId?: string; tournamentId: string; }
interface Champion { pseudo: string; avatar: string; game: string; }

function roundLabel(round: number, total: number) {
  const f = total - round;
  if (f === 0) return 'Finale';
  if (f === 1) return '½ Finale';
  if (f === 2) return 'Quarts';
  if (f === 3) return 'Huitièmes';
  return `Tour ${round}`;
}

export default function Home() {
  const players    = useQuery(api.players.list)    as Player[] | undefined;
  const matches    = useQuery(api.matches.list)    as Match[]  | undefined;
  const tournament = useQuery(api.tournament.getState);

  const addAdminPlayer  = useMutation(api.players.addAdmin);
  const generateBracket = useMutation(api.matches.generate);
  const startTournament = useMutation(api.tournament.start);
  const resetAll        = useMutation(api.tournament.reset);

  const [isAdmin,        setIsAdmin]        = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword,  setAdminPassword]  = useState('');
  const [adminError,     setAdminError]     = useState('');
  const [adminPseudo,    setAdminPseudo]    = useState('');
  const [adminGame,      setAdminGame]      = useState(GAMES[0]);
  const [adminFormErr,   setAdminFormErr]   = useState('');
  const [neymarPlayer,   setNeymarPlayer]   = useState<{ pseudo:string;game:string;avatar:string }|null>(null);
  const [champion,       setChampion]       = useState<Champion|null>(null);
  const [copied,         setCopied]         = useState(false);
  const [activeTab,      setActiveTab]      = useState<'roster'|'bracket'>('roster');

  const [slideIndex, setSlideIndex] = useState(0);
  const heroImages = ['/hero.jpg', '/hero 2.jpg', '/heor 3.jpg'];

  useEffect(() => {
    const id = setInterval(() => setSlideIndex(i => (i + 1) % heroImages.length), 3000);
    return () => clearInterval(id);
  }, []);

  const titleClicks = useRef(0);
  const clickTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const prevCount   = useRef<number|null>(null);

  useEffect(() => {
    const t = setTimeout(() => { try { playWhistle(); } catch(_) {} }, 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!players) return;
    if (prevCount.current !== null && players.length > prevCount.current) {
      const n = players[0];
      if (n) setNeymarPlayer({ pseudo: n.pseudo, game: n.game, avatar: n.avatar });
    }
    prevCount.current = players.length;
  }, [players]);

  useEffect(() => {
    if (tournament?.started) setActiveTab('bracket');
  }, [tournament?.started]);

  const handleTitleClick = useCallback(() => {
    titleClicks.current++;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { titleClicks.current = 0; }, 2000);
    if (titleClicks.current >= 5) {
      titleClicks.current = 0;
      if (!isAdmin) setShowAdminModal(true);
      else setIsAdmin(false);
    }
  }, [isAdmin]);

  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (adminPassword === ADMIN_PW) {
      setIsAdmin(true); setShowAdminModal(false);
      setAdminPassword(''); setAdminError(''); playClickSound();
    } else {
      setAdminError('Mot de passe incorrect');
    }
  }

  async function handleLaunchTournament() {
    if (!players || players.length < 2) return;
    playClickSound();
    await generateBracket({ playerIds: shuffle(players.map(p => p._id)) as any });
    await startTournament({});
  }

  async function handleAdminAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    setAdminFormErr('');
    const t = adminPseudo.trim();
    if (!t) { setAdminFormErr('Pseudo requis'); return; }
    try {
      const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      await addAdminPlayer({ pseudo: t, game: adminGame, avatar });
      setAdminPseudo('');
      playRegistrationMelody();
    } catch(err: any) { setAdminFormErr(err.message ?? 'Erreur'); }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/register`).then(() => {
      setCopied(true); playClickSound();
      setTimeout(() => setCopied(false), 2200);
    });
  }

  const started     = tournament?.started === true;
  const playerCount = players?.length ?? 0;
  const matchCount  = matches?.filter(m => !m.winnerId).length ?? 0;
  const doneCount   = matches?.filter(m => !!m.winnerId).length ?? 0;

  // Group matches by round for the match cards section
  const roundsMap = new Map<number, Match[]>();
  if (matches) {
    for (const m of matches) {
      if (!roundsMap.has(m.round)) roundsMap.set(m.round, []);
      roundsMap.get(m.round)!.push(m);
    }
  }
  const sortedRounds = [...roundsMap.keys()].sort((a,b) => a-b);
  const totalRounds  = sortedRounds.length;
  const pMap         = new Map((players ?? []).map(p => [p._id, p]));

  return (
    <main style={{ minHeight:'100vh', position:'relative', background:'var(--black)' }}>

      {/* Three.js background — hero only */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <ThreeScene />
      </div>

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="container" style={{ display:'flex', alignItems:'center', gap:'1.5rem', width:'100%' }}>
          <button onClick={handleTitleClick} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <span style={{ fontFamily:'Bebas Neue, cursive', fontSize:'1.4rem', color:'var(--white)', letterSpacing:'0.06em' }}>
              OMSHINA <span style={{ color:'var(--orange)' }}>TOURNOI ZONE</span>
            </span>
          </button>

          <div style={{ flex:1 }} />

          {/* Nav links */}
          <div style={{ display:'flex', gap:'1.5rem', alignItems:'center' }}>
            <button onClick={() => { document.getElementById('matches')?.scrollIntoView({ behavior:'smooth' }); playClickSound(); }}
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'Inter, sans-serif', fontWeight:500, fontSize:'0.82rem', color:'var(--gray-2)' }}>
              Matchs
            </button>
            <button onClick={() => { document.getElementById('roster')?.scrollIntoView({ behavior:'smooth' }); playClickSound(); }}
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'Inter, sans-serif', fontWeight:500, fontSize:'0.82rem', color:'var(--gray-2)' }}>
              Joueurs
            </button>
          </div>

          {/* Status dot */}
          <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'Inter, sans-serif', fontSize:'0.72rem', fontWeight:600, color: started ? '#F87171' : '#4ADE80' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background: started ? '#EF4444' : '#22C55E', display:'inline-block' }} />
            {started ? 'Live' : 'Inscriptions ouvertes'}
          </div>

          {isAdmin && (
            <div style={{ padding:'4px 10px', borderRadius:3, background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.25)', fontFamily:'Inter, sans-serif', fontSize:'0.7rem', fontWeight:600, color:'#A78BFA' }}>
              Admin
            </div>
          )}

          <Link href="/register" className="btn btn-primary" style={{ padding:'8px 18px', fontSize:'0.82rem' }} onClick={playClickSound}>
            S'inscrire
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════
          HERO — full viewport height
      ══════════════════════════════════ */}
      <section style={{
        position:'relative', zIndex:10,
        minHeight:'100vh',
        display:'grid', gridTemplateColumns:'55% 45%',
        alignItems:'center',
        overflow:'hidden',
      }}>

        {/* Hero carousel — 3 images with crossfade */}
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          {heroImages.map((src, i) => (
            <div
              key={src}
              style={{
                position:'absolute', inset:0,
                backgroundImage:`url(${src})`,
                backgroundSize:'cover',
                backgroundPosition:'center top',
                opacity: i === slideIndex ? 1 : 0,
                transition:'opacity 1.2s ease-in-out',
              }}
            />
          ))}
          {/* Vertical gradient overlay */}
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(to bottom, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.25) 40%, rgba(10,10,10,0.25) 60%, var(--black) 100%)',
            zIndex:1,
          }} />
        </div>

        {/* LEFT — headline + CTA */}
        <div style={{ position:'relative', zIndex:1, padding:'8rem 4rem 5rem 6rem' }}>
          {/* Eyebrow */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.75rem' }}>
            <div style={{ width:28, height:2, background:'var(--orange)' }} />
            <span style={{ fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.68rem', color:'var(--orange)', letterSpacing:'0.18em', textTransform:'uppercase' }}>
              Tournoi Gaming 2026
            </span>
          </div>

          {/* Big title — Brush King */}
          <h1 style={{
            fontFamily:'"Brush King", "Bebas Neue", cursive',
            fontSize:'clamp(4rem, 9vw, 8rem)',
            lineHeight:0.95,
            color:'var(--white)',
            marginBottom:'0.1em',
            textShadow:'0 4px 40px rgba(0,0,0,0.8)',
          }}>
            OMSHINA
          </h1>
          <h1 style={{
            fontFamily:'"Brush King", "Bebas Neue", cursive',
            fontSize:'clamp(4rem, 9vw, 8rem)',
            lineHeight:0.95,
            color:'var(--orange)',
            marginBottom:'1.75rem',
            textShadow:'0 4px 40px rgba(255,107,0,0.4)',
          }}>
            TOURNOI ZONE
          </h1>

          <p style={{ fontFamily:'Inter, sans-serif', fontSize:'1rem', color:'rgba(255,255,255,0.6)', maxWidth:400, lineHeight:1.65, marginBottom:'2.5rem' }}>
            Affronte les meilleurs joueurs dans un tournoi d'élimination directe. Inscris-toi maintenant.
          </p>

          {/* CTAs */}
          <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
            <Link href="/register" className="btn btn-primary" style={{ padding:'14px 34px', fontSize:'0.95rem' }} onClick={playClickSound}>
              S'inscrire →
            </Link>
            <button onClick={handleCopyLink} className="btn btn-outline" style={{ padding:'14px 26px', fontSize:'0.95rem' }}>
              {copied ? '✓ Copié !' : 'Partager le lien'}
            </button>
          </div>
        </div>

        {/* RIGHT — stats + countdown */}
        <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'flex-start', justifyContent:'center', gap:'1.5rem', padding:'8rem 5rem 5rem 2rem' }}>

          {/* Stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1px', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', width:'100%', maxWidth:320, backdropFilter:'blur(8px)', background:'rgba(10,10,10,0.75)' }}>
            <StatBox value={playerCount} label="Joueurs inscrits" orange />
            <StatBox value={matchCount || '—'} label="Matchs restants" />
            <StatBox value={doneCount || '—'} label="Matchs joués" />
            <StatBox value={started ? 'LIVE' : 'OPEN'} label="Statut" orange={started} />
          </div>

          {/* Countdown */}
          {!started && (
            <div style={{ width:'100%', maxWidth:320 }}>
              <CountdownTimer />
            </div>
          )}

          {/* Registered players preview */}
          {playerCount > 0 && (
            <div style={{ width:'100%', maxWidth:320 }}>
              <div style={{ fontFamily:'Inter, sans-serif', fontSize:'0.65rem', fontWeight:600, color:'var(--gray-3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>
                Derniers inscrits
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {(players ?? []).slice(0, 4).map(p => (
                  <div key={p._id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'rgba(10,10,10,0.7)', border:'1px solid var(--border)', borderRadius:4, backdropFilter:'blur(6px)' }}>
                    <span style={{ fontSize:'1rem' }}>{p.avatar}</span>
                    <span style={{ fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.8rem', color:'var(--gray-1)', flex:1 }}>{p.pseudo}</span>
                    <span style={{ fontFamily:'Inter, sans-serif', fontSize:'0.68rem', color: GAME_COLORS[p.game] ?? 'var(--gray-3)', fontWeight:600 }}>{p.game}</span>
                  </div>
                ))}
                {playerCount > 4 && (
                  <div style={{ fontFamily:'Inter, sans-serif', fontSize:'0.72rem', color:'var(--gray-3)', textAlign:'center', paddingTop:4 }}>
                    +{playerCount - 4} autres joueurs
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════
          ADMIN PANEL
      ══════════════════════════════════ */}
      {isAdmin && (
        <div style={{ position:'relative', zIndex:10, background:'rgba(255,107,0,0.02)', borderTop:'1px solid rgba(255,107,0,0.1)', borderBottom:'1px solid rgba(255,107,0,0.1)' }}>
          <div className="container" style={{ padding:'1.25rem' }}>
            <div style={{ fontFamily:'Inter, sans-serif', fontSize:'0.65rem', fontWeight:700, color:'var(--orange)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'1rem' }}>
              Panneau Administrateur
            </div>
            <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'flex-start' }}>
              {!started && (
                <form onSubmit={handleAdminAddPlayer} style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', flex:1 }}>
                  <input type="text" value={adminPseudo} onChange={e => setAdminPseudo(e.target.value)} placeholder="Pseudo" className="input" style={{ maxWidth:190 }} maxLength={20} />
                  <select value={adminGame} onChange={e => setAdminGame(e.target.value)} className="input" style={{ maxWidth:165 }}>
                    {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <button type="submit" className="btn btn-primary" style={{ padding:'10px 18px' }}>+ Ajouter</button>
                  {adminFormErr && <span style={{ color:'#F87171', fontFamily:'Inter', fontSize:'0.82rem', alignSelf:'center' }}>{adminFormErr}</span>}
                </form>
              )}
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                {!started && playerCount >= 2 && (
                  <button onClick={handleLaunchTournament} className="btn btn-gold" style={{ padding:'10px 22px', fontSize:'0.85rem' }}>
                    Lancer le tournoi ({playerCount} joueurs)
                  </button>
                )}
                <button className="btn btn-danger" style={{ padding:'10px 18px', fontSize:'0.8rem' }}
                  onClick={async () => { if (confirm('Réinitialiser complètement ?')) { playClickSound(); await resetAll({}); } }}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          MATCHES SECTION
      ══════════════════════════════════ */}
      {started && matches && matches.length > 0 && (
        <section id="matches" style={{ position:'relative', zIndex:10, borderTop:'1px solid var(--border)', padding:'4rem 0' }}>
          <div className="container">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'2rem' }}>
              <div>
                <div style={{ fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.65rem', color:'var(--orange)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:6 }}>
                  En direct
                </div>
                <h2 style={{ fontFamily:'Bebas Neue, cursive', fontSize:'clamp(1.8rem,4vw,2.8rem)', color:'var(--white)', letterSpacing:'0.04em', lineHeight:1 }}>
                  MATCHS DU TOURNOI
                </h2>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <span style={{ fontFamily:'Inter, sans-serif', fontSize:'0.72rem', fontWeight:600, color:'var(--gray-3)' }}>
                  {doneCount} terminé{doneCount !== 1 ? 's' : ''} · {matchCount} à jouer
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:'2rem' }}>
              {(['roster','bracket'] as const).map(tab => (
                <button key={tab} onClick={() => { setActiveTab(tab); playClickSound(); }}
                  className="tab-btn" data-active={activeTab === tab}>
                  {tab === 'roster' ? 'Joueurs' : 'Bracket'}
                </button>
              ))}
            </div>

            {/* Match cards — horizontal scroll */}
            {activeTab === 'bracket' && (
              <>
                <div style={{ display:'flex', gap:'0.75rem', overflowX:'auto', paddingBottom:'1rem', marginBottom:'2rem' }}>
                  {sortedRounds.map(round => {
                    const rMatches = (roundsMap.get(round) ?? []).sort((a,b) => a.matchIndex - b.matchIndex);
                    return rMatches.map((match, idx) => {
                      const p1 = match.player1Id ? pMap.get(match.player1Id) : undefined;
                      const p2 = match.player2Id ? pMap.get(match.player2Id) : undefined;
                      const hasWinner = !!match.winnerId;
                      return (
                        <MatchCard
                          key={match._id}
                          p1={p1} p2={p2}
                          round={roundLabel(round, totalRounds)}
                          hasWinner={hasWinner}
                          winnerId={match.winnerId}
                        />
                      );
                    });
                  })}
                </div>

                {/* Full bracket */}
                <div style={{ background:'var(--black-1)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.5rem' }}>
                  <BracketView matches={matches} players={players ?? []} isAdmin={isAdmin} onChampion={p => setChampion(p)} />
                </div>
              </>
            )}

            {activeTab === 'roster' && (
              <div style={{ background:'var(--black-1)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
                <div style={{ padding:'0.75rem 1.1rem', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:'Inter, sans-serif', fontSize:'0.72rem', fontWeight:600, color:'var(--gray-3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                    {playerCount} joueurs inscrits
                  </span>
                </div>
                <div style={{ padding:'0.75rem' }}>
                  <PlayerGrid players={players ?? []} isAdmin={isAdmin} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════
          ROSTER SECTION (pre-tournament)
      ══════════════════════════════════ */}
      {!started && (
        <section id="roster" style={{ position:'relative', zIndex:10, borderTop:'1px solid var(--border)', padding:'4rem 0' }}>
          <div className="container">
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
              <div>
                <div style={{ fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.65rem', color:'var(--orange)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:6 }}>
                  Roster
                </div>
                <h2 style={{ fontFamily:'Bebas Neue, cursive', fontSize:'clamp(1.8rem,4vw,2.8rem)', color:'var(--white)', letterSpacing:'0.04em', lineHeight:1 }}>
                  JOUEURS INSCRITS
                </h2>
              </div>
              <Link href="/register" className="btn btn-primary" style={{ padding:'10px 22px', fontSize:'0.85rem' }} onClick={playClickSound}>
                + S'inscrire
              </Link>
            </div>

            <div style={{ background:'var(--black-1)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
              <div style={{ padding:'0.75rem 1.1rem', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontFamily:'Inter, sans-serif', fontSize:'0.72rem', fontWeight:600, color:'var(--gray-3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  {playerCount} joueur{playerCount !== 1 ? 's' : ''} inscrit{playerCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ padding:'0.75rem' }}>
                <PlayerGrid players={players ?? []} isAdmin={isAdmin} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Admin modal */}
      {showAdminModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAdminModal(false); setAdminPassword(''); setAdminError(''); }}}>
          <div style={{ background:'var(--black-1)', border:'1px solid var(--border)', borderTop:'2px solid var(--orange)', borderRadius:'var(--radius)', padding:'2.5rem', width:'100%', maxWidth:360 }}>
            <h2 style={{ fontFamily:'Bebas Neue, cursive', fontSize:'1.6rem', color:'var(--white)', marginBottom:'1.5rem', letterSpacing:'0.05em' }}>Accès Admin</h2>
            <form onSubmit={handleAdminLogin} style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Mot de passe" className="input" autoFocus />
              {adminError && <p className="error-box" style={{ margin:0 }}>{adminError}</p>}
              <button type="submit" className="btn btn-primary" style={{ padding:'12px' }}>Connexion</button>
            </form>
          </div>
        </div>
      )}

      {neymarPlayer && <NeymarWelcome player={neymarPlayer} onDone={() => setNeymarPlayer(null)} />}
      {champion     && <ChampionScreen champion={champion} onClose={() => setChampion(null)} />}
    </main>
  );
}

/* ── Stat box (hero grid) ── */
function StatBox({ value, label, orange }: { value: string|number; label: string; orange?: boolean }) {
  return (
    <div style={{ background:'var(--black-1)', padding:'1.25rem 1.5rem', textAlign:'center' }}>
      <div style={{ fontFamily:'Bebas Neue, cursive', fontSize:'2.4rem', lineHeight:1, color: orange ? 'var(--orange)' : 'var(--white)', letterSpacing:'0.02em' }}>
        {value}
      </div>
      <div style={{ fontFamily:'Inter, sans-serif', fontSize:'0.62rem', fontWeight:500, color:'var(--gray-2)', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:4 }}>
        {label}
      </div>
    </div>
  );
}

/* ── Match card (horizontal scroll) ── */
function MatchCard({ p1, p2, round, hasWinner, winnerId }: {
  p1?: Player; p2?: Player;
  round: string; hasWinner: boolean; winnerId?: string;
}) {
  const c1 = p1 ? (GAME_COLORS[p1.game] ?? '#555') : '#333';
  const c2 = p2 ? (GAME_COLORS[p2.game] ?? '#555') : '#333';
  return (
    <div style={{
      flexShrink:0, width:220,
      background:'var(--black-1)', border:`1px solid ${hasWinner ? 'rgba(255,215,0,0.2)' : 'var(--border)'}`,
      borderRadius:6, overflow:'hidden',
    }}>
      {/* Round label */}
      <div style={{ padding:'6px 12px', borderBottom:'1px solid var(--border)', background:'rgba(255,255,255,0.01)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'Inter, sans-serif', fontSize:'0.6rem', fontWeight:700, color:'var(--gray-3)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{round}</span>
        {hasWinner
          ? <span style={{ fontSize:'0.6rem', fontWeight:700, color:'#FFD700' }}>Terminé</span>
          : p1 && p2
          ? <span style={{ fontSize:'0.6rem', fontWeight:700, color:'var(--orange)' }}>À jouer</span>
          : <span style={{ fontSize:'0.6rem', color:'var(--gray-3)' }}>BYE</span>
        }
      </div>

      {/* Players */}
      <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:6 }}>
        {[{ player: p1, color: c1 }, { player: p2, color: c2 }].map(({ player, color }, idx) => (
          <div key={idx} style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'6px 8px', borderRadius:3,
            borderLeft:`3px solid ${winnerId === player?._id ? '#FFD700' : color + '60'}`,
            background: winnerId === player?._id ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.01)',
          }}>
            <span style={{ fontSize:'1rem', lineHeight:1 }}>{player?.avatar ?? '?'}</span>
            <span style={{ fontFamily:'Inter, sans-serif', fontWeight: winnerId === player?._id ? 700 : 500, fontSize:'0.8rem', color: winnerId === player?._id ? '#FFD700' : 'var(--gray-1)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {player?.pseudo ?? 'En attente…'}
            </span>
            {winnerId === player?._id && <span style={{ fontSize:'0.65rem', color:'#FFD700' }}>✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

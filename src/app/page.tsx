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
import { playGoalSound } from '@/lib/sounds';
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

// Actual filenames in /public — spaces URL-encoded for CSS
const HERO_IMAGES = ['/hero1.jpg', '/hero2.jpg', '/hero3.jpg'];

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
  const [slideIndex,     setSlideIndex]     = useState(0);

  const titleClicks = useRef(0);
  const clickTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const prevCount   = useRef<number|null>(null);

  // Carousel auto-advance every 3s
  useEffect(() => {
    const id = setInterval(() => setSlideIndex(i => (i + 1) % HERO_IMAGES.length), 3000);
    return () => clearInterval(id);
  }, []);

  // Detect new player → Neymar welcome
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
      setAdminPassword(''); setAdminError('');
    } else {
      setAdminError('Mot de passe incorrect');
    }
  }

  async function handleLaunchTournament() {
    if (!players || players.length < 2) return;
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
    } catch(err: any) { setAdminFormErr(err.message ?? 'Erreur'); }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/register`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  const started     = tournament?.started === true;
  const playerCount = players?.length ?? 0;
  const matchCount  = matches?.filter(m => !m.winnerId).length ?? 0;
  const doneCount   = matches?.filter(m => !!m.winnerId).length ?? 0;

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

      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <ThreeScene />
      </div>

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="container" style={{ display:'flex', alignItems:'center', gap:'1rem', width:'100%' }}>
          <button onClick={handleTitleClick} style={{ background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
            <span style={{ fontFamily:'Bebas Neue, cursive', fontSize:'1.25rem', color:'var(--white)', letterSpacing:'0.06em' }}>
              OMSHINA <span style={{ color:'var(--orange)' }}>TOURNOI ZONE</span>
            </span>
          </button>

          <div style={{ flex:1 }} />

          {/* Nav links — hidden on mobile */}
          <div className="nav-links">
            <button onClick={() => document.getElementById('content')?.scrollIntoView({ behavior:'smooth' })}
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'Inter, sans-serif', fontWeight:500, fontSize:'0.82rem', color:'var(--gray-2)', padding:'4px 0' }}>
              Joueurs
            </button>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'Inter, sans-serif', fontSize:'0.7rem', fontWeight:600, color: started ? '#F87171' : '#4ADE80', flexShrink:0 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background: started ? '#EF4444' : '#22C55E', display:'inline-block', flexShrink:0 }} />
            <span className="hide-mobile">{started ? 'Live' : 'Inscriptions ouvertes'}</span>
          </div>

          {isAdmin && (
            <div style={{ padding:'4px 10px', borderRadius:3, background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.25)', fontFamily:'Inter, sans-serif', fontSize:'0.7rem', fontWeight:600, color:'#A78BFA', flexShrink:0 }}>
              Admin
            </div>
          )}

          <Link href="/register" className="btn btn-primary" style={{ padding:'8px 16px', fontSize:'0.8rem', flexShrink:0 }}>
            S'inscrire
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section">
        {/* Carousel */}
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          {HERO_IMAGES.map((src, i) => (
            <div key={src} style={{
              position:'absolute', inset:0,
              backgroundImage:`url(${src})`,
              backgroundSize:'cover',
              backgroundPosition:'center top',
              opacity: i === slideIndex ? 1 : 0,
              transition:'opacity 1.2s ease-in-out',
            }} />
          ))}
          {/* Vertical gradient */}
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(to bottom, rgba(10,10,10,0.8) 0%, rgba(10,10,10,0.2) 35%, rgba(10,10,10,0.2) 65%, var(--black) 100%)',
          }} />
        </div>

        {/* Left — title + CTAs */}
        <div className="hero-left" style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.5rem' }}>
            <div style={{ width:24, height:2, background:'var(--orange)', flexShrink:0 }} />
            <span style={{ fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.65rem', color:'var(--orange)', letterSpacing:'0.18em', textTransform:'uppercase' }}>
              Tournoi Gaming 2026
            </span>
          </div>

          <h1 style={{ fontFamily:'"Brush King", "Bebas Neue", cursive', fontSize:'clamp(3.5rem, 9vw, 8rem)', lineHeight:0.92, color:'var(--white)', marginBottom:'0.1em', textShadow:'0 4px 30px rgba(0,0,0,0.9)' }}>
            OMSHINA
          </h1>
          <h1 style={{ fontFamily:'"Brush King", "Bebas Neue", cursive', fontSize:'clamp(3.5rem, 9vw, 8rem)', lineHeight:0.92, color:'var(--orange)', marginBottom:'1.5rem', textShadow:'0 4px 30px rgba(255,107,0,0.5)' }}>
            TOURNOI ZONE
          </h1>

          <p style={{ fontFamily:'Inter, sans-serif', fontSize:'0.95rem', color:'rgba(255,255,255,0.65)', maxWidth:420, lineHeight:1.65, marginBottom:'2rem' }}>
            Affronte les meilleurs joueurs dans un tournoi d'élimination directe. Inscris-toi maintenant.
          </p>

          <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
            <Link href="/register" className="btn btn-primary" style={{ padding:'13px 30px', fontSize:'0.92rem' }}>
              S'inscrire →
            </Link>
            <button onClick={handleCopyLink} className="btn btn-outline" style={{ padding:'13px 22px', fontSize:'0.92rem' }}>
              {copied ? '✓ Copié !' : 'Partager le lien'}
            </button>
          </div>
        </div>

        {/* Right — stats + countdown */}
        <div className="hero-right" style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1px', background:'var(--border)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', width:'100%', maxWidth:300, backdropFilter:'blur(10px)', backgroundColor:'rgba(10,10,10,0.7)' }}>
            <StatBox value={playerCount}                    label="Inscrits"  orange />
            <StatBox value={Math.max(0, 16 - playerCount)}  label="Places restantes" />
            <StatBox value={matchCount || '—'}              label="À jouer" />
            <StatBox value={started ? 'LIVE' : playerCount >= 16 ? 'FULL' : 'OPEN'} label="Statut" orange={started || playerCount >= 16} />
          </div>

          {!started && (
            <div style={{ width:'100%', maxWidth:300 }}>
              <CountdownTimer />
            </div>
          )}

          {playerCount > 0 && (
            <div style={{ width:'100%', maxWidth:300 }}>
              <div style={{ fontFamily:'Inter, sans-serif', fontSize:'0.62rem', fontWeight:600, color:'var(--gray-3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>
                Derniers inscrits
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {(players ?? []).slice(0, 3).map(p => (
                  <div key={p._id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'rgba(10,10,10,0.75)', border:'1px solid var(--border)', borderRadius:4, backdropFilter:'blur(6px)' }}>
                    <span style={{ fontSize:'1rem' }}>{p.avatar}</span>
                    <span style={{ fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.8rem', color:'var(--gray-1)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.pseudo}</span>
                    <span style={{ fontFamily:'Inter, sans-serif', fontSize:'0.65rem', color: GAME_COLORS[p.game] ?? 'var(--gray-3)', fontWeight:600, flexShrink:0 }}>{p.game}</span>
                  </div>
                ))}
                {playerCount > 3 && (
                  <div style={{ fontFamily:'Inter, sans-serif', fontSize:'0.7rem', color:'var(--gray-3)', textAlign:'center', paddingTop:2 }}>
                    +{playerCount - 3} autres
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Carousel dots */}
          <div style={{ display:'flex', gap:6 }}>
            {HERO_IMAGES.map((_, i) => (
              <button key={i} onClick={() => setSlideIndex(i)} style={{
                width: i === slideIndex ? 20 : 6, height:6, borderRadius:99,
                background: i === slideIndex ? 'var(--orange)' : 'rgba(255,255,255,0.25)',
                border:'none', cursor:'pointer', padding:0,
                transition:'all 0.3s',
              }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── ADMIN PANEL ── */}
      {isAdmin && (
        <div id="admin" style={{ position:'relative', zIndex:10, background:'rgba(255,107,0,0.02)', borderTop:'1px solid rgba(255,107,0,0.12)', borderBottom:'1px solid rgba(255,107,0,0.12)' }}>
          <div className="container" style={{ padding:'1.5rem 1.25rem' }}>
            <div style={{ fontFamily:'Inter, sans-serif', fontSize:'0.62rem', fontWeight:700, color:'var(--orange)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:'1.25rem' }}>
              Panneau Administrateur
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {/* Add player form */}
              {!started && (
                <form onSubmit={handleAdminAddPlayer} style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                  <input
                    type="text" value={adminPseudo}
                    onChange={e => setAdminPseudo(e.target.value)}
                    placeholder="Pseudo du joueur" className="input"
                    style={{ flex:'1 1 160px', minWidth:0 }} maxLength={20}
                  />
                  <select value={adminGame} onChange={e => setAdminGame(e.target.value)} className="input" style={{ flex:'1 1 150px', minWidth:0 }}>
                    {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <button type="submit" className="btn btn-primary" style={{ padding:'10px 20px', flexShrink:0 }}>
                    + Ajouter
                  </button>
                  {adminFormErr && <span style={{ color:'#F87171', fontFamily:'Inter', fontSize:'0.82rem', alignSelf:'center', width:'100%' }}>{adminFormErr}</span>}
                </form>
              )}

              {/* Action buttons */}
              <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
                {!started && playerCount >= 2 && (
                  <button onClick={handleLaunchTournament} className="btn btn-gold" style={{ padding:'11px 24px', fontSize:'0.88rem' }}>
                    🚀 Lancer le tournoi ({playerCount} joueurs)
                  </button>
                )}
                <button
                  className="btn btn-danger"
                  style={{ padding:'11px 20px', fontSize:'0.82rem' }}
                  onClick={async () => { if (confirm('Réinitialiser complètement le tournoi ?')) await resetAll({}); }}
                >
                  ↺ Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT (roster / bracket) ── */}
      <section id="content" style={{ position:'relative', zIndex:10, padding:'4rem 0' }}>
        <div className="container">

          {/* Section title */}
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
            <div>
              <div style={{ fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.62rem', color:'var(--orange)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:6 }}>
                {started ? 'Tournoi en cours' : 'Participants'}
              </div>
              <h2 style={{ fontFamily:'Bebas Neue, cursive', fontSize:'clamp(1.8rem,4vw,2.8rem)', color:'var(--white)', letterSpacing:'0.04em', lineHeight:1 }}>
                {started ? 'MATCHS & BRACKET' : 'JOUEURS INSCRITS'}
              </h2>
            </div>
            {!started && (
              <Link href="/register" className="btn btn-primary" style={{ padding:'10px 22px', fontSize:'0.85rem' }}>
                + S'inscrire
              </Link>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:'1.75rem' }}>
            {(['roster','bracket'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className="tab-btn" data-active={activeTab === tab}>
                {tab === 'roster' ? 'Joueurs' : 'Bracket'}
              </button>
            ))}
          </div>

          {/* Roster */}
          {activeTab === 'roster' && (
            <div className="fade-up" style={{ background:'var(--black-1)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
              <div style={{ padding:'0.75rem 1.1rem', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontFamily:'Inter, sans-serif', fontSize:'0.7rem', fontWeight:600, color:'var(--gray-3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  {playerCount} joueur{playerCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ padding:'0.75rem' }}>
                <PlayerGrid players={players ?? []} isAdmin={isAdmin} />
              </div>
            </div>
          )}

          {/* Bracket */}
          {activeTab === 'bracket' && (
            <div className="fade-up">
              {started && players && matches ? (
                <>
                  {/* Match cards horizontal scroll */}
                  <div style={{ display:'flex', gap:'0.75rem', overflowX:'auto', paddingBottom:'1rem', marginBottom:'1.5rem' }}>
                    {sortedRounds.map(round => {
                      const rMatches = (roundsMap.get(round) ?? []).sort((a,b) => a.matchIndex - b.matchIndex);
                      return rMatches.map(match => {
                        const p1 = match.player1Id ? pMap.get(match.player1Id) : undefined;
                        const p2 = match.player2Id ? pMap.get(match.player2Id) : undefined;
                        return (
                          <MatchCard key={match._id} p1={p1} p2={p2}
                            round={roundLabel(round, totalRounds)}
                            hasWinner={!!match.winnerId} winnerId={match.winnerId} />
                        );
                      });
                    })}
                  </div>
                  {/* Full bracket tree */}
                  <div style={{ background:'var(--black-1)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'1.5rem', overflowX:'auto' }}>
                    <BracketView matches={matches} players={players} isAdmin={isAdmin} onChampion={p => setChampion(p)} />
                  </div>
                </>
              ) : (
                <div style={{ textAlign:'center', padding:'3rem 1rem', background:'var(--black-1)', border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
                  <div style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>🏟️</div>
                  <p style={{ fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'1rem', color:'var(--gray-2)', marginBottom:'0.35rem' }}>
                    Le tournoi n'a pas encore démarré
                  </p>
                  <p style={{ fontFamily:'Inter, sans-serif', fontSize:'0.82rem', color:'var(--gray-3)' }}>
                    {playerCount < 2 ? 'Au moins 2 joueurs requis' : `${playerCount} joueurs prêts — en attente du lancement`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── ADMIN LOGIN MODAL ── */}
      {showAdminModal && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(8px)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAdminModal(false); setAdminPassword(''); setAdminError(''); }}}
        >
          <div style={{ background:'var(--black-1)', border:'1px solid var(--border)', borderTop:'2px solid var(--orange)', borderRadius:'var(--radius)', padding:'2rem', width:'100%', maxWidth:360 }}>
            <h2 style={{ fontFamily:'Bebas Neue, cursive', fontSize:'1.8rem', color:'var(--white)', marginBottom:'0.25rem', letterSpacing:'0.05em' }}>
              Accès Admin
            </h2>
            <p style={{ fontFamily:'Inter, sans-serif', fontSize:'0.8rem', color:'var(--gray-2)', marginBottom:'1.5rem' }}>
              Entrez le mot de passe pour accéder au panneau administrateur.
            </p>
            <form onSubmit={handleAdminLogin} style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              <input
                type="password" value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Mot de passe" className="input" autoFocus
              />
              {adminError && <p className="error-box" style={{ margin:0 }}>{adminError}</p>}
              <button type="submit" className="btn btn-primary" style={{ padding:'13px', fontSize:'0.95rem', marginTop:'0.25rem' }}>
                Se connecter
              </button>
            </form>
          </div>
        </div>
      )}

      {neymarPlayer && <NeymarWelcome player={neymarPlayer} onDone={() => setNeymarPlayer(null)} />}
      {champion     && <ChampionScreen champion={champion} onClose={() => setChampion(null)} />}
    </main>
  );
}

function StatBox({ value, label, orange }: { value: string|number; label: string; orange?: boolean }) {
  return (
    <div style={{ padding:'1.1rem 0.75rem', textAlign:'center' }}>
      <div style={{ fontFamily:'Bebas Neue, cursive', fontSize:'2.2rem', lineHeight:1, color: orange ? 'var(--orange)' : 'var(--white)', letterSpacing:'0.02em' }}>{value}</div>
      <div style={{ fontFamily:'Inter, sans-serif', fontSize:'0.58rem', fontWeight:500, color:'var(--gray-2)', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:3 }}>{label}</div>
    </div>
  );
}

function MatchCard({ p1, p2, round, hasWinner, winnerId }: {
  p1?: Player; p2?: Player; round: string; hasWinner: boolean; winnerId?: string;
}) {
  const c1 = p1 ? (GAME_COLORS[p1.game] ?? '#555') : '#333';
  const c2 = p2 ? (GAME_COLORS[p2.game] ?? '#555') : '#333';
  return (
    <div style={{ flexShrink:0, width:210, background:'var(--black-1)', border:`1px solid ${hasWinner ? 'rgba(255,215,0,0.2)' : 'var(--border)'}`, borderRadius:6, overflow:'hidden' }}>
      <div style={{ padding:'5px 10px', borderBottom:'1px solid var(--border)', background:'rgba(255,255,255,0.01)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'Inter, sans-serif', fontSize:'0.58rem', fontWeight:700, color:'var(--gray-3)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{round}</span>
        {hasWinner ? <span style={{ fontSize:'0.58rem', fontWeight:700, color:'#FFD700' }}>Terminé</span>
          : p1 && p2 ? <span style={{ fontSize:'0.58rem', fontWeight:700, color:'var(--orange)' }}>À jouer</span>
          : <span style={{ fontSize:'0.58rem', color:'var(--gray-3)' }}>BYE</span>}
      </div>
      <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:5 }}>
        {[{ player:p1, color:c1 }, { player:p2, color:c2 }].map(({ player, color }, idx) => (
          <div key={idx} style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 7px', borderRadius:3, borderLeft:`3px solid ${winnerId === player?._id ? '#FFD700' : color + '55'}`, background: winnerId === player?._id ? 'rgba(255,215,0,0.05)' : 'transparent' }}>
            <span style={{ fontSize:'0.95rem', lineHeight:1 }}>{player?.avatar ?? '?'}</span>
            <span style={{ fontFamily:'Inter, sans-serif', fontWeight: winnerId === player?._id ? 700 : 500, fontSize:'0.78rem', color: winnerId === player?._id ? '#FFD700' : 'var(--gray-1)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {player?.pseudo ?? 'En attente…'}
            </span>
            {winnerId === player?._id && <span style={{ fontSize:'0.65rem', color:'#FFD700' }}>✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

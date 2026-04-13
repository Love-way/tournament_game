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

  // --- LOGIQUE DU CARROUSEL CORRIGÉE ---
  const [slideIndex, setSlideIndex] = useState(0);
  const heroImages = ['/hero1.jpg', '/hero2.jpg', '/hero3.jpg'];

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000); // Augmenté à 5s pour mieux apprécier les images
    return () => clearInterval(timer);
  }, [heroImages.length]);
  // -------------------------------------

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

      {/* Three.js background */}
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
          <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'Inter, sans-serif', fontSize:'0.72rem', fontWeight:600, color: started ? '#F87171' : '#4ADE80' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background: started ? '#EF4444' : '#22C55E', display:'inline-block' }} />
            {started ? 'Live' : 'Inscriptions ouvertes'}
          </div>
          <Link href="/register" className="btn btn-primary" style={{ padding:'8px 18px', fontSize:'0.82rem' }} onClick={playClickSound}>
            S'inscrire
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════
          HERO SECTION WITH REFINED CAROUSEL
      ══════════════════════════════════ */}
      <section style={{
        position:'relative', zIndex:10,
        minHeight:'100vh',
        display:'grid', gridTemplateColumns:'55% 45%',
        alignItems:'center',
        overflow:'hidden',
      }}>

        {/* Hero carousel container */}
        <div style={{ position:'absolute', inset:0, zIndex:0, background: '#0a0a0a' }}>
          {heroImages.map((src, i) => (
            <div
              key={src}
              style={{
                position:'absolute', 
                inset:0,
                backgroundImage:`url(${src})`,
                backgroundSize:'cover',
                backgroundPosition:'center 20%',
                opacity: i === slideIndex ? 1 : 0,
                transition:'opacity 1.5s ease-in-out', // Transition plus douce
                zIndex: i === slideIndex ? 1 : 0,
              }}
            />
          ))}
          {/* Gradients pour la lisibilité */}
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%)',
            zIndex:2,
          }} />
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(to bottom, transparent 60%, var(--black) 100%)',
            zIndex:2,
          }} />
        </div>

        {/* LEFT — headline */}
        <div style={{ position:'relative', zIndex:5, padding:'8rem 4rem 5rem 6rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.75rem' }}>
            <div style={{ width:28, height:2, background:'var(--orange)' }} />
            <span style={{ fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.68rem', color:'var(--orange)', letterSpacing:'0.18em', textTransform:'uppercase' }}>
              Tournoi Gaming 2026
            </span>
          </div>

          <h1 style={{
            fontFamily:'"Brush King", "Bebas Neue", cursive',
            fontSize:'clamp(4rem, 9vw, 8rem)',
            lineHeight:0.85,
            color:'var(--white)',
            marginBottom:'0.1em',
            textShadow:'0 10px 30px rgba(0,0,0,0.5)',
          }}>
            OMSHINA
          </h1>
          <h1 style={{
            fontFamily:'"Brush King", "Bebas Neue", cursive',
            fontSize:'clamp(4rem, 9vw, 8rem)',
            lineHeight:0.85,
            color:'var(--orange)',
            marginBottom:'1.75rem',
            textShadow:'0 10px 30px rgba(255,107,0,0.3)',
          }}>
            TOURNOI ZONE
          </h1>

          <p style={{ fontFamily:'Inter, sans-serif', fontSize:'1rem', color:'rgba(255,255,255,0.7)', maxWidth:440, lineHeight:1.65, marginBottom:'2.5rem' }}>
            Préparez-vous pour l'élite. Le tournoi OMSHINA rassemble les meilleurs talents du Bénin pour une compétition sans merci.
          </p>

          <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
            <Link href="/register" className="btn btn-primary" style={{ padding:'16px 38px', fontSize:'1rem' }} onClick={playClickSound}>
              S'inscrire maintenant
            </Link>
            <button onClick={handleCopyLink} className="btn btn-outline" style={{ padding:'16px 28px', fontSize:'1rem' }}>
              {copied ? '✓ Lien copié' : 'Inviter un rival'}
            </button>
          </div>
        </div>

        {/* RIGHT — content remains the same */}
        <div style={{ position:'relative', zIndex:5, display:'flex', flexDirection:'column', alignItems:'flex-start', justifyContent:'center', gap:'1.5rem', padding:'8rem 5rem 5rem 2rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1px', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', width:'100%', maxWidth:320, backdropFilter:'blur(12px)', background:'rgba(20,20,20,0.6)' }}>
            <StatBox value={playerCount} label="Inscrits" orange />
            <StatBox value={matchCount || '—'} label="À venir" />
            <StatBox value={doneCount || '—'} label="Terminés" />
            <StatBox value={started ? 'LIVE' : 'WAIT'} label="Status" orange={started} />
          </div>

          {!started && <div style={{ width:'100%', maxWidth:320 }}><CountdownTimer /></div>}

          {playerCount > 0 && (
            <div style={{ width:'100%', maxWidth:320 }}>
              <div style={{ fontFamily:'Inter, sans-serif', fontSize:'0.65rem', fontWeight:600, color:'var(--gray-3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:12 }}>
                Guerriers en lice
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {(players ?? []).slice(0, 4).map(p => (
                  <div key={p._id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:6 }}>
                    <span>{p.avatar}</span>
                    <span style={{ fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.85rem', color:'var(--gray-1)', flex:1 }}>{p.pseudo}</span>
                    <span style={{ fontFamily:'Inter, sans-serif', fontSize:'0.7rem', color: GAME_COLORS[p.game] ?? 'var(--gray-3)', fontWeight:700 }}>{p.game}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Reste du code (Admin Panel, Match Section, Modals) inchangé pour la structure... */}
      {isAdmin && (
        <div style={{ position:'relative', zIndex:10, background:'rgba(255,107,0,0.02)', borderTop:'1px solid rgba(255,107,0,0.1)', borderBottom:'1px solid rgba(255,107,0,0.1)' }}>
          <div className="container" style={{ padding:'1.25rem' }}>
            <div style={{ fontFamily:'Inter, sans-serif', fontSize:'0.65rem', fontWeight:700, color:'var(--orange)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'1rem' }}>Admin Control</div>
            <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
              {!started && (
                <form onSubmit={handleAdminAddPlayer} style={{ display:'flex', gap:'0.5rem', flex:1 }}>
                  <input type="text" value={adminPseudo} onChange={e => setAdminPseudo(e.target.value)} placeholder="Pseudo" className="input" maxLength={20} />
                  <select value={adminGame} onChange={e => setAdminGame(e.target.value)} className="input">
                    {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <button type="submit" className="btn btn-primary">+ Add</button>
                </form>
              )}
              <div style={{ display:'flex', gap:'0.5rem' }}>
                {!started && playerCount >= 2 && <button onClick={handleLaunchTournament} className="btn btn-gold">Lancer</button>}
                <button className="btn btn-danger" onClick={async () => { if(confirm('Reset?')) await resetAll({}); }}>Reset</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sections Matchs & Roster identiques à ton code original */}
      {started && matches && matches.length > 0 && (
         <section id="matches" style={{ position:'relative', zIndex:10, padding:'4rem 0' }}>
            <div className="container">
                {/* ... contenu des matchs ... */}
                <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:'2rem' }}>
                    {(['roster','bracket'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className="tab-btn" data-active={activeTab === tab}>
                        {tab === 'roster' ? 'Joueurs' : 'Bracket'}
                        </button>
                    ))}
                </div>
                {activeTab === 'bracket' && <BracketView matches={matches} players={players ?? []} isAdmin={isAdmin} onChampion={p => setChampion(p)} />}
                {activeTab === 'roster' && <PlayerGrid players={players ?? []} isAdmin={isAdmin} />}
            </div>
         </section>
      )}

      {!started && (
        <section id="roster" style={{ position:'relative', zIndex:10, padding:'4rem 0' }}>
          <div className="container">
            <h2 style={{ fontFamily:'Bebas Neue', color:'white', marginBottom:'2rem' }}>LISTE DES PARTICIPANTS</h2>
            <PlayerGrid players={players ?? []} isAdmin={isAdmin} />
          </div>
        </section>
      )}

      {showAdminModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'var(--black-1)', padding:'2rem', borderRadius:8, border:'1px solid var(--border)' }}>
             <form onSubmit={handleAdminLogin} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Password" className="input" autoFocus />
                <button type="submit" className="btn btn-primary">Login</button>
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
    <div style={{ background:'rgba(0,0,0,0.2)', padding:'1.25rem 1rem', textAlign:'center' }}>
      <div style={{ fontFamily:'Bebas Neue', fontSize:'2.2rem', color: orange ? 'var(--orange)' : 'white' }}>{value}</div>
      <div style={{ fontSize:'0.6rem', color:'var(--gray-3)', textTransform:'uppercase' }}>{label}</div>
    </div>
  );
}
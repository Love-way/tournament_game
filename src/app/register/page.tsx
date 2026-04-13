'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import NeymarWelcome from '@/components/NeymarWelcome';
import { playRegistrationMelody, playClickSound } from '@/lib/sounds';
import Link from 'next/link';

const GAMES   = ['FIFA','eFootball','Rocket League','Valorant','Mortal Kombat','Street Fighter','Call of Duty','Fortnite','NBA 2K','Tekken'];
const AVATARS = ['🐉','🦁','🐺','🦊','🐯','🦅','🦋','🐬','🦄','🔥','⚡','🌪️','💎','🎯','👑'];

const GAME_COLORS: Record<string,string> = {
  'FIFA':'#00a651','eFootball':'#1a6fdd','Rocket League':'#e84c00','Valorant':'#ff4655',
  'Mortal Kombat':'#cc0000','Street Fighter':'#d42b00','Call of Duty':'#7a9e3a',
  'Fortnite':'#9747d4','NBA 2K':'#1d428a','Tekken':'#e8a000',
};

export default function RegisterPage() {
  const tournament = useQuery(api.tournament.getState);
  const addPlayer  = useMutation(api.players.add);

  const [pseudo,     setPseudo]     = useState('');
  const [game,       setGame]       = useState(GAMES[0]);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [showNeymar, setShowNeymar] = useState(false);
  const [regPlayer,  setRegPlayer]  = useState<{pseudo:string;game:string;avatar:string}|null>(null);

  const isClosed = tournament?.started === true;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const t = pseudo.trim();
    if (t.length < 2 || t.length > 20) { setError('Le pseudo doit faire entre 2 et 20 caractères.'); return; }
    setLoading(true); playClickSound();
    try {
      const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      await addPlayer({ pseudo: t, game, avatar });
      setRegPlayer({ pseudo: t, game, avatar });
      setSuccess(true); setShowNeymar(true);
      playRegistrationMelody(); setPseudo('');
    } catch(err: any) {
      setError(err.message ?? "Erreur lors de l'inscription.");
    } finally { setLoading(false); }
  }

  return (
    <>
      <nav className="nav">
        <div className="container" style={{ display:'flex', alignItems:'center', gap:'1rem', width:'100%' }}>
          <Link href="/" style={{ textDecoration:'none' }} onClick={playClickSound}>
            <span style={{ fontFamily:'Bebas Neue, cursive', fontSize:'1.35rem', color:'var(--white)', letterSpacing:'0.05em' }}>
              OMSHINA <span style={{ color:'var(--orange)' }}>TOURNOI ZONE</span>
            </span>
          </Link>
          <div style={{ flex:1 }} />
          <Link href="/" className="btn btn-outline" style={{ padding:'7px 16px', fontSize:'0.78rem' }} onClick={playClickSound}>
            ← Retour
          </Link>
        </div>
      </nav>

      <main style={{ minHeight:'100vh', background:'var(--black)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'5rem 1rem 3rem' }}>

        <div style={{ textAlign:'center', marginBottom:'2.5rem', maxWidth:480 }}>
          <div style={{ fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.68rem', color:'var(--orange)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:'0.75rem' }}>
            Inscription joueur
          </div>
          <h1 style={{ fontFamily:'Bebas Neue, cursive', fontSize:'clamp(2.5rem,8vw,5rem)', letterSpacing:'0.04em', lineHeight:0.95, color:'var(--white)', marginBottom:'0.75rem' }}>
            REJOINS<br />L'ARÈNE
          </h1>
          <p style={{ fontFamily:'Inter, sans-serif', color:'var(--gray-2)', fontSize:'0.9rem' }}>
            Inscris-toi et affronte les meilleurs joueurs du tournoi
          </p>
        </div>

        <div style={{ background:'var(--black-1)', border:'1px solid var(--border)', borderTop:'2px solid var(--orange)', borderRadius:'var(--radius)', width:'100%', maxWidth:480, overflow:'hidden' }}>
          <div style={{ padding:'2rem' }}>
            {isClosed ? (
              <div style={{ textAlign:'center', padding:'2rem 0' }}>
                <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>🔒</div>
                <h2 style={{ fontFamily:'Bebas Neue, cursive', fontSize:'1.8rem', color:'var(--white)', marginBottom:'0.5rem', letterSpacing:'0.04em' }}>Inscriptions fermées</h2>
                <p style={{ fontFamily:'Inter, sans-serif', color:'var(--gray-2)', fontSize:'0.88rem' }}>Le tournoi a déjà démarré. Bonne chance aux joueurs !</p>
              </div>
            ) : success ? (
              <div style={{ textAlign:'center', padding:'1rem 0' }} className="fade-up">
                <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>🎉</div>
                <h2 style={{ fontFamily:'Bebas Neue, cursive', fontSize:'1.8rem', color:'var(--white)', marginBottom:'0.5rem', letterSpacing:'0.04em' }}>Inscription réussie !</h2>
                <p style={{ fontFamily:'Inter, sans-serif', color:'var(--gray-2)', marginBottom:'1.5rem', fontSize:'0.88rem' }}>
                  Tu joues en tant que <strong style={{ color:'var(--orange)' }}>{regPlayer?.pseudo}</strong> sur <strong style={{ color:'var(--white)' }}>{regPlayer?.game}</strong>
                </p>
                <div style={{ display:'flex', gap:'0.5rem', justifyContent:'center', flexWrap:'wrap' }}>
                  <button onClick={() => { setSuccess(false); setShowNeymar(false); }} className="btn btn-outline" style={{ padding:'10px 20px' }}>
                    Inscrire un autre joueur
                  </button>
                  <Link href="/" className="btn btn-primary" style={{ padding:'10px 20px' }} onClick={playClickSound}>
                    Voir le tournoi →
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

                <div>
                  <label style={{ display:'block', fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.65rem', color:'var(--orange)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:8 }}>
                    Pseudo *
                  </label>
                  <input
                    type="text" value={pseudo} onChange={e => setPseudo(e.target.value)}
                    placeholder="Ton pseudo (2–20 caractères)"
                    className="input" maxLength={20} required
                  />
                </div>

                <div>
                  <label style={{ display:'block', fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.65rem', color:'var(--orange)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:8 }}>
                    Jeu principal *
                  </label>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'0.4rem' }}>
                    {GAMES.map(g => {
                      const c = GAME_COLORS[g] ?? '#555';
                      const sel = g === game;
                      return (
                        <button key={g} type="button"
                          onClick={() => { setGame(g); playClickSound(); }}
                          style={{
                            padding:'8px 12px', borderRadius:4, cursor:'pointer',
                            border:`1px solid ${sel ? c : 'var(--border)'}`,
                            background: sel ? `${c}12` : 'rgba(255,255,255,0.01)',
                            color: sel ? c : 'var(--gray-2)',
                            fontFamily:'Inter, sans-serif', fontWeight:600, fontSize:'0.78rem',
                            transition:'all 0.15s', textAlign:'left',
                          }}
                        >{g}</button>
                      );
                    })}
                  </div>
                </div>

                {error && <p className="error-box" style={{ margin:0 }}>{error}</p>}

                <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding:'14px', fontSize:'0.92rem' }}>
                  {loading ? 'Inscription en cours…' : "S'inscrire au tournoi"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {showNeymar && regPlayer && <NeymarWelcome player={regPlayer} onDone={() => setShowNeymar(false)} />}
    </>
  );
}

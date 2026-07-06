import { useRef, useEffect, useState } from 'react';
import {  Code2, Globe, ChevronDown, Database, Mic } from 'lucide-react';

interface HeroScrollProps {
  onEnterApp: () => void;
}

const CARDS = [
  {
    id: 'dev',   icon: Code2,    num: '01', title: 'DEVELOPER MODE',
    desc: 'Full-stack context always loaded. Zero setup friction.',
    color: '#00CFFF',
    mobile: { bottom: '22%', left: '4%' },
    desktop: { left: '2%', top: '28%' },
    showAt: 0.12, hideAt: 0.30,
  },
  {
    id: 'voice', icon: Mic,      num: '02', title: 'VOICE INTELLIGENCE',
    desc: 'Speak naturally. Instant response. Hands-free flow.',
    color: '#FFB347',
    mobile: { bottom: '22%', right: '4%' },
    desktop: { right: '2%', top: '26%' },
    showAt: 0.33, hideAt: 0.51,
  },
  {
    id: 'mem',   icon: Database, num: '03', title: 'MEMORY ENGINE',
    desc: 'Persistent context. Your stack. Every session.',
    color: '#00CFFF',
    mobile: { bottom: '10%', left: '4%' },
    desktop: { left: '2%', bottom: '22%' },
    showAt: 0.53, hideAt: 0.70,
  },
  {
    id: 'agent', icon: Globe,    num: '04', title: 'AGENTIC WORKSPACE',
    desc: 'Projects, search, recents — all in one OS.',
    color: '#FFB347',
    mobile: { bottom: '10%', right: '4%' },
    desktop: { right: '2%', bottom: '22%' },
    showAt: 0.72, hideAt: 0.88,
  },
];

/* lerp helper */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function HeroScroll({ onEnterApp }: HeroScrollProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const video1Ref      = useRef<HTMLVideoElement>(null);
  const video2Ref      = useRef<HTMLVideoElement>(null);
  const overlayRef     = useRef<HTMLDivElement>(null);
  const ctaRef         = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const rafRef         = useRef(0);
  const smoothProg     = useRef(0); // lerped progress value
  const prevCardsKey   = useRef('');

  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [vid1Ready, setVid1Ready]       = useState(false);
  const [loadPct, setLoadPct]           = useState(0);
  const [isMobile, setIsMobile]         = useState(false);

  /* responsive breakpoint */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ── Continuous rAF loop — decoupled from scroll events ─────────────────── */
  useEffect(() => {
    let alive = true;

    const loop = () => {
      if (!alive) return;

      const container = containerRef.current;
      if (container) {
        const totalScroll = container.offsetHeight - window.innerHeight;
        const rawProg     = totalScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / totalScroll)) : 0;

        // LERP → buttery smooth scrub (0.07 = ~14 frames to settle)
        smoothProg.current = lerp(smoothProg.current, rawProg, 0.07);
        const p = smoothProg.current;

        /* video 1 — scrubs 0→60% */
        const v1 = video1Ref.current;
        if (v1 && isFinite(v1.duration) && v1.duration > 0) {
          const t1 = Math.min(1, p / 0.60) * v1.duration;
          if (Math.abs(v1.currentTime - t1) > 0.016) v1.currentTime = t1; // ~1 frame
        }

        /* video 2 — scrubs 60→100% */
        const v2 = video2Ref.current;
        if (v2 && isFinite(v2.duration) && v2.duration > 0) {
          const t2 = Math.min(1, Math.max(0, (p - 0.60) / 0.40)) * v2.duration;
          if (Math.abs(v2.currentTime - t2) > 0.016) v2.currentTime = t2;
        }

        /* crossfade */
        if (v1) v1.style.opacity = p < 0.52 ? '1' : String(Math.max(0, 1 - (p - 0.52) / 0.12));
        if (v2) v2.style.opacity = p < 0.56 ? '0' : String(Math.min(1, (p - 0.56) / 0.10));

        /* hero text */
        const ov = overlayRef.current;
        if (ov) {
          const op = Math.max(0, 1 - p / 0.10);
          ov.style.opacity   = String(op);
          ov.style.transform = `translateY(${p * -70}px)`;
        }

        /* CTA */
        const cta = ctaRef.current;
        if (cta) {
          if (p >= 0.87) {
            const cp = Math.min(1, (p - 0.87) / 0.13);
            cta.style.opacity       = String(cp);
            cta.style.transform     = `translateY(${(1 - cp) * 55}px) scale(${0.96 + cp * 0.04})`;
            cta.style.pointerEvents = 'auto';
          } else {
            cta.style.opacity       = '0';
            cta.style.transform     = 'translateY(55px) scale(0.96)';
            cta.style.pointerEvents = 'none';
          }
        }

        /* scroll progress bar */
        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${p * 100}%`;
        }

        /* annotation cards */
        const next = new Set<string>();
        CARDS.forEach(c => { if (p >= c.showAt && p < c.hideAt) next.add(c.id); });
        const key = [...next].sort().join(',');
        if (key !== prevCardsKey.current) {
          prevCardsKey.current = key;
          setVisibleCards(next);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  /* video setup */
  useEffect(() => {
    const setup = (v: HTMLVideoElement | null) => { if (v) { v.pause(); v.currentTime = 0; } };
    setup(video1Ref.current);
    setup(video2Ref.current);

    const v1 = video1Ref.current;
    if (!v1) return;
    const onMeta = () => {
      v1.pause();
      setLoadPct(60);
      setTimeout(() => { setLoadPct(100); setTimeout(() => setVid1Ready(true), 300); }, 400);
    };
    v1.addEventListener('loadedmetadata', onMeta);
    v1.addEventListener('canplaythrough', () => { setLoadPct(100); setVid1Ready(true); });
    return () => v1.removeEventListener('loadedmetadata', onMeta);
  }, []);

  return (
    <div ref={containerRef} style={{ height: '520vh', position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', width: '100%', overflow: 'hidden', background: '#000' }}>

        {/* ── VIDEO LAYER ── */}
        <video ref={video1Ref} src="/hero1.mp4" muted playsInline preload="auto"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }} />
        <video ref={video2Ref} src="/hero2.mp4" muted playsInline preload="auto"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0 }} />

        {/* ── SCAN LINE TEXTURE (premium detail) ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        }} />

        {/* ── GRID LINES OVERLAY ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(0,207,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,207,255,1) 1px,transparent 1px)',
          backgroundSize: '80px 80px',
        }} />

        {/* ── DARK OVERLAY ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
          background: 'linear-gradient(to bottom,rgba(0,0,0,0.65) 0%,rgba(0,0,0,0.1) 30%,rgba(0,0,0,0.2) 60%,rgba(0,0,0,0.9) 100%)',
        }} />
        <div style={{ position: 'absolute', inset: '0 auto 0 0', width: 160, pointerEvents: 'none', zIndex: 3, background: 'linear-gradient(to right,rgba(0,0,0,0.7),transparent)' }} />
        <div style={{ position: 'absolute', inset: '0 0 0 auto', width: 160, pointerEvents: 'none', zIndex: 3, background: 'linear-gradient(to left,rgba(0,0,0,0.7),transparent)' }} />

        {/* ── LOADING SCREEN ── */}
        {!vid1Ready && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 70 }}>
            <div style={{ position: 'relative', marginBottom: 32, width: 140, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,4,8,0.6)', border: '1px solid rgba(0,207,255,0.25)', borderRadius: '18px', boxShadow: '0 0 32px rgba(0,207,255,0.2)' }}>
              <img src="/logo.png" alt="MARK 45 Logo" style={{ width: 120, height: 44, objectFit: 'contain' }} />
              <div style={{ position: 'absolute', inset: -12, borderRadius: '50%', border: '1px solid rgba(0,207,255,0.2)', animation: 'heroRingPulse 2s ease-in-out infinite' }} />
            </div>
            <div style={{ width: 220, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ height: '100%', width: `${loadPct}%`, background: 'linear-gradient(90deg,#00CFFF,#0070F3)', borderRadius: 999, transition: 'width 0.5s ease', boxShadow: '0 0 12px #00CFFF' }} />
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,207,255,0.5)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
              Initializing visual system...
            </p>
          </div>
        )}

        {/* ── HERO TEXT ── */}
        <div ref={overlayRef} style={{
          position: 'absolute', inset: 0, zIndex: 20, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '0 24px', pointerEvents: 'none',
          willChange: 'opacity, transform',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isMobile ? 20 : 32 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00CFFF', boxShadow: '0 0 8px #00CFFF', animation: 'heroPulse 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'monospace', fontSize: isMobile ? 9 : 11, color: '#00CFFF', textTransform: 'uppercase', letterSpacing: '0.3em' }}>
              MARK 45 OS v1.0 — System Online
            </span>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00CFFF', boxShadow: '0 0 8px #00CFFF', animation: 'heroPulse 2s ease-in-out infinite 0.6s' }} />
          </div>

          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, lineHeight: 1.0, margin: 0, letterSpacing: '-0.02em' }}>
            <span style={{ display: 'block', fontSize: isMobile ? '13vw' : '8.5vw', color: '#ffffff', textShadow: '0 0 80px rgba(0,207,255,0.25)' }}>THINK</span>
            <span style={{
              display: 'block', fontSize: isMobile ? '13vw' : '8.5vw',
              background: 'linear-gradient(90deg,#00CFFF 0%,#FFB347 55%,#00CFFF 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'heroGradientMove 4s linear infinite',
            }}>DIFFERENT.</span>
          </h1>

          <p style={{
            marginTop: isMobile ? 16 : 24, color: 'rgba(255,255,255,0.6)',
            maxWidth: 460, lineHeight: 1.75, fontSize: isMobile ? 13 : 17,
            textShadow: '0 2px 24px rgba(0,0,0,0.95)',
          }}>
            The AI-powered developer workspace that thinks with you.<br />
            Voice · Memory · Search · Code — all in one agentic OS.
          </p>

          {/* Scroll indicator */}
          <div style={{ marginTop: isMobile ? 40 : 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.55 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.4em' }}>Scroll to explore</span>
            <div style={{ width: 22, height: 34, borderRadius: 999, border: '1.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 5 }}>
              <div style={{ width: 4, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.5)', animation: 'heroScrollBounce 1.6s ease-in-out infinite' }} />
            </div>
            <ChevronDown style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.2)', animation: 'heroScrollBounce 1.6s ease-in-out infinite 0.35s' }} />
          </div>
        </div>

        {/* ── ANNOTATION CARDS ── */}
        {CARDS.map(card => {
          const isVisible = visibleCards.has(card.id);
          const Icon = card.icon;
          const pos = isMobile ? card.mobile : card.desktop;
          return (
            <div key={card.id} style={{
              position: 'absolute', zIndex: 30, ...pos,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0px) scale(1)' : 'translateY(24px) scale(0.96)',
              transition: 'opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)',
              pointerEvents: isVisible ? 'auto' : 'none',
            }}>
              <div style={{
                borderRadius: isMobile ? 14 : 20, padding: isMobile ? '12px 14px' : '16px 20px',
                maxWidth: isMobile ? 160 : 230,
                background: 'rgba(3,5,12,0.85)', backdropFilter: 'blur(24px)',
                border: `1px solid ${card.color}25`,
                boxShadow: `0 0 32px ${card.color}12, 0 12px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.03)`,
              }}>
                {/* Number label */}
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', marginBottom: 8 }}>
                  ─── {card.num}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: `${card.color}12`, border: `1px solid ${card.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ width: 13, height: 13, color: card.color }} />
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: isMobile ? 9 : 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: card.color }}>
                    {card.title}
                  </span>
                </div>
                <p style={{ color: 'rgba(209,213,219,0.75)', fontSize: isMobile ? 10 : 11, lineHeight: 1.65, margin: 0 }}>{card.desc}</p>
                <div style={{ marginTop: 10, height: 1, borderRadius: 1, opacity: 0.3, background: `linear-gradient(90deg,${card.color},transparent)` }} />
              </div>
            </div>
          );
        })}

        {/* ── CTA OVERLAY ── */}
        <div ref={ctaRef} style={{
          position: 'absolute', inset: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '0 24px',
          opacity: 0, transform: 'translateY(55px) scale(0.96)', pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 45%, rgba(0,10,24,0.97) 0%, rgba(0,0,0,0.99) 70%)',
        }}>
          {/* Cyan grid accent behind CTA */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025,
            backgroundImage: 'linear-gradient(rgba(0,207,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,207,255,1) 1px,transparent 1px)',
            backgroundSize: '60px 60px',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 36, opacity: 0.9, position: 'relative' }}>
            <div style={{ height: 1, width: 80, background: 'linear-gradient(to right,transparent,#00CFFF)' }} />
            <div style={{ width: 120, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,4,8,0.6)', border: '1px solid rgba(0,207,255,0.25)', borderRadius: '14px', boxShadow: '0 0 20px rgba(0,207,255,0.2)' }}>
              <img src="/logo.png" alt="MARK 45 Logo" style={{ width: 100, height: 36, objectFit: 'contain' }} />
            </div>
            <div style={{ height: 1, width: 80, background: 'linear-gradient(to left,transparent,#00CFFF)' }} />
          </div>

          <h2 style={{
            fontFamily: 'Orbitron, sans-serif', fontWeight: 900,
            fontSize: isMobile ? '9vw' : '5.5vw',
            color: '#fff', lineHeight: 1, letterSpacing: '-0.02em',
            margin: '0 0 20px', textShadow: '0 0 80px rgba(0,207,255,0.25)', position: 'relative',
          }}>YOUR AI OS AWAITS.</h2>

          <p style={{ color: 'rgba(156,163,175,0.9)', maxWidth: 400, lineHeight: 1.75, fontSize: isMobile ? 14 : 17, margin: '0 0 44px', position: 'relative' }}>
            Developer-grade intelligence. Voice-activated.<br />
            Context-aware. Built for builders like you.
          </p>

          <button onClick={onEnterApp} style={{
            padding: isMobile ? '14px 40px' : '17px 56px',
            background: 'linear-gradient(135deg,#00CFFF 0%,#0070F3 100%)',
            border: 'none', borderRadius: 20, fontWeight: 800,
            fontSize: isMobile ? 15 : 18, color: '#000',
            cursor: 'pointer', letterSpacing: '0.02em',
            boxShadow: '0 0 0 0 rgba(0,207,255,0)',
            transition: 'box-shadow 0.3s ease, transform 0.25s ease',
            position: 'relative',
          }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.boxShadow = '0 0 50px rgba(0,207,255,0.6),0 0 100px rgba(0,207,255,0.2)'; b.style.transform = 'scale(1.07)'; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.boxShadow = '0 0 0 0 rgba(0,207,255,0)'; b.style.transform = 'scale(1)'; }}
          >
            Enter MARK 45 OS →
          </button>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 36, opacity: 0.35, justifyContent: 'center' }}>
            {['Free to start', 'No credit card', 'Developer-first'].map(t => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                <span style={{ color: '#00CFFF' }}>✓</span> {t}
              </span>
            ))}
          </div>
        </div>

        {/* ── SCROLL PROGRESS BAR ── */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.06)', zIndex: 60 }}>
          <div ref={progressBarRef} style={{ height: '100%', width: '0%', background: 'linear-gradient(90deg,#00CFFF,#FFB347)', boxShadow: '0 0 8px #00CFFF', transition: 'width 0s' }} />
        </div>
      </div>

      <style>{`
        @keyframes heroScrollBounce { 0%,100%{transform:translateY(0);opacity:1} 50%{transform:translateY(9px);opacity:0.35} }
        @keyframes heroPulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes heroGradientMove { 0%{background-position:0% center} 100%{background-position:200% center} }
        @keyframes heroRingPulse { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.15);opacity:0.1} }
      `}</style>
    </div>
  );
}

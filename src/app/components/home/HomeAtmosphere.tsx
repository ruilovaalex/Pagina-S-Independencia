import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { animate, createScope } from 'animejs';
import { Pause, Play } from 'lucide-react';
import '../../../styles/home-atmosphere.css';

const preferenceKey = 'mi-independencia:background-motion:v1';

function PaperFlower({ className }: { className: string }) {
  const id = useId().replace(/:/g, '');
  return <svg className={className} viewBox="0 0 180 360" fill="none">
    <defs><pattern id={`${id}-dots`} width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#234431" opacity=".3"/></pattern></defs>
    <g stroke="#fffbed" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round">
      <path d="M83 335C90 272 97 208 91 143" stroke="#fffbed"/>
      <path d="M83 324C46 281 23 223 27 175C68 193 97 249 83 324Z" fill="#698d62"/>
      <path d="M89 296C133 267 159 216 154 161C115 184 94 240 89 296Z" fill="#416b48"/>
      <path d="M91 153C53 149 36 115 40 67L62 82L71 39L94 66L117 31L127 78L145 60C152 111 128 150 91 153Z" fill="#d79bae"/>
    </g>
    <path d="M83 335C90 272 97 208 91 143" stroke="#3d6146" strokeWidth="7"/>
    <path d="M83 324C46 281 23 223 27 175C68 193 97 249 83 324Z" fill="#698d62"/>
    <path d="M89 296C133 267 159 216 154 161C115 184 94 240 89 296Z" fill="#416b48"/>
    <path d="M91 153C53 149 36 115 40 67L62 82L71 39L94 66L117 31L127 78L145 60C152 111 128 150 91 153Z" fill="#d79bae"/>
    <path d="M91 146C72 124 70 93 71 57L94 77L113 52C124 91 116 125 91 146Z" fill="#edbecb"/>
    <path d="M83 324C46 281 23 223 27 175C68 193 97 249 83 324ZM89 296C133 267 159 216 154 161C115 184 94 240 89 296ZM91 153C53 149 36 115 40 67L62 82L71 39L94 66L117 31L127 78L145 60C152 111 128 150 91 153Z" fill={`url(#${id}-dots)`}/>
    <path d="M45 207L78 300M141 191L97 273" stroke="#e5ebce" strokeWidth="2" opacity=".7"/>
  </svg>;
}

export default function HomeAtmosphere({ children, active = true }: { children: (control: ReactNode, still: boolean) => ReactNode; active?: boolean }) {
  const patternRoot = useRef<HTMLDivElement>(null);
  const drift = useRef<ReturnType<typeof animate>>();
  const [paused, setPaused] = useState(() => {
    try { return localStorage.getItem(preferenceKey) === 'paused'; } catch { return false; }
  });
  const [hidden, setHidden] = useState(() => document.hidden);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (!patternRoot.current) return;
    const scope = createScope({ root: patternRoot.current }).add(() => {
      drift.current = animate('.atmosphere-strawberries', {
        x: [-32, 32], y: [-20, 20], duration: 10000,
        ease: 'inOutSine', loop: true, alternate: true, autoplay: false,
      });
    });
    return () => { scope.revert(); drift.current = undefined; };
  }, []);
  useEffect(() => {
    if (paused || reduced || hidden || !active) drift.current?.pause();
    else drift.current?.resume();
  }, [paused, reduced, hidden, active]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = () => setReduced(media.matches);
    const onVisibilityChange = () => setHidden(document.hidden);
    media.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      media.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
  const control = <button type="button" className="ambient-toggle" disabled={reduced} aria-pressed={!paused && !reduced} title={reduced ? 'Tu dispositivo tiene activado el movimiento reducido' : paused ? 'Activar el movimiento del fondo' : 'Pausar el movimiento del fondo'} onClick={() => {
    const next = !paused;
    setPaused(next);
    try { localStorage.setItem(preferenceKey, next ? 'paused' : 'moving'); } catch { /* A visual preference can remain in memory. */ }
  }}>{paused || reduced ? <Play size={13}/> : <Pause size={13}/>}<span>{reduced ? 'Movimiento reducido' : paused ? 'Activar animación' : 'Pausar animación'}</span></button>;
  return <>
    <div ref={patternRoot} hidden={!active} className={`home-atmosphere${paused || reduced || hidden ? ' is-still' : ''}`} aria-hidden="true">
      <div className="atmosphere-strawberries"/>
      <div className="atmosphere-pink"/>
      <div className="atmosphere-green"/>
      <PaperFlower className="atmosphere-flower flower-right"/>
      <PaperFlower className="atmosphere-flower flower-left"/>
    </div>
    {children(control, paused || reduced || hidden || !active)}
  </>;
}

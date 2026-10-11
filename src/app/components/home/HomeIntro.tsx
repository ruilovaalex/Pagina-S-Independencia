import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { dailyLove } from '../../../lib/daily-love';
import { Button } from '../ui/button';
import PaperCutText from './PaperCutText';
const PaperFlowerGarden = lazy(() => import('./PaperFlowerGarden'));

export default function HomeIntro({ onAdd, actionLabel, objectsId, motionControl, onInventory, motionPaused = false }: {
  onAdd: () => void;
  actionLabel: string;
  objectsId: string;
  motionControl?: ReactNode;
  motionPaused?: boolean;
  onInventory?: () => void;
}) {
  const reduced = useReducedMotion();
  const [memory,setMemory] = useState(()=>dailyLove());
  useEffect(()=>{
    const refresh = () => setMemory(dailyLove());
    const timer = window.setInterval(refresh,60000);
    document.addEventListener('visibilitychange',refresh);
    return ()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  return <header className="home-heading">
    <p className="hero-index"><span>MI HOGAR</span><span>CUENCA, EC</span></p>
    <h1><PaperCutText text="UN HOGAR."/><PaperCutText text="MUY TUYO."/></h1>
    <p className="hero-description">Mueve, gira y hazle espacio <br/>a lo que viene.<span className="hero-kittens" aria-hidden="true"><img src="/images/vintage-kittens.png" width="1145" height="1374" alt="" draggable={false} loading="lazy" decoding="async"/></span></p>
    <div className="hero-actions">
      <Button type="button" className="primary-action paper-special" onClick={onAdd}><PaperCutText text={actionLabel}/><span className="action-end" aria-hidden="true"><ArrowUpRight size={18}/></span></Button>
      <a href={`#${objectsId}`} onClick={onInventory} className="hero-inventory-link">Ver mis objetos <ArrowDown size={15}/></a>
      {motionControl}
    </div>
    <motion.figure className="nature-clipping personal-photo" initial={false} whileInView={{y:0,rotate:-3}} viewport={{once:true,amount:.3}} whileHover={reduced?undefined:{rotate:0,y:-4}} transition={{duration:reduced?0:.35}}><img src={memory.src} alt="Nuestro detalle de amor del día" loading="lazy" decoding="async"/><figcaption>{memory.note}</figcaption></motion.figure>
    <div className="hero-flower-row" aria-hidden="true"><Suspense fallback={<img src="/images/papercut-flower-row-v1.png" width="2172" height="724" alt=""/>}><PaperFlowerGarden paused={motionPaused || !!reduced}/></Suspense></div>
  </header>;
}

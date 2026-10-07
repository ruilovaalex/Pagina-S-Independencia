import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, ExtrudeGeometry, Shape, type Group, type OrthographicCamera } from 'three';

function paperShape(points: number[][]) {
  const shape = new Shape();
  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth: .045, bevelEnabled: false });
}

function Garden({ paused }: { paused: boolean }) {
  const stems = useRef<Array<Group | null>>([]);
  const heads = useRef<Array<Group | null>>([]);
  const leaves = useRef<Array<Group | null>>([]);
  const petals = useRef<Array<Group | null>>([]);
  const elapsed = useRef(0);
  const camera = useThree(s => s.camera) as OrthographicCamera;
  const size = useThree(s => s.size);
  const resources = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 128, 128);
    // Deterministic print grain, shared by all paper pieces.
    for (let i = 0; i < 1700; i++) {
      const x = (i * 73) % 128, y = (i * 41 + Math.floor(i / 128) * 17) % 128;
      ctx.fillStyle = i % 3 ? '#dbd8cf' : '#a7a798';
      ctx.fillRect(x, y, 1, i % 4 ? 1 : 2);
    }
    return {
      grain: new CanvasTexture(canvas),
      petal: paperShape([[-.09,0],[-.26,.25],[-.23,.54],[-.06,.67],[.16,.6],[.27,.36],[.16,.12]]),
      leaf: paperShape([[0,0],[-.18,.29],[-.15,.54],[.02,.72],[.18,.4],[.12,.16]]),
      tulip: paperShape([[-.05,0],[-.35,.2],[-.43,.58],[-.31,.88],[-.12,.68],[.04,.95],[.2,.7],[.37,.86],[.4,.45],[.27,.14]]),
    };
  }, []);
  useEffect(() => () => {
    resources.grain.dispose(); resources.petal.dispose(); resources.leaf.dispose(); resources.tulip.dispose();
  }, [resources]);
  useEffect(() => {
    camera.zoom = Math.min(size.width / 17.8, size.height / 4.25);
    camera.position.set(0, 1.75, 15);
    camera.lookAt(0, 1.75, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  useFrame((_, delta) => {
    if (paused) return;
    elapsed.current += Math.min(delta, .05);
    const time = elapsed.current;
    stems.current.forEach((stem, i) => {
      const wave = Math.sin(time * 1.25 - i * .43);
      if (stem) stem.rotation.z = wave * .065 + Math.sin(time * .47 + i) * .018;
      const head = heads.current[i];
      if (head) { head.rotation.y = Math.sin(time * 1.25 - i * .43 + .8) * .13; head.rotation.z = wave * -.025; }
      const leaf = leaves.current[i];
      if (leaf) leaf.rotation.y = Math.sin(time * 1.8 + i * .7) * .18;
    });
    petals.current.forEach((petal, i) => {
      if (petal) petal.rotation.x = Math.sin(time * 1.9 + i * .67) * .065;
    });
  });
  const colors = ['#e9b7c6', '#ad657c', '#f5f0df', '#bd4e76'];
  return <>
    <ambientLight intensity={1.7}/><directionalLight position={[-4, 6, 9]} intensity={2}/>
    {Array.from({ length: 18 }, (_, i) => {
      const height = 1.45 + (i * 7 % 9) * .13;
      const color = colors[i % colors.length];
      const tulip = i % 4 === 1;
      const petalCount = i % 3 === 0 ? 5 : 7;
      return <group key={i} position={[(i - 8.5) * .91, .08, (i % 3) * -.1]} ref={node => { stems.current[i] = node; }}>
        <mesh position={[0, height / 2, 0]}><cylinderGeometry args={[.024, .032, height, 5]}/><meshStandardMaterial color="#416b48" roughness={1}/></mesh>
        <group position={[0, height * .34, 0]} ref={node => { leaves.current[i] = node; }}>
          {[-1, 1].map(side => <mesh key={side} geometry={resources.leaf} position={[0, side > 0 ? .24 : 0, .04]} rotation={[0, side * .2, side * -.8]} scale={[1, 1.15, 1]}><meshStandardMaterial color={side > 0 ? '#c7d2b2' : '#718f80'} map={resources.grain} roughness={1} side={DoubleSide}/></mesh>)}
        </group>
        <group position={[0, height, .05]} ref={node => { heads.current[i] = node; }}>
          {tulip ? <>
            <mesh geometry={resources.tulip} rotation={[0, -.24, -.08]}><meshStandardMaterial color={color} map={resources.grain} roughness={1} side={DoubleSide}/></mesh>
            <mesh geometry={resources.tulip} position={[.02, .02, .09]} scale={[.58,.8,1]} rotation={[0,.28,.1]}><meshStandardMaterial color="#e9b7c6" map={resources.grain} roughness={1} side={DoubleSide}/></mesh>
          </> : <>
            {Array.from({ length: petalCount }, (_, p) => <group key={p} rotation={[0,0,p * Math.PI * 2 / petalCount]} ref={node => { petals.current[i * 7 + p] = node; }}><mesh geometry={resources.petal} rotation={[.12 + (p % 2) * .15, (p % 3 - 1) * .12, 0]}><meshStandardMaterial color={color} map={resources.grain} roughness={1} side={DoubleSide}/></mesh></group>)}
            <mesh position={[0,0,.13]} rotation={[Math.PI / 2,0,0]}><cylinderGeometry args={[.16,.18,.1,7]}/><meshStandardMaterial color={i % 2 ? '#263e32' : '#c7d2b2'} roughness={1}/></mesh>
          </>}
        </group>
      </group>;
    })}
  </>;
}

const Fallback = () => <img src="/images/papercut-flower-row-v1.png" width="2172" height="724" alt=""/>;
class GardenBoundary extends Component<{children: ReactNode}, {failed:boolean}> {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  render() { return this.state.failed ? <Fallback/> : this.props.children; }
}

export default function PaperFlowerGarden({ paused }: { paused: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setReady(true);
    }, {rootMargin:'100px'});
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={root} className="paper-flower-garden">
    {ready ? <GardenBoundary><Canvas orthographic camera={{position:[0,1.75,15],zoom:50}} dpr={[1,1.25]} frameloop={paused || !visible ? 'demand' : 'always'} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} fallback={<Fallback/>}><Garden paused={paused || !visible}/></Canvas></GardenBoundary> : <Fallback/>}
  </div>;
}

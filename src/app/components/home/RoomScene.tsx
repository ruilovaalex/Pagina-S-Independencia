import { Component, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Html, Environment, Lightformer, OrbitControls, RoundedBox } from '@react-three/drei';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Expand, Heart, LampDesk, Moon, Move, Play, Redo2, RotateCcw, Rotate3D, RotateCw, Sun, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { BoxGeometry, BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, MeshStandardMaterial, Plane, Shape, SphereGeometry, TubeGeometry, Vector3, type Group, type Material, type OrthographicCamera } from 'three';
import type { Product } from '../../types';
import { createRoomTextures } from './room-materials';
import { ROOM_BOUNDS, ROOM_FOOTPRINTS, ROOM_OBSTACLES, type Placement, type RoomItem, type RoomLayout } from '../../../lib/room-layout';
import useRoomLayout, { type LayoutSource } from './useRoomLayout';
import { Button } from '../ui/button';
import { CAT_DURATION, catFinancialReaction, catWalkVector, type CatAction, type CatProgress } from '../../../lib/cat-companion';
import { objectKind, type RoomId } from '../../../lib/house-state';
import { catRestPose, catBlink, easeCat, type CatRest } from '../../../lib/cat-pose';
export { objectKind } from '../../../lib/house-state';

type Point = [number, number, number];
const ROOM_WALL_LEFT = -ROOM_BOUNDS.halfWidth - .14;
const ROOM_WALL_BACK = -ROOM_BOUNDS.halfDepth - .07;
const ROOM_WINDOW_Z = -.85;
const ROOM_CAMERA_POSITION: Point = [7.5, 6.3, 9];
const ROOM_CAMERA_TARGET: Point = [0, 1.2, 0];
export type ObjectKind = 'sofa' | 'table' | 'bed' | 'fridge' | 'washer' | 'tv' | 'other';

function useRoomResources() {
  const resources = useMemo(() => {
    const textures = createRoomTextures();
    const standard = (color: string, roughness = .6, metalness = 0) => new MeshStandardMaterial({ color, roughness, metalness });
    const textile = (color: string) => new MeshStandardMaterial({ color, roughness: .96, bumpMap: textures.fabric, bumpScale: .012 });
    const wall = (color: string) => new MeshStandardMaterial({ color, roughness: .92, bumpMap: textures.plaster, bumpScale: .018 });
    const materials = {
      pink: textile('#d9a7b3'), blush: textile('#ecc4cd'), cream: textile('#f6ead6'), sage: textile('#9caf8c'),
      green: textile('#6e8771'), rug: textile('#d9dec2'), bed: textile('#b6c4a2'),
      wood: new MeshStandardMaterial({ map: textures.wood, roughness: .53 }),
      woodDark: new MeshStandardMaterial({ color: '#e3d0b4', map: textures.wood, roughness: .56 }),
      plasterPink: wall('#e9c4cb'), plasterGreen: wall('#b7c6ac'),
      stone: new MeshStandardMaterial({ map: textures.terrazzo, roughness: .74 }),
      ivory: standard('#f5eddd', .65), ceramic: standard('#f1ddce', .24),
      brass: standard('#bba075', .32, .68), dark: standard('#30443d', .35),
      leaf: standard('#557e59', .72), leafLight: standard('#91a56b', .76), soil: standard('#544338', 1),
      metal: standard('#cad6cb', .32, .38), silver: standard('#dce3dc', .28, .55),
      glass: standard('#304f46', .16, .4), ghost: standard('#dfd6ca', .78), ghostEdge: standard('#b1bda6', .8),
      fur: standard('#e6d7bc', .96), furLight: standard('#faf0dd', .96), innerEar: standard('#dcaaba', .94),
      eye: standard('#35594b', .48), pupil: standard('#213c31', .45), white: standard('#fff9e8', .5),
      led: new MeshStandardMaterial({ color: '#fff1d4', emissive: '#ffd394', emissiveIntensity: 1.5, roughness: .5 }),
      landscape: new MeshStandardMaterial({ map: textures.landscape, emissiveMap: textures.landscape, emissive: '#ffffff', emissiveIntensity: .25, roughness: 1 }),
      art: new MeshStandardMaterial({ map: textures.art, roughness: 1 }),
    };
    const preview = Object.fromEntries(Object.entries(materials).map(([name,material]) => {
      material.envMapIntensity = .65;
      const softened = material.clone();
      softened.color.lerp(new Color('#efe8df'),.27);
      softened.metalness *= .65;
      return [name,softened];
    })) as typeof materials;
    const sphere = new SphereGeometry(1, 24, 18);
    const cylinder = new CylinderGeometry(1, 1, 1, 32);
    return { textures, materials, preview, sphere, cylinder };
  }, []);
  useEffect(() => () => {
    resources.textures.dispose();
    Object.values(resources.materials).forEach(material => material.dispose());
    Object.values(resources.preview).forEach(material => material.dispose());
    resources.sphere.dispose(); resources.cylinder.dispose();
  }, [resources]);
  return resources;
}
type Resources = ReturnType<typeof useRoomResources>;
type Surface = keyof Resources['materials'];

// One shared low-poly cube for architectural pieces; lifetime matches this module.
const architecturalCube = new BoxGeometry(1,1,1);
function Box({ at, size, material, radius = .035, rotation, shadow = true }: { at: Point; size: Point; material: Material; radius?: number; rotation?: Point; shadow?: boolean }) {
  if(radius<=.015) return <mesh position={at} rotation={rotation} scale={size} geometry={architecturalCube} material={material} castShadow={shadow} receiveShadow dispose={null}/>;
  return <RoundedBox position={at} rotation={rotation} args={size} radius={Math.min(radius, Math.min(...size) / 2.1)} smoothness={2} bevelSegments={2} material={material} castShadow={shadow} receiveShadow />;
}
function Ball({ at, size, surface, r, rotation, shadow = true }: { at: Point; size: Point; surface: Surface; r: Resources; rotation?: Point; shadow?: boolean }) {
  return <mesh position={at} scale={size} rotation={rotation} geometry={r.sphere} material={r.materials[surface]} castShadow={shadow} receiveShadow dispose={null} />;
}
function Cylinder({ at, radius, height, surface, r, rotation, shadow = true, pending = false }: { at: Point; radius: number; height: number; surface: Surface; r: Resources; rotation?: Point; shadow?: boolean; pending?: boolean }) {
  return <mesh position={at} scale={[radius, height, radius]} rotation={rotation} geometry={r.cylinder} material={(pending ? r.preview : r.materials)[surface]} castShadow={shadow} receiveShadow dispose={null} />;
}
function Curve({ points, radius, material }: { points: Point[]; radius: number; material: Material }) {
  const key = points.flat().join(',');
  const geometry = useMemo(() => {
    const values = key.split(',').map(Number);
    const path = Array.from({ length:values.length/3 },(_,i) => new Vector3(values[i*3],values[i*3+1],values[i*3+2]));
    return new TubeGeometry(new CatmullRomCurve3(path),24,radius,6,false);
  }, [key,radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} castShadow dispose={null} />;
}

function Plant({ at, scale = 1, r }: { at: Point; scale?: number; r: Resources }) {
  return <group position={at} scale={scale}>
    <mesh position={[0,.19,0]} castShadow receiveShadow><cylinderGeometry args={[.21,.16,.36,32]} /><meshStandardMaterial color="#e2cfb6" roughness={.64} bumpMap={r.textures.plaster} bumpScale={.012}/></mesh>
    <Cylinder at={[0,.374,0]} radius={.187} height={.012} surface="soil" r={r} shadow={false}/>
    {[0,1,2,3,4,5,6].map(i => {
      const angle = i * 2.4;
      const height = .55 + (i % 3) * .23;
      return <group key={i} rotation={[0,angle,0]}>
        <Curve points={[[0,.35,0],[.04,height-.1,0],[.23,height+.1,0]]} radius={.012} material={r.materials.leaf}/>
        <Ball at={[.25,height+.16,0]} size={[.14,.27,.027]} surface={i % 2 ? 'leaf' : 'leafLight'} r={r} rotation={[0,0,-.65]} shadow={false}/>
      </group>;
    })}
  </group>;
}

function arch(width: number, bottom: number, spring: number, center = -ROOM_WINDOW_Z) {
  const shape = new Shape();
  const radius = width / 2;
  shape.moveTo(center-radius,bottom);
  shape.lineTo(center+radius,bottom);
  shape.lineTo(center+radius,spring);
  shape.absarc(center,spring,radius,0,Math.PI,false);
  shape.lineTo(center-radius,bottom);
  return shape;
}
function Architecture({ r, warm, wallColor, floorColor, roomId='living' }: { r: Resources; warm: boolean; wallColor?: string; floorColor?:string; roomId?:RoomId }) {
  const wallMaterial = useMemo(() => {
    const material = r.materials.plasterPink.clone();
    if (wallColor) material.color.set(wallColor);
    return material;
  }, [r,wallColor]);
  useEffect(() => () => wallMaterial.dispose(), [wallMaterial]);
  const floorMaterial=useMemo(()=>{const m=r.materials.wood.clone();if(floorColor)m.color.set(floorColor);return m;},[r,floorColor]);
  useEffect(()=>()=>floorMaterial.dispose(),[floorMaterial]);
  const {width,depth,halfWidth,halfDepth} = ROOM_BOUNDS;
  const [largePlant,smallPlant,lamp] = ROOM_OBSTACLES;
  const { wallGeometry, frameGeometry } = useMemo(() => {
    const wall = new Shape();
    const extent = ROOM_BOUNDS.halfDepth + .05;
    wall.moveTo(-extent,0); wall.lineTo(extent,0); wall.lineTo(extent,3.05); wall.lineTo(-extent,3.05); wall.closePath();
    wall.holes.push(arch(1.64,.73,1.9));
    const frame = arch(1.82,.66,1.9);
    frame.holes.push(arch(1.6,.75,1.9));
    return {
      wallGeometry: new ExtrudeGeometry(wall,{ depth:.13, bevelEnabled:false, curveSegments:24 }),
      frameGeometry: new ExtrudeGeometry(frame,{ depth:.08, bevelEnabled:true, bevelSize:.012, bevelThickness:.012, bevelSegments:2, curveSegments:24 }),
    };
  }, []);
  useEffect(() => () => { wallGeometry.dispose(); frameGeometry.dispose(); }, [wallGeometry,frameGeometry]);
  if(roomId!=='living') return <RoomArchitecture roomId={roomId} r={r} wallMaterial={wallMaterial} floorMaterial={floorColor?floorMaterial:undefined} warm={warm}/>;
  return <group>
    <Box at={[0,-.13,0]} size={[width+.28,.42,depth+.3]} material={r.materials.stone} radius={.11}/>
    <Box at={[0,-.025,halfDepth+.148]} size={[width+.03,.025,.016]} material={r.materials.led} radius={.003} shadow={false}/>
    <Box at={[halfWidth+.139,-.025,0]} size={[.016,.025,depth]} material={r.materials.led} radius={.003} shadow={false}/>
    {Array.from({length:13},(_,x) => Array.from({length:4},(_,z) => <Box key={`${x}-${z}`} at={[-halfWidth+(x+.5)*width/13,.094,-halfDepth+(z+.5)*depth/4]} size={[width/13-.01,.032,depth/4-.012]} material={floorColor?floorMaterial:x%3 === 0 ? r.materials.woodDark : r.materials.wood} radius={.003}/>))}
    <Box at={[.04,1.61,ROOM_WALL_BACK]} size={[width+.28,3.06,.14]} material={wallMaterial} radius={.015}/>
    <mesh position={[ROOM_WALL_LEFT,.08,0]} rotation={[0,Math.PI/2,0]} geometry={wallGeometry} material={wallColor?wallMaterial:r.materials.plasterGreen} castShadow receiveShadow dispose={null}/>
    <Box at={[0,3.155,ROOM_WALL_BACK]} size={[width+.3,.065,.18]} material={r.materials.ivory} radius={.015}/>
    <Box at={[ROOM_WALL_LEFT+.07,3.155,0]} size={[.19,.065,depth+.16]} material={r.materials.ivory} radius={.015}/>
    <Box at={[0,.2,-halfDepth+.025]} size={[width+.1,.18,.075]} material={r.materials.ivory} radius={.012}/>
    <Box at={[-halfWidth+.015,.2,0]} size={[.075,.18,depth+.06]} material={r.materials.ivory} radius={.012}/>
    <mesh position={[ROOM_WALL_LEFT+.145,.08,0]} rotation={[0,Math.PI/2,0]} geometry={frameGeometry} material={r.materials.wood} castShadow dispose={null}/>
    <mesh position={[ROOM_WALL_LEFT-.02,1.78,ROOM_WINDOW_Z]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[1.65,2.12]}/><primitive object={r.materials.landscape} attach="material"/></mesh>
    <Box at={[ROOM_WALL_LEFT+.34,.79,ROOM_WINDOW_Z]} size={[.43,.085,1.92]} material={r.materials.ivory} radius={.025}/>
    <Box at={[ROOM_WALL_LEFT+.24,1.65,ROOM_WINDOW_Z]} size={[.038,1.8,.04]} material={r.materials.wood} radius={.005}/>
    <Box at={[ROOM_WALL_LEFT+.24,1.67,ROOM_WINDOW_Z]} size={[.038,.04,1.61]} material={r.materials.wood} radius={.005}/>
    <Cylinder at={[ROOM_WALL_LEFT+.4,2.98,ROOM_WINDOW_Z]} radius={.023} height={2.45} surface="brass" r={r} rotation={[Math.PI/2,0,0]}/>
    {[-1,1].map(side => <group key={side}>
      {[0,1,2,3,4].map(i => <Box key={i} at={[ROOM_WALL_LEFT+.43+(i%2)*.055,1.95,ROOM_WINDOW_Z+side*(.87+i*.072)]} size={[.08,1.98-i*.01,.094]} radius={.035} material={r.materials.cream}/>)}
    </group>)}
    <Box at={[2.1,-.2,halfDepth+.4]} size={[1.18,.26,.42]} material={r.materials.stone} radius={.03}/>
    <Box at={[2.1,-.33,halfDepth+.71]} size={[1.32,.13,.38]} material={r.materials.stone} radius={.025}/>
    <mesh position={[-.6,.12,.8]} rotation={[-Math.PI/2,0,0]} scale={[1.65,1.2,1]} receiveShadow>
      <circleGeometry args={[1.25,80]}/><primitive object={r.materials.rug} attach="material"/>
    </mesh>
    {[1.2,1.14,1.08].map(radius => <mesh key={radius} position={[-.6,.125,.8]} rotation={[-Math.PI/2,0,0]} scale={[1.65,1.2,1]}>
      <ringGeometry args={[radius,radius+.012,80]}/><meshStandardMaterial color="#b1bd98" roughness={1}/>
    </mesh>)}
    <Plant at={[largePlant.x,.13,largePlant.z]} scale={.86} r={r}/>
    <Plant at={[smallPlant.x,.13,smallPlant.z]} scale={.68} r={r}/>
    <Box at={[-1.2,2.35,ROOM_WALL_BACK+.18]} size={[2.1,.065,.32]} material={r.materials.wood} radius={.015}/>
    <Plant at={[-1.82,2.39,ROOM_WALL_BACK+.34]} scale={.32} r={r}/>
    {['pink','sage','ivory','woodDark'].map((surface,i) => <Box key={surface} at={[-1.16+i*.1,2.57,ROOM_WALL_BACK+.19]} size={[.072,.35+i%2*.07,.18]} material={r.materials[surface as Surface]} rotation={[0,0,i === 0 ? -.15 : 0]} radius={.006}/>)}
    <Cylinder at={[-.48,2.49,ROOM_WALL_BACK+.21]} radius={.075} height={.18} surface="ceramic" r={r}/>
    <Ball at={[-.48,2.62,ROOM_WALL_BACK+.21]} size={[.055,.055,.055]} surface="leafLight" r={r}/>
    <Box at={[-1.23,1.55,ROOM_WALL_BACK+.11]} size={[.76,.9,.055]} material={r.materials.wood} radius={.018}/>
    <mesh position={[-1.23,1.55,ROOM_WALL_BACK+.145]}><planeGeometry args={[.65,.78]}/><primitive object={r.materials.art} attach="material"/></mesh>
    <Cylinder at={[lamp.x+.13,.16,lamp.z+.12]} radius={.2} height={.055} surface="brass" r={r}/>
    <Cylinder at={[lamp.x+.13,.99,lamp.z+.12]} radius={.023} height={1.66} surface="brass" r={r}/>
    <mesh position={[lamp.x+.13,1.84,lamp.z+.12]} castShadow><cylinderGeometry args={[.19,.33,.37,32,1,true]}/><meshStandardMaterial color="#fff0d5" roughness={.9} side={DoubleSide} emissive="#ffd39e" emissiveIntensity={warm ? .42 : .04}/></mesh>
    <Ball at={[lamp.x+.13,1.74,lamp.z+.12]} size={[.073,.073,.073]} surface="led" r={r} shadow={false}/>
    {warm && <pointLight position={[lamp.x+.13,1.76,lamp.z+.31]} intensity={3.2} color="#ffd6a3" distance={5.5} decay={2}/>}
  </group>;
}

/** Fixed installations occupy the recessed service strip behind the editable floor. */
function RoomArchitecture({roomId,r,wallMaterial,floorMaterial,warm}:{roomId:Exclude<RoomId,'living'>;r:Resources;wallMaterial:Material;floorMaterial?:Material;warm:boolean}) {
  const bedroom=roomId==='bedroom', kitchen=roomId==='kitchen';
  const extra=bedroom?0:.85, back=ROOM_WALL_BACK-extra;
  const {width,depth,halfWidth,halfDepth}=ROOM_BOUNDS;
  const windowWidth=bedroom?3.05:kitchen?2.35:1.2;
  const windowHeight=bedroom?1.62:kitchen?1.15:.68;
  const windowBottom=bedroom?1.04:kitchen?1.52:2.05;
  const windowX=bedroom?.1:kitchen?0:1.45;
  const left=-halfWidth-.14,right=halfWidth+.14;
  const windowLeft=windowX-windowWidth/2,windowRight=windowX+windowWidth/2;
  const box=(at:Point,size:Point,surface:Surface,radius=.012)=> <Box key={`${at.join(',')}:${size.join(',')}`} at={at} size={size} material={at[1]===.09&&floorMaterial&&surface!=='ivory'?floorMaterial:r.materials[surface]} radius={radius}/>;
  return <group name={`architecture-${roomId}`}>
    {box([0,-.13,-extra/2],[width+.28,.42,depth+.3+extra],'stone',.025)}
    <Box at={[ROOM_WALL_LEFT,1.61,-extra/2]} size={[.14,3.06,depth+.3+extra]} material={wallMaterial} radius={.01}/>
    {[
      {at:[0,(windowBottom+.08)/2,back],size:[width+.28,windowBottom-.08,.14]},
      {at:[0,(windowBottom+windowHeight+3.14)/2,back],size:[width+.28,3.14-windowBottom-windowHeight,.14]},
      {at:[(left+windowLeft)/2,windowBottom+windowHeight/2,back],size:[windowLeft-left,windowHeight,.14]},
      {at:[(right+windowRight)/2,windowBottom+windowHeight/2,back],size:[right-windowRight,windowHeight,.14]},
    ].map((panel,i)=><Box key={i} at={panel.at as Point} size={panel.size as Point} material={wallMaterial} radius={.008}/>)}
    <mesh position={[windowX,windowBottom+windowHeight/2,back-.03]}><planeGeometry args={[windowWidth,windowHeight]}/><primitive object={bedroom||kitchen?r.materials.landscape:r.materials.silver} attach="material"/></mesh>
    {[-1,1].map(side=><group key={side}>
      {box([windowX+side*(windowWidth/2+.035),windowBottom+windowHeight/2,back+.095],[.07,windowHeight+.14,.10],bedroom?'wood':'ivory')}
      {box([windowX,windowBottom+(side===1?windowHeight:0),back+.095],[windowWidth+.14,.075,.10],bedroom?'wood':'ivory')}
    </group>)}
    {box([windowX,windowBottom+windowHeight/2,back+.10],[.05,windowHeight,.06],'ivory')}
    {box([0,3.16,back],[width+.28,.065,.18],'ivory')}
    {box([ROOM_WALL_LEFT,3.16,-extra/2],[.18,.065,depth+.3+extra],'ivory')}
    {bedroom ? <>
      {Array.from({length:12},(_,x)=>Array.from({length:4},(_,z)=>box([-halfWidth+(x+.5)*width/12,.09,-halfDepth+(z+.5)*depth/4],[width/12-.015,.045,depth/4-.018],x%2?'wood':'woodDark')))}
      {box([0,.64,back+.08],[width+.08,1.10,.08],'cream')}
      {Array.from({length:17},(_,i)=>box([-halfWidth+.2+i*.375,.65,back+.14],[.025,1.03,.03],'wood'))}
      {box([-halfWidth+.02,.64,0],[.065,1.1,depth+.1],'cream')}
      {box([-.65,.123,.65],[2.3,.025,2.25],'cream',.03)}
      {[-2.2,2.35].map(x=><group key={x}>{box([x,1.83,back+.13],[.17,.32,.09],'brass')}<Ball at={[x,1.86,back+.19]} size={[.13,.13,.1]} surface="ivory" r={r}/>{warm&&<pointLight position={[x,1.86,back+.35]} color="#ffddb8" intensity={.6} distance={3}/>}</group>)}
      {box([ROOM_WALL_LEFT+.105,1.55,1.15],[.035,1.2,.65],'wood')}
      <mesh position={[ROOM_WALL_LEFT+.135,1.55,1.15]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[.56,1.08]}/><primitive object={r.materials.art} attach="material"/></mesh>
    </> : <>
      {Array.from({length:10},(_,x)=>Array.from({length:10},(_,z)=>box([-halfWidth+(x+.5)*width/10,.09,-halfDepth-extra+(z+.5)*(depth+extra)/10],[width/10-.018,.045,(depth+extra)/10-.018],(x+z)%2?'ivory':kitchen?'sage':'green')))}
      {Array.from({length:13},(_,x)=>Array.from({length:4},(_,y)=>box([-halfWidth+(x+.5)*width/13,.42+y*.30,back+.08],[width/13-.012,.288,.022],kitchen?'ivory':(x+y)%2?'ivory':'sage')))}
      {kitchen ? <group name="built-in-kitchen">
        {box([-.25,.57,back+.44],[5.2,.90,.63],'sage',.025)}
        {box([-.25,1.045,back+.44],[5.34,.075,.70],'ivory')}
        {Array.from({length:6},(_,i)=><group key={i}>{box([-2.4+i*.85,.59,back+.77],[.80,.81,.023],i%2?'cream':'sage')}{box([-2.36+i*.85,.84,back+.80],[.16,.022,.02],'brass')}</group>)}
        {box([-.3,1.09,back+.43],[.78,.023,.43],'silver',.06)}
        {box([-.3,1.095,back+.43],[.60,.025,.30],'dark',.055)}
        <Curve points={[[-.3,1.1,back+.2],[-.3,1.38,back+.2],[-.3,1.40,back+.45],[-.3,1.25,back+.45]]} radius={.019} material={r.materials.silver}/>
        {[-2.45,2.05].map(x=><group key={x}>{box([x,2.45,back+.23],[1.0,.86,.37],'cream')}{box([x,2.43,back+.43],[.88,.72,.025],'sage')}</group>)}
        <Cylinder at={[1.35,1.16,back+.43]} radius={.15} height={.15} surface="ceramic" r={r}/>
      </group> : <group name="built-in-bathroom">
        {box([-2.15,.16,back+.46],[1.65,.13,.70],'ivory',.025)}
        <mesh position={[-1.28,1.18,back+.44]}><boxGeometry args={[.025,2.10,.65]}/><meshStandardMaterial color="#c8d7c9" transparent opacity={.26} roughness={.3} depthWrite={false}/></mesh>
        <Curve points={[[-2.15,1.4,back+.13],[-2.15,2.66,back+.13],[-2.15,2.68,back+.45]]} radius={.022} material={r.materials.silver}/>
        <Cylinder at={[-2.15,2.65,back+.45]} radius={.13} height={.035} surface="silver" r={r}/>
        {box([-.1,.58,back+.47],[1.32,.76,.60],'wood',.025)}
        <Ball at={[-.1,1.04,back+.47]} size={[.65,.14,.31]} surface="ceramic" r={r}/>
        <Ball at={[-.1,1.09,back+.47]} size={[.49,.07,.23]} surface="silver" r={r}/>
        <Curve points={[[-.1,1.1,back+.18],[-.1,1.38,back+.18],[-.1,1.38,back+.40]]} radius={.018} material={r.materials.silver}/>
        <mesh position={[-.1,2.06,back+.115]}><circleGeometry args={[.55,40]}/><meshStandardMaterial color="#c1d1cb" roughness={.3} metalness={.4}/></mesh>
        {box([2.18,.47,back+.31],[.58,.72,.27],'ivory',.06)}
        <Ball at={[2.18,.36,back+.58]} size={[.33,.26,.31]} surface="ceramic" r={r}/>
        <Ball at={[2.18,.58,back+.58]} size={[.30,.055,.28]} surface="ivory" r={r}/>
      </group>}
    </>}
    {/* Keep the existing small corner footprints reserved for greenery. */}
    <Plant at={[ROOM_OBSTACLES[0].x,.13,ROOM_OBSTACLES[0].z]} scale={bedroom?.8:.55} r={r}/>
    <Plant at={[ROOM_OBSTACLES[1].x,.13,ROOM_OBSTACLES[1].z]} scale={.5} r={r}/>
    <Plant at={[ROOM_OBSTACLES[2].x,.13,ROOM_OBSTACLES[2].z]} scale={.38} r={r}/>
  </group>;
}

// Wall accents never occupy editable furniture footprints or create purchases.
const DECOR_SLOTS:Point[]=[[ROOM_WALL_LEFT+.13,1.2,.65],[ROOM_WALL_LEFT+.13,1.2,2.55],[ROOM_WALL_LEFT+.13,2.35,.65],[ROOM_WALL_LEFT+.13,2.35,2.55]];
function RoomDecoration({r,items,placing,onPlace}:{r:Resources;items:Record<string,number>;placing?:string;onPlace?:(slot:number)=>void}) {
  return <group name="visual-decoration">
    {Object.entries(items).map(([id,slot])=><group key={id} position={DECOR_SLOTS[slot]} rotation={[0,Math.PI/2,0]}>
      {id!=='art'&&<Box at={[0,0,.06]} size={[.65,.045,.3]} material={r.materials.wood} radius={.008}/>}
      {id==='plant'&&<Plant at={[0,.03,.24]} scale={.4} r={r}/>}
      {id==='books'&&[0,1,2].map(i=><Box key={i} at={[-.13+i*.12,.20+i%2*.04,.06]} size={[.09,.32+i%2*.08,.16]} material={r.materials[(['pink','sage','ivory'] as Surface[])[i]]} radius={.006}/>)}
      {id==='art'&&<><Box at={[0,0,.01]} size={[.64,.68,.045]} material={r.materials.pink} radius={.008}/><mesh position={[0,0,.037]}><planeGeometry args={[.53,.57]}/><primitive object={r.materials.art} attach="material"/></mesh></>}
      {id==='vase'&&<><Cylinder at={[0,.15,.07]} radius={.09} height={.23} surface="ceramic" r={r}/><Ball at={[0,.33,.07]} size={[.1,.1,.1]} surface="pink" r={r}/></>}
    </group>)}
    {placing&&DECOR_SLOTS.map((at,slot)=>{const occupied=Object.entries(items).some(([id,s])=>id!==placing&&s===slot);return <group key={slot} position={at}>
      <mesh rotation={[0,Math.PI/2,0]}><planeGeometry args={[.7,.7]}/><meshBasicMaterial color={occupied?'#ce7392':'#83a16a'} transparent opacity={.25} depthWrite={false}/></mesh>
      <Html center zIndexRange={[20,10]}><button className="decor-slot" disabled={occupied} aria-label={`Colocar decoración en espacio ${slot+1}`} onClick={()=>onPlace?.(slot)}>{occupied?'×':'+'}</button></Html>
    </group>;})}
  </group>;
}

function Furniture({ kind, pending, r }: { kind: ObjectKind; pending: boolean; r: Resources }) {
  const surfaces = pending ? r.preview : r.materials;
  const box = (at: Point, size: Point, surface: Surface, radius = .04, rotation?: Point) => <Box at={at} size={size} material={surfaces[surface]} radius={radius} rotation={rotation}/>;
  const cylinder = (at: Point, radius: number, height: number, surface: Surface, rotation?: Point) => <Cylinder at={at} radius={radius} height={height} surface={surface} pending={pending} r={r} rotation={rotation}/>;
  if (kind === 'sofa') return <group>
    {[-1,1].flatMap(x => [-1,1].map(z => <group key={`${x}-${z}`}>{cylinder([x*.68,.09,z*.28],.045,.18,'woodDark')}</group>))}
    {box([0,.28,0],[1.82,.26,.86],'pink',.09)}{box([0,.65,-.38],[1.78,.77,.24],'pink',.095)}
    {[-1,1].map(side => <group key={side}>
      {box([side*.91,.57,0],[.27,.59,.91],'blush',.1)}{box([side*.43,.465,.06],[.82,.2,.7],'blush',.085)}
      {box([side*.43,.77,-.21],[.8,.51,.23],'pink',.085,[.13,0,0])}
      {box([side*.58,.79,.04],[.38,.4,.14],side === 1 ? 'sage' : 'cream',.08,[.15,side*.18,side*-.14])}
      <Curve points={[[side*.05,.535,.36],[side*.43,.54,.4],[side*.8,.535,.36]]} radius={.005} material={r.materials[pending ? 'ghostEdge' : 'pink']}/>
    </group>)}
    {box([-.53,.48,.17],[.43,.045,.57],'green',.015)}
    {[0,1,2,3].map(i => <group key={i}>{box([-.66+i*.082,.345,.4],[.066,.3,.065],'green',.02,[.15,0,0])}</group>)}
  </group>;
  if (kind === 'table') return <group>
    {[-1,1].map(side => <group key={side}>{cylinder([side*.28,.24,0],.095,.48,'woodDark')}</group>)}
    <mesh position={[0,.5,0]} scale={[.68,.065,.46]} geometry={r.cylinder} material={surfaces.wood} castShadow receiveShadow dispose={null}/>
    {box([-.22,.57,.05],[.3,.045,.22],'sage',.008,[0,.15,0])}{box([-.2,.61,.04],[.26,.025,.19],'cream',.008,[0,.06,0])}
    <Ball at={[.24,.62,-.08]} size={[.09,.1,.09]} surface={pending ? 'ghost' : 'ceramic'} r={r}/>
    {cylinder([.24,.73,-.08],.037,.07,'ceramic')}
    <Curve points={[[.24,.76,-.08],[.2,.9,-.08],[.27,.99,-.08]]} radius={.009} material={r.materials.leaf}/>
    <Ball at={[.29,.98,-.08]} size={[.1,.045,.018]} surface="leafLight" r={r} rotation={[0,0,.6]} shadow={false}/>
    {cylinder([.19,.571,.22],.074,.022,'ivory')}
  </group>;
  if (kind === 'bed') return <group>
    {box([0,.2,0],[1.24,.23,1.74],'wood',.065)}{box([0,.76,-.84],[1.3,1.24,.12],'sage',.09)}
    {box([0,.43,0],[1.23,.24,1.7],'cream',.1)}{box([0,.58,.25],[1.23,.13,1.19],'bed',.08)}
    {[-1,1].map(side => <group key={side}>{box([side*.3,.62,-.55],[.55,.18,.4],'cream',.08,[.07,0,side*.06])}</group>)}
    {box([0,.68,-.2],[1.23,.05,.23],'blush',.025)}{box([0,.57,.69],[1.25,.06,.4],'pink',.025)}
    {[-.45,-.15,.15,.45].map(x => <Curve key={x} points={[[x,.665,-.05],[x,.67,.3],[x,.642,.7],[x,.53,.87]]} radius={.005} material={r.materials[pending ? 'ghostEdge' : 'sage']}/>)}
    {box([-.82,.32,-.54],[.34,.54,.43],'wood',.025)}{box([-.82,.44,-.315],[.27,.015,.009],'woodDark',.002)}
    <Ball at={[-.82,.69,-.54]} size={[.1,.11,.1]} surface={pending ? 'ghost' : 'led'} r={r}/>
  </group>;
  if (kind === 'fridge') return <group>
    {box([0,.98,0],[.72,1.9,.7],'metal',.065)}{box([0,1.53,.365],[.683,.71,.05],'silver',.035)}
    {box([0,.64,.365],[.683,1.03,.05],'silver',.035)}{box([0,1.135,.39],[.64,.017,.01],'dark',.002)}
    {cylinder([-.235,1.44,.417],.018,.28,'brass')}{cylinder([-.235,.96,.417],.018,.26,'brass')}
    {box([.15,1.62,.399],[.15,.16,.012],'pink',.015,[0,0,-.1])}
    <Ball at={[.17,1.69,.408]} size={[.025,.025,.005]} surface="sage" r={r} shadow={false}/>
    <Plant at={[.05,1.96,0]} scale={.32} r={r}/>
  </group>;
  if (kind === 'washer') return <group>
    {box([0,.49,0],[.73,.95,.69],'ivory',.04)}{box([0,.89,.36],[.63,.12,.025],'silver',.008)}
    <mesh position={[0,.43,.362]} rotation={[Math.PI/2,0,0]} geometry={r.cylinder} scale={[.255,.03,.255]} material={surfaces.silver} dispose={null}/>
    <mesh position={[0,.43,.382]} rotation={[Math.PI/2,0,0]} geometry={r.cylinder} scale={[.203,.015,.203]} material={surfaces.glass} dispose={null}/>
    {cylinder([.17,.89,.392],.04,.025,'brass',[Math.PI/2,0,0])}{box([-.12,.89,.379],[.18,.035,.01],'dark',.003)}
    {box([0,1.0,0],[.65,.07,.47],'sage',.025)}{box([0,1.07,0],[.57,.06,.43],'cream',.025)}
  </group>;
  if (kind === 'tv') return <group>
    {box([0,.29,0],[1.13,.49,.4],'wood',.025)}
    {[-1,1].map(side => <group key={side}>{box([side*.28,.29,.21],[.5,.4,.024],'woodDark',.012)}{cylinder([side*.075,.29,.235],.012,.12,'brass')}</group>)}
    {box([0,.62,0],[.4,.03,.2],'dark',.018)}{box([0,.73,0],[.065,.24,.06],'dark',.01)}{box([0,1.11,0],[1.13,.69,.055],'dark',.025)}
    <mesh position={[0,1.11,.03]}><planeGeometry args={[1.055,.61]}/><primitive object={surfaces.landscape} attach="material"/></mesh>
    <Ball at={[.46,.794,.034]} size={[.009,.009,.005]} surface="sage" r={r} shadow={false}/>
  </group>;
  return <group>{box([0,.39,0],[.53,.73,.47],'sage',.07)}{box([0,.77,0],[.56,.055,.5],'wood',.02)}{cylinder([0,.81,0],.12,.035,'ivory')}</group>;
}

const tailPoints: Point[] = [[0,0,0],[.16,-.04,-.08],[.3,.045,-.075],[.31,.19,.015],[.22,.23,.05]];
function Kitten({ r, action, at, onPet, disabled, target, walk, paused, name }: { name?:string; r: Resources; action: CatAction; at:[number,number]; onPet: () => void; disabled:boolean; target?:Placement; walk:[number,number]; paused:boolean }) {
  const kitten = useRef<Group>(null);
  const head = useRef<Group>(null);
  const body = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const toy = useRef<Group>(null);
  const paws = useRef<(Group | null)[]>([]);
  const eyes = useRef<(Group | null)[]>([]);
  const closedEyes = useRef<(Group | null)[]>([]);
  const motion = useRef({kind:action.kind, elapsed:10});
  const look = useRef(0);
  const rest = useRef<CatRest>({sit:0,sleep:0});
  const fromRest = useRef<CatRest>({sit:0,sleep:0});
  const currentRest = useRef<CatRest>({sit:0,sleep:0});
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const invalidate = useThree(state => state.invalidate);
  const pose = (kind:CatAction['kind'], progress:number, delta = 1/60) => {
    if (!kitten.current || !head.current || !tail.current) return;
    const wave = Math.sin(progress*Math.PI);
    const joints = catRestPose(fromRest.current,rest.current,progress);
    currentRest.current = {sit:joints.sit,sleep:joints.sleep};
    const asleep = joints.sleep > .01;
    const breathed = kind === 'idle' || asleep ? Math.sin(progress*Math.PI*2)*.012 : 0;
    kitten.current.position.set(at[0],.12,at[1]); kitten.current.rotation.y = .47;
    kitten.current.scale.setScalar(.84);
    if (body.current) {
      body.current.position.set(0,joints.bodyY,joints.bodyZ);
      body.current.rotation.set(joints.bodyPitch,0,-.1*joints.sleep);
      body.current.scale.set(1+breathed,1+breathed*.7,1+breathed);
    }
    const desired = target ? Math.max(-.58,Math.min(.58,Math.atan2(Math.sin(Math.atan2(target.x-at[0],target.z-at[1])-.47),Math.cos(Math.atan2(target.x-at[0],target.z-at[1])-.47)))) : 0;
    look.current = reduced.current ? desired : look.current+(desired-look.current)*(1-Math.exp(-4*delta));
    head.current.position.set(0,joints.headY,joints.headZ);
    head.current.rotation.set(joints.headPitch+(kind === 'low_balance' ? wave*.12 : 0),look.current*(1-joints.sleep)+(kind === 'idle' ? Math.sin(progress*Math.PI*2)*.12*wave*(1-joints.sleep) : 0),joints.headRoll);
    tail.current.position.set(0,joints.tailY,-.31);
    tail.current.rotation.set(0,joints.tailYaw+Math.sin(progress*Math.PI*2)*.16*wave*(1-joints.sleep),0);
    paws.current.forEach((paw,index) => {
      if (!paw) return;
      const front=index<2;
      paw.position.y=front?joints.frontY:joints.rearY;
      paw.rotation.x=front?joints.frontPitch:joints.rearPitch;
    });
    if (kind === 'hello' || kind === 'celebrate') {
      kitten.current.position.y += wave*.07;
      head.current.rotation.z = Math.sin(progress*Math.PI*4)*.16*(1-progress);
      if (paws.current[1]) paws.current[1].rotation.x = -wave*.9;
      tail.current.rotation.y = Math.sin(progress*Math.PI*4)*.25*wave;
      if (kind === 'celebrate') {
        kitten.current.position.y += Math.abs(Math.sin(progress*Math.PI*4))*.055*wave;
        paws.current.slice(0,2).forEach(paw => { if (paw) paw.rotation.x -= wave*.4; });
      }
    }
    if (kind === 'play') {
      kitten.current.rotation.y += Math.sin(progress*Math.PI*2)*.15*wave;
      kitten.current.position.y += Math.abs(Math.sin(progress*Math.PI*4))*.025*wave;
      head.current.rotation.x = -wave*.14;
      tail.current.rotation.y = Math.sin(progress*Math.PI*8)*.38*wave;
      paws.current.slice(0,2).forEach((paw,i) => { if (paw) paw.rotation.x -= Math.sin(progress*Math.PI*6+i*Math.PI)*.4*wave; });
    }
    if (kind === 'walk') {
      const trip = Math.sin(progress*Math.PI)**2;
      kitten.current.position.x += walk[0]*trip; kitten.current.position.z += walk[1]*trip;
      if (walk.some(Boolean)) {
        const heading=Math.atan2(walk[0],walk[1])-.47;
        const turn=Math.atan2(Math.sin(heading),Math.cos(heading))+Math.PI*easeCat((progress-.42)/.16);
        kitten.current.rotation.y += turn*wave;
      }
      kitten.current.position.y += Math.abs(Math.sin(progress*Math.PI*8))*.018*wave;
      paws.current.forEach((paw,i) => { if (paw) paw.rotation.x += Math.sin(progress*Math.PI*8+(i===0||i===3?0:Math.PI))*.32*wave; });
      head.current.rotation.x = -wave*.035;
    }
    if (kind === 'look') tail.current.rotation.y = Math.sin(progress*Math.PI*2)*.08*wave;
    if (toy.current) {
      toy.current.position.set(at[0]+.27+Math.sin(progress*Math.PI*6)*.12*wave,.2,at[1]+.19+Math.sin(progress*Math.PI*4)*.1*wave);
      toy.current.rotation.z = progress*Math.PI*8;
    }
    const blink = catBlink(progress)*(1-joints.sleep);
    eyes.current.forEach(eye => { if (eye) { eye.scale.y = Math.max(.001,blink); eye.visible=blink>.015; } });
    closedEyes.current.forEach(eye => { if (eye) {eye.visible=blink<.35;eye.scale.y=1-blink;} });
  };
  const paint = useRef(pose);
  paint.current = pose;
  const settle = () => {
    const kind = motion.current.kind;
    paint.current(kind,1);
    if (kind !== 'sleep' && kind !== 'sit') motion.current.kind = 'idle';
    motion.current.elapsed = CAT_DURATION[motion.current.kind];
  };
  useEffect(() => {
    fromRest.current = {...currentRest.current};
    rest.current = {sit:action.kind==='sit'?1:0,sleep:action.kind==='sleep'?1:0};
    motion.current = {kind:action.kind,elapsed:reduced.current || paused || disabled ? CAT_DURATION[action.kind] : 0};
    paint.current(action.kind,reduced.current || paused || disabled ? 1 : 0); invalidate();
  }, [action.kind,action.serial,invalidate]);
  useEffect(() => { paint.current(motion.current.kind,Math.min(1,motion.current.elapsed/CAT_DURATION[motion.current.kind])); invalidate(); }, [at[0],at[1],invalidate]);
  useEffect(() => {
    if (!target || rest.current.sleep || paused || disabled) return;
    if (reduced.current) { paint.current(motion.current.kind,1); invalidate(); return; }
    if (motion.current.elapsed < CAT_DURATION[motion.current.kind]) return;
    fromRest.current = {...currentRest.current}; motion.current = {kind:'look',elapsed:0}; invalidate();
  },[target?.x,target?.z,paused,disabled,invalidate]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => {
      reduced.current = media.matches;
      if (media.matches || document.hidden || paused || disabled) {
        motion.current.elapsed = CAT_DURATION[motion.current.kind]; settle(); invalidate();
      }
    };
    const timer = window.setInterval(() => {
      if (reduced.current || document.hidden || paused || disabled || motion.current.elapsed < CAT_DURATION[motion.current.kind]) return;
      fromRest.current = {...currentRest.current}; motion.current = {kind:'idle',elapsed:0}; invalidate();
    },20000);
    media.addEventListener('change',stop); document.addEventListener('visibilitychange',stop); stop();
    return () => { window.clearInterval(timer); media.removeEventListener('change',stop); document.removeEventListener('visibilitychange',stop); };
  },[action.kind,paused,disabled,invalidate]);
  useFrame((_,delta) => {
    if (reduced.current || document.hidden || paused || disabled) return;
    const current = motion.current, duration = CAT_DURATION[current.kind];
    if (current.elapsed >= duration) return;
    current.elapsed = Math.min(duration,current.elapsed+Math.min(delta,.05));
    paint.current(current.kind,current.elapsed/duration,delta);
    if (current.elapsed < duration) invalidate(); else settle();
  });
  return <>
    {action.kind === 'play' && <group ref={toy} position={[at[0]+.27,.2,at[1]+.19]}><Ball at={[0,0,0]} size={[.085,.085,.085]} surface="pink" r={r}/><mesh rotation={[.7,.2,0]}><torusGeometry args={[.085,.005,6,24]}/><primitive object={r.materials.cream} attach="material"/></mesh></group>}
    <group name="home-companion" ref={kitten} position={[at[0],.12,at[1]]} rotation={[0,.47,0]} scale={.84} onClick={event => { if (disabled) return; event.stopPropagation(); onPet(); }}>
    {name&&<Html position={[0,1.12,0]} center style={{pointerEvents:'none'}} zIndexRange={[5,0]}><span className="cat-floating-name">{name}</span></Html>}
    <group ref={tail} position={[0,.27,-.31]}><Curve points={tailPoints} radius={.052} material={r.materials.fur}/></group>
    <group ref={body} position={[0,.29,-.065]}><Ball at={[0,0,0]} size={[.22,.23,.30]} surface="fur" r={r}/><Ball at={[0,-.025,.19]} size={[.155,.19,.115]} surface="furLight" r={r}/><Ball at={[-.08,.17,-.045]} size={[.12,.035,.18]} surface="furLight" r={r}/></group>
    {[-1,1].map(side => <group key={side}>
      <group ref={value => { paws.current[side === -1 ? 2 : 3] = value; }} position={[side*.165,.25,-.22]}><Ball at={[0,-.045,0]} size={[.09,.13,.12]} surface="fur" r={r}/><Ball at={[0,-.19,.035]} size={[.085,.052,.115]} surface="furLight" r={r}/></group>
      <group ref={value => { paws.current[side === -1 ? 0 : 1] = value; }} position={[side*.105,.23,.16]}>
        <Ball at={[0,-.09,0]} size={[.066,.14,.082]} surface="furLight" r={r}/><Ball at={[side*.015,-.181,.03]} size={[.08,.045,.115]} surface="furLight" r={r}/>
      </group>
    </group>)}
    <group ref={head} position={[0,.54,.17]}>
      <Ball at={[0,0,0]} size={[.26,.235,.23]} surface="furLight" r={r}/>
      {[-1,1].map(side => <group key={side}>
        <mesh position={[side*.168,.18,-.025]} rotation={[.13,0,side*-.25]} castShadow><coneGeometry args={[.12,.24,3,1]}/><primitive object={r.materials.fur} attach="material"/></mesh>
        <mesh position={[side*.168,.19,.03]} rotation={[.13,0,side*-.25]}><coneGeometry args={[.068,.145,3,1]}/><primitive object={r.materials.innerEar} attach="material"/></mesh>
        <group ref={value => { eyes.current[side === -1 ? 0 : 1] = value; }} position={[side*.116,.025,.211]}>
          <Ball at={[0,0,0]} size={[.059,.066,.025]} surface="eye" r={r}/><Ball at={[0,.002,.022]} size={[.025,.045,.01]} surface="pupil" r={r}/>
          <Ball at={[-.012,.023,.032]} size={[.012,.012,.006]} surface="white" r={r} shadow={false}/>
        </group>
        <group ref={value => { closedEyes.current[side === -1 ? 0 : 1] = value; }} position={[side*.116,.025,.24]} visible={false}><Curve points={[[-.047,.005,0],[0,-.018,.005],[.047,.005,0]]} radius={.004} material={r.materials.eye}/></group>
        <Ball at={[side*.059,-.081,.217]} size={[.077,.049,.039]} surface="furLight" r={r}/><Ball at={[side*.2,-.057,.157]} size={[.044,.025,.018]} surface="innerEar" r={r}/>
        {[0,1].map(i => <Curve key={i} points={[[side*.074,-.071-i*.035,.249],[side*.2,-.062-i*.05,.254],[side*.31,-.035-i*.07,.236]]} radius={.0025} material={r.materials.woodDark}/>)}
      </group>)}
      <Ball at={[0,-.054,.257]} size={[.027,.019,.018]} surface="innerEar" r={r}/>
      <Curve points={[[0,-.071,.254],[0,-.09,.255],[.023,-.103,.248]]} radius={.003} material={r.materials.woodDark}/>
      <Ball at={[-.075,.16,.13]} size={[.064,.066,.025]} surface="fur" r={r}/>
      <group position={[0,-.17,-.025]}><mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[.145,.014,8,32]}/><primitive object={r.materials.green} attach="material"/></mesh><Ball at={[0,-.022,.145]} size={[.022,.027,.012]} surface="brass" r={r}/></group>
    </group>
  </group></>;
}

type LayoutController = ReturnType<typeof useRoomLayout>;
type CaptureTarget = { setPointerCapture:(id:number) => void; releasePointerCapture:(id:number) => void };
type Drag = { id:string; pointerId:number; offset:Vector3; rotation:number; target:CaptureTarget };
const ground = new Plane(new Vector3(0,1,0),-.12);

function ProductObject({ product, kind, placement, selected, onSelect, r, editing, onStart, onMove, onEnd }: { product:Product; kind:ObjectKind; placement:Placement; selected:boolean; onSelect:(id:string) => void; r:Resources; editing:boolean; onStart:(id:string,event:ThreeEvent<PointerEvent>) => void; onMove:(event:ThreeEvent<PointerEvent>) => void; onEnd:(event:ThreeEvent<PointerEvent>) => void }) {
  const [hovered,setHovered] = useState(false);
  return <group position={[placement.x,.12,placement.z]} rotation={[0,placement.rotation,0]} onClick={event => { event.stopPropagation(); if (event.delta < 5) onSelect(product.id); }} onPointerDown={event => { if (editing) onStart(product.id,event); }} onPointerMove={onMove} onPointerUp={onEnd} onPointerOver={event => { event.stopPropagation(); setHovered(true); }} onPointerOut={() => setHovered(false)}>
    <Furniture kind={kind} pending={!product.bought} r={r}/>
    {(selected || hovered) && <mesh position={[0,.015,0]} rotation={[-Math.PI/2,0,0]} scale={kind === 'bed' ? [1,1.4,1] : [1,1,1]}>
      <ringGeometry args={[kind === 'sofa' ? .96 : .66,kind === 'sofa' ? .977 : .677,64]}/><meshBasicMaterial color={selected ? '#5b8162' : '#91aa78'} transparent opacity={.85} depthWrite={false}/>
    </mesh>}
    {!product.bought && <group position={[0,kind === 'fridge' ? 2.12 : kind === 'tv' ? 1.67 : 1.43,0]}>
      <Cylinder at={[0,0,0]} radius={.095} height={.015} surface="sage" r={r} rotation={[Math.PI/2,0,0]} shadow={false}/>
      <Box at={[0,0,.016]} size={[.085,.014,.008]} material={r.materials.ivory} radius={.002} shadow={false}/>
      <Box at={[0,0,.016]} size={[.014,.085,.008]} material={r.materials.ivory} radius={.002} shadow={false}/>
    </group>}
  </group>;
}

type ZoomRequest = { serial:number; factor:number };
function roomBaseZoom(width:number,height:number) {
  const azimuth = Math.atan2(ROOM_CAMERA_POSITION[0],ROOM_CAMERA_POSITION[2]);
  const elevation = Math.atan2(ROOM_CAMERA_POSITION[1]-ROOM_CAMERA_TARGET[1],Math.hypot(ROOM_CAMERA_POSITION[0],ROOM_CAMERA_POSITION[2]));
  const roomWidth = ROOM_BOUNDS.width + .28;
  const roomDepth = ROOM_BOUNDS.depth + .3;
  const projectedWidth = roomWidth*Math.cos(azimuth)+roomDepth*Math.sin(azimuth);
  const projectedHeight = (roomWidth*Math.sin(azimuth)+roomDepth*Math.cos(azimuth))*Math.sin(elevation)+3.64*Math.cos(elevation);
  const padding = width < 480 ? 1.06 : 1.1;
  return Math.min(width/(projectedWidth*padding),height/(projectedHeight*padding));
}
function FloorGrid() {
  const geometry = useMemo(() => {
    const points:Vector3[] = [];
    for (let x=-Math.round(ROOM_BOUNDS.halfWidth*10);x<=ROOM_BOUNDS.halfWidth*10;x+=2) {
      points.push(new Vector3(x/10,0,-ROOM_BOUNDS.halfDepth),new Vector3(x/10,0,ROOM_BOUNDS.halfDepth));
    }
    for (let z=-Math.round(ROOM_BOUNDS.halfDepth*10);z<=ROOM_BOUNDS.halfDepth*10;z+=2) {
      points.push(new Vector3(-ROOM_BOUNDS.halfWidth,0,z/10),new Vector3(ROOM_BOUNDS.halfWidth,0,z/10));
    }
    return new BufferGeometry().setFromPoints(points);
  },[]);
  useEffect(() => () => geometry.dispose(),[geometry]);
  return <lineSegments geometry={geometry} position={[0,.118,0]}>
    <lineBasicMaterial color="#8b9e74" transparent opacity={.18} depthWrite={false}/>
  </lineSegments>;
}
function CameraFit({ reset,zoom }: { reset:number; zoom:ZoomRequest }) {
  const { camera,size,invalidate } = useThree();
  useEffect(() => {
    const orthographic = camera as OrthographicCamera;
    orthographic.zoom = roomBaseZoom(size.width,size.height);
    orthographic.position.set(...ROOM_CAMERA_POSITION); orthographic.lookAt(...ROOM_CAMERA_TARGET);
    orthographic.updateProjectionMatrix(); invalidate();
  }, [camera,size.width,size.height,reset,invalidate]);
  useEffect(() => {
    const orthographic = camera as OrthographicCamera;
    const baseZoom = roomBaseZoom(size.width,size.height);
    orthographic.zoom = Math.max(baseZoom*.8,Math.min(baseZoom*2.3,orthographic.zoom*zoom.factor));
    orthographic.updateProjectionMatrix(); invalidate();
  }, [zoom.serial,camera,invalidate]);
  return null;
}
interface SceneProps { products:Product[]; selectedId?:string; onSelect:(id:string) => void; greeting:number; onPet:() => void; storageKey?:string; balance?:number; goalReached?:boolean; goalIds?:string[]; paused?:boolean; layoutSource?:LayoutSource; wallColor?:string; floorColor?:string; decorations?:Record<string,number>; placingDecor?:string; onPlaceDecor?:(slot:number)=>void; catName?:string; roomId?:RoomId }
function catSpace(items:RoomItem[],layout:RoomLayout):[number,number] {
  const candidates:[number,number][] = [[-.05,1.23],[.1,ROOM_BOUNDS.halfDepth-.65],[-1.03,ROOM_BOUNDS.halfDepth-.65],[.2,.5],[ROOM_BOUNDS.halfWidth-.75,ROOM_BOUNDS.halfDepth-.65],[-1.55,.3]];
  const free = (x:number,z:number) => Math.abs(x)+.52 <= ROOM_BOUNDS.halfWidth && Math.abs(z)+.45 <= ROOM_BOUNDS.halfDepth && ROOM_OBSTACLES.every(obstacle => Math.abs(x-obstacle.x) > obstacle.width/2+.52 || Math.abs(z-obstacle.z) > obstacle.depth/2+.45) && items.every(item => {
    const placement = layout[item.id];
    if (!placement) return true;
    const [width,depth] = ROOM_FOOTPRINTS[item.kind];
    const turned = Math.round(placement.rotation/(Math.PI/2))%2;
    return Math.abs(x-placement.x) > (turned ? depth : width)/2+.52 || Math.abs(z-placement.z) > (turned ? width : depth)/2+.45;
  });
  for (const candidate of candidates) if (free(...candidate)) return candidate;
  for (let z=Math.floor((ROOM_BOUNDS.halfDepth-.45)*10);z>=Math.ceil((-ROOM_BOUNDS.halfDepth+.45)*10);z-=3) {
    for (let x=Math.ceil((-ROOM_BOUNDS.halfWidth+.52)*10);x<=Math.floor((ROOM_BOUNDS.halfWidth-.52)*10);x+=3) if (free(x/10,z/10)) return [x/10,z/10];
  }
  return [-.05,ROOM_BOUNDS.halfDepth-.55];
}
function Scene({ products,selectedId,onSelect,onPet,warm,rotating,editing,reset,zoom,controller,items,catAction,paused,wallColor,floorColor,decorations={},placingDecor,onPlaceDecor,catName,roomId }: SceneProps & { warm:boolean; rotating:boolean; editing:boolean; reset:number; zoom:ZoomRequest; controller:LayoutController; items:RoomItem[]; catAction:CatAction }) {
  const r = useRoomResources();
  const {size,gl} = useThree();
  const baseZoom = roomBaseZoom(size.width,size.height);
  const drag = useRef<Drag | null>(null);
  const [marker,setMarker] = useState<{id:string;placement:Placement;ok:boolean} | null>(null);
  const scratch = useMemo(() => new Vector3(),[]);
  const anchorRef = useRef<[number,number]>(catSpace(items,controller.layout));
  const anchor = useMemo(() => {
    if (!controller.dragging) anchorRef.current = catSpace(items,controller.layout);
    return anchorRef.current;
  },[items,controller.layout,controller.dragging]);
  const walk = useMemo(() => catWalkVector(anchor,items,controller.layout),[anchor,items,controller.layout]);
  const release = () => {
    const active = drag.current; drag.current = null; setMarker(null);
    if (active) { try { active.target.releasePointerCapture(active.pointerId); } catch { /* Capture can already be lost after cancellation. */ } }
  };
  useEffect(() => {
    const cancel = () => { if (drag.current) { release(); controller.cancelDrag(); } };
    const escape = (event:KeyboardEvent) => { if (event.key === 'Escape') cancel(); };
    gl.domElement.addEventListener('pointercancel',cancel);
    gl.domElement.addEventListener('lostpointercapture',cancel);
    window.addEventListener('blur',cancel); window.addEventListener('keydown',escape);
    return () => { cancel(); gl.domElement.removeEventListener('pointercancel',cancel); gl.domElement.removeEventListener('lostpointercapture',cancel); window.removeEventListener('blur',cancel); window.removeEventListener('keydown',escape); };
  }, [gl,controller.cancelDrag]);
  useEffect(() => { if (!editing) { release(); controller.cancelDrag(); } },[editing]);
  const start = (id:string,event:ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (drag.current || !event.isPrimary || event.button !== 0) return;
    const placement = controller.layout[id];
    if (!placement || !event.ray.intersectPlane(ground,scratch)) return;
    const target = event.target as unknown as CaptureTarget;
    onSelect(id); controller.beginDrag();
    drag.current = { id,pointerId:event.pointerId,offset:scratch.clone().sub(new Vector3(placement.x,.12,placement.z)),rotation:placement.rotation,target };
    target.setPointerCapture(event.pointerId);
  };
  const move = (event:ThreeEvent<PointerEvent>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.stopPropagation();
    if (!event.ray.intersectPlane(ground,scratch)) return;
    const placement = { x:scratch.x-active.offset.x,z:scratch.z-active.offset.z,rotation:active.rotation };
    const ok = controller.preview(active.id,placement);
    setMarker({id:active.id,placement,ok});
  };
  const finish = (event:ThreeEvent<PointerEvent>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    event.stopPropagation(); controller.commitDrag(); release();
  };
  return <>
    <CameraFit reset={reset} zoom={zoom}/>
    <ambientLight intensity={.45}/><hemisphereLight args={['#fff0db','#879b83',.65]}/>
    <directionalLight position={[-4.1,6,3.9]} intensity={warm ? 1.9 : 1.7} color={warm ? '#ffdfba' : '#fff5e3'} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-camera-near={.5} shadow-camera-far={20} shadow-normalBias={.025} shadow-bias={-.00015} shadow-radius={5}/>
    <directionalLight position={[4,3,1]} intensity={.85} color="#dfead2"/>
    <Environment resolution={128} frames={1}>
      <Lightformer position={[-3,5,3]} scale={[6,4,1]} intensity={2.2} color="#ffecd5" target={[0,0,0]}/>
      <Lightformer position={[4,3,0]} scale={[3,5,1]} intensity={1.5} color="#dbe8d3" target={[0,0,0]}/>
      <Lightformer position={[0,6,-2]} rotation={[Math.PI/2,0,0]} scale={[5,5,1]} intensity={.7} color="#ffffff"/>
    </Environment>
    <Architecture r={r} warm={warm} wallColor={wallColor} floorColor={floorColor} roomId={roomId}/><RoomDecoration r={r} items={decorations} placing={placingDecor} onPlace={onPlaceDecor}/><Kitten r={r} action={catAction} at={anchor} disabled={editing || controller.dragging} onPet={onPet} target={selectedId ? controller.layout[selectedId] : undefined} walk={walk} paused={Boolean(paused)} name={catName}/>
    {editing && <FloorGrid/>}
    <mesh position={[0,.116,0]} rotation={[-Math.PI/2,0,0]} onClick={event => {
      event.stopPropagation();
      if (!editing || drag.current || event.delta > 4 || !selectedId) return;
      controller.place(selectedId,{x:event.point.x,z:event.point.z,rotation:controller.layout[selectedId]?.rotation ?? 0});
    }}><planeGeometry args={[ROOM_BOUNDS.width,ROOM_BOUNDS.depth]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    {products.map(product => {
      const placement = controller.layout[product.id];
      return placement ? <ProductObject key={product.id} product={product} kind={objectKind(product.name)} placement={placement} selected={selectedId === product.id} onSelect={id => { if (!drag.current) onSelect(id); }} r={r} editing={editing} onStart={start} onMove={move} onEnd={finish}/> : null;
    })}
    {marker && <mesh position={[marker.placement.x,.132,marker.placement.z]} rotation={[-Math.PI/2,0,-marker.placement.rotation]}><planeGeometry args={ROOM_FOOTPRINTS[items.find(item => item.id === marker.id)?.kind ?? 'other']}/><meshBasicMaterial color={marker.ok ? '#83a16a' : '#ce7392'} transparent opacity={.22} depthWrite={false}/></mesh>}
    <ContactShadows position={[0,-.405,0]} opacity={.35} scale={ROOM_BOUNDS.width+5} blur={2.8} far={5} resolution={256} frames={2} color="#63735d"/>
    {rotating && <OrbitControls key={reset} makeDefault target={ROOM_CAMERA_TARGET} enablePan enableZoom minZoom={baseZoom*.8} maxZoom={baseZoom*2.3} enableDamping dampingFactor={.12} minPolarAngle={.7} maxPolarAngle={1.23} minAzimuthAngle={.12} maxAzimuthAngle={1.32}/>}
  </>;
}
function Fallback() { return <div className="room-fallback"><span>⌂</span><strong>Tu hogar sigue aquí</strong><p>La vista 3D no está disponible en este dispositivo. Puedes usar la lista para gestionar tus objetos.</p></div>; }
class RoomBoundary extends Component<{ children: ReactNode },{ failed: boolean }> {
  state = { failed:false };
  static getDerivedStateFromError() { return { failed:true }; }
  render() { return this.state.failed ? <Fallback/> : this.props.children; }
}
export default function RoomScene(props: SceneProps) {
  const [warm,setWarm] = useState(true);
  const [rotating,setRotating] = useState(false);
  const [editing,setEditing] = useState(false);
  const [reset,setReset] = useState(0);
  const [zoom,setZoom] = useState<ZoomRequest>({serial:0,factor:1});
  const [catAction,setCatAction] = useState<CatAction>({kind:'idle',serial:0});
  const [catMessage,setCatMessage] = useState('Tu compañero de hogar.');
  const [catMenu,setCatMenu] = useState(false);
  const catMenuId = useId();
  const catTrigger = useRef<HTMLButtonElement>(null);
  const [viewerMessage,setViewerMessage] = useState('');
  const financialProgress = useRef<CatProgress | null>(null);
  const viewer = useRef<HTMLDivElement>(null);
  const items = useMemo(() => props.products.map(product => ({id:product.id,kind:objectKind(product.name)})),[props.products]);
  const controller = useRoomLayout(items,props.storageKey ?? 'mi-independencia:room-layout:v1:preview',props.layoutSource);
  useEffect(() => { setEditing(false); setRotating(false); setCatMenu(false); }, [props.storageKey]);
  const selected = props.selectedId === undefined ? props.products[0] : props.products.find(product => product.id === props.selectedId);
  const unplaced = items.filter(item => !controller.layout[item.id]).length;
  useEffect(() => {
    if (props.paused) { controller.cancelDrag(); setEditing(false); setRotating(false); setCatMenu(false); }
  },[props.paused,controller.cancelDrag]);
  useEffect(() => {
    if (props.paused) return;
    const progress: CatProgress = {boughtIds:props.products.filter(p => p.bought).map(p => p.id),goalIds:props.goalIds,balance:props.balance,goalReached:Boolean(props.goalReached) || (props.products.length > 0 && props.products.every(p => p.bought)),shortfall:Boolean(selected && !selected.bought && typeof props.balance === 'number' && props.balance < selected.estimated_price*selected.quantity)};
    const reaction = catFinancialReaction(financialProgress.current,progress);
    financialProgress.current = progress;
    if (!reaction) return;
    setViewerMessage(''); setCatAction(value => ({kind:reaction,serial:value.serial+1}));
    setCatMessage(reaction === 'celebrate' ? 'Un avance para tu hogar. Tu compañero lo celebra contigo.' : 'Vamos con calma. Revisa el saldo antes de la siguiente compra.');
  },[props.products,props.balance,props.goalReached,props.paused,selected?.id,JSON.stringify(props.goalIds)]);
  useEffect(() => {
    if (!props.greeting) return;
    setViewerMessage(''); setCatAction(value => ({kind:'hello',serial:value.serial+1})); setCatMessage('Levanta su patita para saludarte.');
  },[props.greeting]);
  const closeCatMenu = () => { setCatMenu(false); catTrigger.current?.focus({preventScroll:true}); };
  const act = (kind:CatAction['kind']) => {
    closeCatMenu();
    setViewerMessage('');
    setCatAction(value => ({kind,serial:value.serial+1}));
    setCatMessage(kind === 'play' ? 'Juega con su pelota y mueve la cola.' : kind === 'walk' ? 'Da unos pasitos por un espacio libre y vuelve a su sitio.' : kind === 'sit' ? 'Se sienta a acompañarte.' : kind === 'sleep' ? 'Hora de descansar. Puedes despertarlo cuando quieras.' : 'Listo para acompañarte.');
  };
  const resetView = () => { setReset(value => value+1); setRotating(false); setViewerMessage('Vista inicial restaurada.'); };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement === viewer.current) await document.exitFullscreen();
      else await viewer.current?.requestFullscreen();
    } catch { setViewerMessage('Este navegador no permite ampliar la vista. Puedes usar el zoom.'); }
  };
  return <div ref={viewer} data-cat-action={catAction.kind} className={`room-viewer${rotating ? ' is-rotating' : ''}${editing ? ' is-editing' : ''}`} tabIndex={0} aria-label="Cuarto interactivo" onKeyDown={event => {
    if (event.key === 'Escape' && catMenu) { event.preventDefault(); closeCatMenu(); return; }
    if (!editing) return;
    if (event.key === 'Escape') { controller.cancelDrag(); setEditing(false); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? controller.redo() : controller.undo(); return; }
    if (!selected || (event.target instanceof Element && event.target.closest('button,input,select'))) return;
    const steps:Record<string,[number,number]> = {ArrowLeft:[-.1,0],ArrowRight:[.1,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]};
    if (steps[event.key]) { event.preventDefault(); controller.step(selected.id,...steps[event.key]); }
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); controller.rotate(selected.id); }
  }}>
    <div className="room-canvas">
    <RoomBoundary>
      <Canvas orthographic shadows frameloop="demand" dpr={[1,1.5]} camera={{ position:[7.5,6.3,9],zoom:65,near:.1,far:100 }} fallback={<Fallback/>} gl={{ antialias:true,alpha:true }} aria-label="Habitación 3D interactiva: toca un objeto o el gatito.">
        <Scene {...props} selectedId={selected?.id} onSelect={id=>{props.onSelect(id);setEditing(true);setRotating(false);setCatMenu(false);}} warm={warm} rotating={rotating} editing={editing} reset={reset} zoom={zoom} controller={controller} items={items} catAction={catAction}/>
      </Canvas>
    </RoomBoundary>
    </div>
    <div className="room-secondary-controls" aria-label="Vista e iluminación">
      <Button variant="ghost" size="sm" type="button" aria-pressed={warm} onClick={() => setWarm(value => !value)} title="Cambiar la iluminación" aria-label={warm ? 'Cambiar a luz natural' : 'Cambiar a luz cálida'}>{warm ? <LampDesk size={16}/> : <Sun size={16}/>}</Button>
      <Button variant="ghost" size="sm" type="button" aria-label="Volver a la vista inicial" onClick={resetView} title="Vista inicial"><RotateCcw size={16}/></Button>
      <Button variant="ghost" size="sm" type="button" aria-label="Ampliar cuarto a pantalla completa" onClick={() => void fullscreen()} title="Pantalla completa"><Expand size={16}/></Button>
    </div>
    {!editing && <div className="room-cat-controls" aria-label="Acciones del gato" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setCatMenu(false); }}>
      <button ref={catTrigger} type="button" aria-expanded={catMenu} aria-controls={catMenu ? catMenuId : undefined} onClick={() => setCatMenu(value => !value)}><Heart size={14}/>{props.catName || 'Gato'}</button>
      {catMenu && <div id={catMenuId} className="room-cat-popover" role="group" aria-label="Jugar con tu gato">
        <Button variant="ghost" size="sm" type="button" onClick={() => { closeCatMenu(); props.onPet(); }}><Heart size={13}/>Saludar</Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => act('play')}><Play size={13}/>Jugar</Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => act('walk')}><Move size={13}/>Caminar</Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => act('sit')}>Sentarse</Button>
        <Button variant="ghost" size="sm" type="button" aria-pressed={catAction.kind === 'sleep'} onClick={() => act(catAction.kind === 'sleep' ? 'idle' : 'sleep')}><Moon size={13}/>{catAction.kind === 'sleep' ? 'Despertar' : 'Dormir'}</Button>
      </div>}
    </div>}
    {editing && <div className="room-editor-panel" aria-label="Acomodar muebles">
      <label>Objeto<select aria-label="Mueble que quieres acomodar" value={selected?.id ?? ''} onChange={event => props.onSelect(event.target.value)}>{!selected && <option value="">{props.products.length?'Elige un objeto':'Añade tu primer objeto'}</option>}{props.products.map(product => <option key={product.id} value={product.id}>{product.name}{controller.layout[product.id] ? '' : ' · sin colocar'}</option>)}</select></label>
      <p>{selected ? `Acomodando: ${selected.name}. Arrástralo o toca el suelo libre.` : 'Elige un mueble en la lista para colocarlo.'}</p>
      {selected && <div className="room-edit-actions">
        <details className="room-precise-tools"><summary>Ajuste fino</summary><div className="room-nudge" aria-label="Mover mueble por pasos">
          <Button variant="ghost" size="sm" type="button" disabled={!selected} aria-label="Mover mueble a la izquierda" onClick={() => selected && controller.step(selected.id,-.1,0)}><ArrowLeft size={15}/></Button>
          <Button variant="ghost" size="sm" type="button" disabled={!selected} aria-label="Mover mueble al fondo" onClick={() => selected && controller.step(selected.id,0,-.1)}><ArrowUp size={15}/></Button>
          <Button variant="ghost" size="sm" type="button" disabled={!selected} aria-label="Mover mueble al frente" onClick={() => selected && controller.step(selected.id,0,.1)}><ArrowDown size={15}/></Button>
          <Button variant="ghost" size="sm" type="button" disabled={!selected} aria-label="Mover mueble a la derecha" onClick={() => selected && controller.step(selected.id,.1,0)}><ArrowRight size={15}/></Button>
        </div></details>
        <Button variant="ghost" size="sm" type="button" disabled={!selected} onClick={() => selected && controller.rotate(selected.id)}><RotateCw size={14}/>Girar 90°</Button>
        {props.layoutSource && <Button variant="ghost" size="sm" type="button" disabled={!selected || !controller.layout[selected.id]} onClick={() => selected && controller.remove(selected.id)}>Al inventario</Button>}
        <Button variant="ghost" size="sm" type="button" disabled={!controller.canUndo} onClick={controller.undo} aria-label="Deshacer movimiento"><Undo2 size={15}/></Button>
        <Button variant="ghost" size="sm" type="button" disabled={!controller.canRedo} onClick={controller.redo} aria-label="Rehacer movimiento"><Redo2 size={15}/></Button>
        <details className="room-reset-tools"><summary>Más</summary><Button variant="ghost" size="sm" type="button" onClick={controller.reset} title="Recuperar la distribución inicial; puedes deshacerlo"><RotateCcw size={14}/>Distribución inicial</Button></details>
      </div>}
      <p className="room-layout-status" role="status">{controller.status}{unplaced ? ` ${unplaced} objeto${unplaced === 1 ? '' : 's'} fuera de este cuarto.` : ''}</p>
    </div>}
    <div className="room-view-controls" aria-label="Controles de la habitación">
      <Button variant="ghost" size="sm" type="button" aria-pressed={editing} onClick={() => { controller.cancelDrag(); setEditing(value => !value); setRotating(false); setCatMenu(false); viewer.current?.focus({preventScroll:true}); }} title="Mover y girar tus muebles">{editing ? <Check size={16}/> : <Move size={16}/>}<span>{editing ? 'Listo' : 'Acomodar'}</span></Button>
      <Button variant="ghost" size="sm" type="button" aria-pressed={rotating} onClick={() => { controller.cancelDrag(); setRotating(value => !value); setEditing(false); }} title="Arrastra para girar; usa dos dedos para acercar"><Rotate3D size={16}/><span>{rotating ? 'Terminar' : 'Explorar'}</span></Button>
      <Button variant="ghost" size="sm" type="button" aria-label="Alejar cuarto" onClick={() => setZoom(value => ({serial:value.serial+1,factor:.8}))}><ZoomOut size={17}/></Button>
      <Button variant="ghost" size="sm" type="button" aria-label="Acercar cuarto" onClick={() => setZoom(value => ({serial:value.serial+1,factor:1.25}))}><ZoomIn size={17}/></Button>
    </div>
    {rotating && <span className="room-rotate-hint">Arrastra para girar · rueda o dos dedos para zoom</span>}
    <span className="room-assistive-status" role="status">{viewerMessage || catMessage}</span>
  </div>;
}

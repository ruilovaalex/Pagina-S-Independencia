import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

type Paint = (context: CanvasRenderingContext2D, size: number) => void;

export interface RoomTextures {
  wood: CanvasTexture;
  fabric: CanvasTexture;
  plaster: CanvasTexture;
  terrazzo: CanvasTexture;
  landscape: CanvasTexture;
  art: CanvasTexture;
  dispose: () => void;
}

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function canvas(size: number, paint: Paint) {
  const surface = document.createElement('canvas');
  surface.width = size;
  surface.height = size;
  const context = surface.getContext('2d');
  if (!context) throw new Error('No se pudo crear el lienzo 2D para los materiales de la habitación.');
  paint(context, size);
  return surface;
}

function wood(context: CanvasRenderingContext2D, size: number) {
  const rng = random(1821);
  context.fillStyle = '#dfc7a5';
  context.fillRect(0, 0, size, size);
  const image = context.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = Math.sin(x * .13 + Math.sin(y / size * Math.PI * 2) * .7) * 2.1;
      const tint = grain + (rng() - .5) * 4;
      const index = (y * size + x) * 4;
      image.data[index] = 224 + tint;
      image.data[index + 1] = 201 + tint;
      image.data[index + 2] = 169 + tint;
    }
  }
  context.putImageData(image, 0, 0);
  // Periodic curves meet at each tile edge instead of forming obvious seams.
  for (let index = 0; index < 65; index++) {
    const x = rng() * size;
    const amplitude = 1 + rng() * 2.5;
    const phase = rng() * Math.PI * 2;
    context.strokeStyle = index % 3 === 0 ? 'rgba(255,248,230,.15)' : 'rgba(135,99,61,.09)';
    context.lineWidth = .4 + rng() * .8;
    context.beginPath();
    for (let y = 0; y <= size; y += 4) {
      const offset = Math.sin(y / size * Math.PI * 2 + phase) * amplitude;
      if (y === 0) context.moveTo(x + offset, y);
      else context.lineTo(x + offset, y);
    }
    context.stroke();
  }
}

function fabric(context: CanvasRenderingContext2D, size: number) {
  const rng = random(909);
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const weave = Math.sin(x * Math.PI / 2) * 9 + Math.sin(y * Math.PI / 2) * 7;
      const value = 198 + weave + (rng() - .5) * 8;
      const index = (y * size + x) * 4;
      image.data[index] = image.data[index + 1] = image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function plaster(context: CanvasRenderingContext2D, size: number) {
  const rng = random(612);
  const image = context.createImageData(size, size);
  for (let index = 0; index < image.data.length; index += 4) {
    const value = 202 + (rng() - .5) * 23;
    image.data[index] = image.data[index + 1] = image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

function terrazzo(context: CanvasRenderingContext2D, size: number) {
  const rng = random(723);
  context.fillStyle = '#e7ded1';
  context.fillRect(0, 0, size, size);
  const colors = ['#c4b2a6', '#f9f4eb', '#adb8a0', '#d7b9bb', '#ccbfae'];
  for (let index = 0; index < 480; index++) {
    const x = rng() * size;
    const y = rng() * size;
    const radius = .35 + rng() * 1.9;
    context.fillStyle = colors[index % colors.length];
    context.globalAlpha = .4 + rng() * .35;
    context.beginPath();
    context.moveTo(x, y - radius);
    context.lineTo(x + radius, y - radius * .3);
    context.lineTo(x + radius * .6, y + radius);
    context.lineTo(x - radius * .75, y + radius * .5);
    context.closePath();
    context.fill();
  }
  context.globalAlpha = 1;
}

function landscape(context: CanvasRenderingContext2D, size: number) {
  const sky = context.createLinearGradient(0, 0, 0, size);
  sky.addColorStop(0, '#e1e6df');
  sky.addColorStop(.4, '#f0d7cc');
  sky.addColorStop(1, '#fbedd5');
  context.fillStyle = sky;
  context.fillRect(0, 0, size, size);
  const glow = context.createRadialGradient(size * .7, size * .3, 0, size * .7, size * .3, size * .28);
  glow.addColorStop(0, 'rgba(255,248,226,.9)');
  glow.addColorStop(1, 'rgba(255,248,226,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#fff3d7';
  context.beginPath();
  context.arc(size * .7, size * .3, size * .045, 0, Math.PI * 2);
  context.fill();
  const mountains = [
    { color: '#c0c6bc', points: [[0, .6], [.12, .44], [.24, .53], [.38, .37], [.52, .5], [.62, .41], [.77, .57], [.91, .43], [1, .55]] },
    { color: '#a4b4a2', points: [[0, .68], [.14, .55], [.29, .65], [.44, .51], [.61, .66], [.76, .53], [.9, .61], [1, .57]] },
    { color: '#829a87', points: [[0, .77], [.13, .68], [.28, .76], [.41, .65], [.56, .72], [.74, .65], [.91, .73], [1, .69]] },
    { color: '#667e6e', points: [[0, .9], [.19, .81], [.41, .9], [.62, .8], [.83, .89], [1, .81]] },
  ];
  for (const mountain of mountains) {
    context.fillStyle = mountain.color;
    context.beginPath();
    context.moveTo(0, size);
    for (const [x, y] of mountain.points) context.lineTo(x * size, y * size);
    context.lineTo(size, size);
    context.closePath();
    context.fill();
  }
  // A quiet river curve recalls the valleys around Cuenca without using a photo.
  context.strokeStyle = '#d5ded1';
  context.lineWidth = size * .018;
  context.beginPath();
  context.moveTo(size * .63, size * .78);
  context.bezierCurveTo(size * .58, size * .86, size * .78, size * .91, size * .62, size);
  context.stroke();
}

function art(context: CanvasRenderingContext2D, size: number) {
  context.fillStyle = '#f3ebdd';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#e0c0bc';
  context.beginPath();
  context.ellipse(size * .56, size * .45, size * .26, size * .32, -.2, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#526c58';
  context.lineWidth = size * .01;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(size * .48, size * .83);
  context.bezierCurveTo(size * .51, size * .64, size * .39, size * .43, size * .56, size * .2);
  context.stroke();
  const leaves = [
    [.49, .69, .3, .54, '#708772'], [.49, .59, .7, .45, '#80957c'],
    [.47, .48, .29, .34, '#4e6c57'], [.5, .37, .71, .26, '#6e896e'],
    [.53, .27, .48, .13, '#4f705e'],
  ] as const;
  for (const [stemX, stemY, tipX, tipY, color] of leaves) {
    const dx = tipX - stemX;
    const dy = tipY - stemY;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(stemX * size, stemY * size);
    context.bezierCurveTo((stemX + dx * .22 - dy * .25) * size, (stemY + dy * .22 + dx * .25) * size, (tipX - dx * .15 - dy * .2) * size, (tipY - dy * .15 + dx * .2) * size, tipX * size, tipY * size);
    context.bezierCurveTo((tipX - dx * .2 + dy * .2) * size, (tipY - dy * .2 - dx * .2) * size, (stemX + dx * .15 + dy * .2) * size, (stemY + dy * .15 - dx * .2) * size, stemX * size, stemY * size);
    context.fill();
  }
  context.fillStyle = '#c8ab8c';
  context.beginPath();
  context.moveTo(size * .34, size * .78);
  context.lineTo(size * .64, size * .78);
  context.lineTo(size * .6, size * .94);
  context.lineTo(size * .38, size * .94);
  context.closePath();
  context.fill();
}

/** Call once per mounted room and dispose the returned shared maps on unmount. */
export function createRoomTextures(): RoomTextures {
  const textures: CanvasTexture[] = [];
  function make(name: string, size: number, paint: Paint, color = true, repeat: [number, number] = [1, 1]) {
    const texture = new CanvasTexture(canvas(size, paint));
    texture.name = `room-${name}`;
    if (color) texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(...repeat);
    texture.anisotropy = 4;
    textures.push(texture);
    return texture;
  }
  const dispose = () => textures.forEach(texture => texture.dispose());
  try {
    return {
      wood: make('wood', 256, wood, true, [1, 3]),
      fabric: make('fabric', 256, fabric, false, [8, 8]),
      plaster: make('plaster', 256, plaster, false, [3, 3]),
      terrazzo: make('terrazzo', 256, terrazzo),
      landscape: make('landscape', 512, landscape),
      art: make('art', 512, art),
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

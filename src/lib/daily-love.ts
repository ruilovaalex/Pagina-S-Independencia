const memories = [
  ['2e09d04ba19f0e594f79619a14ed6411', 'Contigo, todo es hogar, amor.'],
  ['4f394b3ac8a89add5cab5f5cf97603d8', 'Mi lugar favorito eres tú, amor.'],
  ['6071d279becbe243b8fd0e91b6e48f86', 'Qué bonito coincidir contigo.'],
  ['73630dc7f5abd24f5a1144aca1574462', 'Te elegiría otra vez, amor.'],
  ['8e004f194bb913f1c15afde7ab994d45', 'Tú y yo, poquito a poquito.'],
  ['9fd1c95d7febb15b6c8e2cb682a499a1', 'Mi calma tiene tu nombre.'],
  ['a17546360171d7625e332a2945b5e9f8', 'Te amo, mi todo.'],
  ['b5925cdb21487d9287e4c68864775c11', 'Tu abrazo es mi casa, amor.'],
  ['be32e78471c572f7b6ea7a407789a94d', 'Te amo. Todo es más lindo contigo.'],
  ['cab57ce6ebfc1e805de84b5520014e4c', 'Te amo amor uwu.'],
] as const;

export function dailyLove(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/Guayaquil', year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date);
  const value = (type:string) => Number(parts.find(part=>part.type===type)!.value);
  const day = Math.floor((Date.UTC(value('year'),value('month')-1,value('day'))-Date.UTC(2026,9,11))/86400000);
  const index = ((day % memories.length)+memories.length)%memories.length;
  const [file,note] = memories[index];
  return {src:`/images/daily-love/${file}.jpg`,note};
}

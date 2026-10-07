import type { SupabaseClient } from '@supabase/supabase-js';
import type { House, RoomId } from './house-state';

export interface HomePersonalization { floorColors:Partial<Record<RoomId,string>>; decorations:Partial<Record<RoomId,Record<string,number>>>; catName:string; room:RoomId }
export interface HomeSave { user_id:string; rooms:House; wall_colors:Record<RoomId,string>; personalization:HomePersonalization; revision:number }
/** Owner-scoped live persistence; the simulation never calls it. */
export function homeRepository(client:SupabaseClient, userId:string) {
  return {
    async load():Promise<HomeSave|null> {
      const {data,error} = await client.from('home_saves').select('*').eq('user_id',userId).maybeSingle();
      if(error) throw error;
      return data as HomeSave|null;
    },
    async save(rooms:House, colors:Record<RoomId,string>, revision:number|null, personalization:HomePersonalization):Promise<HomeSave> {
      const row = {user_id:userId,rooms,wall_colors:colors,personalization};
      const result = revision === null
        ? await client.from('home_saves').insert(row).select('*').single()
        : await client.from('home_saves').update(row).eq('user_id',userId).eq('revision',revision).select('*').maybeSingle();
      if(result.error) throw result.error;
      if(!result.data) throw new Error('El hogar cambió en otra pestaña. Recarga antes de guardar para conservar ambos cambios.');
      return result.data as HomeSave;
    },
  };
}

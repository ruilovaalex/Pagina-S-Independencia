import type { SupabaseClient } from '@supabase/supabase-js';
import type { House, RoomId } from './house-state';

export interface HomeSave { user_id:string; rooms:House; wall_colors:Record<RoomId,string>; revision:number }
/** Explicit opt-in adapter for the future live integration; the simulation never calls it. */
export function homeRepository(client:SupabaseClient, userId:string) {
  return {
    async load():Promise<HomeSave|null> {
      const {data,error} = await client.from('home_saves').select('user_id,rooms,wall_colors,revision').eq('user_id',userId).maybeSingle();
      if(error) throw error;
      return data as HomeSave|null;
    },
    async save(rooms:House, colors:Record<RoomId,string>, revision:number|null):Promise<HomeSave> {
      const row = {user_id:userId,rooms,wall_colors:colors};
      const result = revision === null
        ? await client.from('home_saves').insert(row).select('user_id,rooms,wall_colors,revision').single()
        : await client.from('home_saves').update(row).eq('user_id',userId).eq('revision',revision).select('user_id,rooms,wall_colors,revision').maybeSingle();
      if(result.error) throw result.error;
      if(!result.data) throw new Error('El hogar cambió en otra pestaña. Recarga antes de guardar para conservar ambos cambios.');
      return result.data as HomeSave;
    },
  };
}

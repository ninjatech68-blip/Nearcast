import { supabase } from '@/infrastructure/supabase/client';

/**
 * The curated place list.
 *
 * Reference data, readable by members and writable by nobody through the API.
 * The app holds a name and an id; the coordinate behind it stays in the
 * database, which is why nothing here has a latitude field.
 */

export type Place = {
  id: string;
  name: string;
  region: string;
};

export async function fetchPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('id, name, region')
    .eq('is_active', true)
    .order('name');

  if (error !== null) throw error;

  return data;
}

/** Sets the member's approximate home to a named area they choose. */
export async function setHomePlace(placeId: string): Promise<string> {
  const { data, error } = await supabase.rpc('set_home_place', {
    target_place: placeId,
  });

  if (error !== null) throw error;

  return data;
}

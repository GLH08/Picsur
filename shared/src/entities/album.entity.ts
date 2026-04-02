export interface EAlbum {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  image_ids: string[];
  created: Date;
  updated: Date;
}

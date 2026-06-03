export interface PanoramaNode {
  id: string;                // Supabase photo id
  lat: number;
  lng: number;
  heading: number;           // compass direction 0-360
  label: string;             // scene number: "0", "1", "2"
  connectionCount: number;   // how many connections this node has
  status: 'active' | 'inactive' | 'processing' | 'published' | 'failed';
  streetview_photo_id?: string;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  heading: number;
  isLocked: boolean;
}

export type MapMode = 'select' | 'connect' | 'rotate' | 'lock';

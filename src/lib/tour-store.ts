// In-Memory Tour Cache Store
// Caches tour data across route navigation (e.g. Upload <-> Connections <-> Publish)
// Eliminates network latency, layout shift, and blank skeleton flashes on tab switches.

export interface CachedTourData {
  tour: any;
  photos: any[];
  connections: any[];
  constellations: any[];
  islands: any[];
  profile?: any;
  timestamp: number;
}

const cache = new Map<string, CachedTourData>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

export const tourStore = {
  get(tourId: string): CachedTourData | null {
    if (!tourId) return null;
    const entry = cache.get(tourId);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(tourId);
      return null;
    }
    return entry;
  },

  set(tourId: string, data: Partial<CachedTourData>) {
    if (!tourId) return;
    const existing = cache.get(tourId);
    cache.set(tourId, {
      tour: data.tour !== undefined ? data.tour : existing?.tour ?? null,
      photos: data.photos !== undefined ? data.photos : existing?.photos ?? [],
      connections: data.connections !== undefined ? data.connections : existing?.connections ?? [],
      constellations: data.constellations !== undefined ? data.constellations : existing?.constellations ?? [],
      islands: data.islands !== undefined ? data.islands : existing?.islands ?? [],
      profile: data.profile !== undefined ? data.profile : existing?.profile ?? null,
      timestamp: Date.now(),
    });
  },

  updatePhotos(tourId: string, updater: (photos: any[]) => any[]) {
    const entry = cache.get(tourId);
    if (!entry) return;
    entry.photos = updater(entry.photos);
    entry.timestamp = Date.now();
  },

  updateConnections(tourId: string, updater: (conns: any[]) => any[]) {
    const entry = cache.get(tourId);
    if (!entry) return;
    entry.connections = updater(entry.connections);
    entry.timestamp = Date.now();
  },

  updateTour(tourId: string, patch: Partial<any>) {
    const entry = cache.get(tourId);
    if (!entry || !entry.tour) return;
    entry.tour = { ...entry.tour, ...patch };
    entry.timestamp = Date.now();
  },

  invalidate(tourId?: string) {
    if (tourId) {
      cache.delete(tourId);
    } else {
      cache.clear();
    }
  },
};

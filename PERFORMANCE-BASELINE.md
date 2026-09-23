# PanoPublish Performance Baseline

- **Date / Timestamp**: 2026-09-23T18:07:00+05:30
- **Git Commit Hash**: `814613bcc8932888026d0d174243f4bb73265c2f`
- **Build Time**: 67.39 seconds (`Measure-Command { npm run build }`)
- **Total JS Chunk Count**: 126 JavaScript files
- **Total JS Bundle Size**: 3,617.8 KB (~3.62 MB)
- **Largest JS Chunk**: `index-BamSHbKk.js` at **2,378.3 KB** (65.7% of total bundle in entry chunk)

## Major Route Chunk Sizes (Pre-Optimization)
- `index-BamSHbKk.js` (Root / Entry): **2,378.3 KB**
- `tours._tourId.publish-*.js`: **216.1 KB**
- `styles-*.css`: **193.0 KB**
- `_slug-*.js`: **138.6 KB**
- `tours._tourId.connections-*.js`: **123.0 KB**
- `tours._tourId.index-*.js`: **115.5 KB**
- `admin-*.js`: **62.8 KB**
- `settings-*.js`: **50.7 KB**
- `dashboard-*.js`: **41.8 KB**
- `tours.new-*.js`: **24.4 KB**
- `tours.index-*.js`: **11.5 KB**

## Existing Warnings / Errors
- Build Warning: `(!) Some chunks are larger than 500 kB after minification: dist/client/assets/index-BamSHbKk.js (2,378.3 KB)`
- `npm run lint`: Prettier CRLF (`Delete ␍`) warnings on Windows, and Deno edge-function triple slash directives in `supabase/functions/`.

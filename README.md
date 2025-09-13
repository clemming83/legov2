# LEGO Batman – Voxel Builder (Deluxe, CDN version)

Denne pakke er klar til **GitHub Pages** uden build eller npm. Alt loader via ESM CDN (React 18, three.js, @react-three/fiber, @react-three/drei, framer-motion).

## Brug
1. Åbn dit repo på GitHub (fx `legov2`).
2. Klik **Add file → Upload files** og træk `index.html` herind (overskriv hvis der ligger en i forvejen).
3. Gå til **Settings → Pages** og sæt:
   - Source: **Deploy from a branch**
   - Branch: **main** / **/(root)**
4. Vent ca. 1 minut og åbne linket `https://<dit-brugernavn>.github.io/<repo-navn>/`.

## Controls
- WASD/piletaster: bevægelse
- Space: hop
- B: toggle sidebar
- 1–9: vælg blok i hotbar
- Q: skift Build/Gadget
- E: kast batarang
- F1: first-person (klik i canvas for pointer lock)

> Bemærk: Denne version bruger CDN og virker derfor uden server. Hvis du senere vil have en bundlet, performance-optimeret build, brug Vite og kør `npm run build`, og upload indholdet af `dist/` til GitHub Pages.

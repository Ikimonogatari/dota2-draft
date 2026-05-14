@AGENTS.md

# Dota 2 Draft Simulator

Next.js 16 app-router project. Stack: TypeScript, Tailwind CSS v4.

## Key files
- `lib/heroes.ts` — 120 heroes, Steam CDN image URLs (`heroImageUrl(hero.name)` takes internal snake_case name, NOT display name)
- `lib/draft.ts` — 22-step Captains Mode sequence, `DraftSlot` type
- `hooks/useCountdown.ts` — countdown timer per draft step
- `app/api/draft/route.ts` — in-memory save/share API (POST to save, GET ?id= to load)
- `components/DraftApp.tsx` — root client component, all draft state lives here
- `components/HeroGrid.tsx` — hero picker with search + attribute filter
- `components/TeamPanel.tsx` — team picks/bans display; looks up hero by `slot.heroId` from HEROES to get image name
- `components/HeroCard.tsx` — landscape `aspect-video` card (Steam CDN images are ~256x144)
- `components/PhaseBar.tsx` — phase progress + step dots

## Color tokens (defined in globals.css @theme, use as Tailwind utilities)
`bg-dota-bg`, `bg-dota-surface`, `bg-dota-panel`, `text-dota-gold`, `border-dota-line`, `text-dota-muted`, `text-dota-radiant`, `text-dota-dire`, `text-dota-str`, `text-dota-agi`, `text-dota-int`, `text-dota-uni`

## Important gotcha
`heroImageUrl()` expects the hero's internal `name` (e.g. `"antimage"`), not `displayName` (e.g. `"Anti-Mage"`). Team panel and anywhere else rendering hero images must look up the hero from `HEROES` by id, not use the display name string directly.

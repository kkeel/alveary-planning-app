# Alveary brand foundation (development)

Source of truth: existing live planning repository `kkeel/course-picker` and the supplied Webflow dashboard screenshot (2027–28 testing).

## Design tokens

| Token | Reference value |
| --- | --- |
| Warm page background | `#FAF7ED` |
| Dark body text | `#262B26` |
| Muted green | `#596E5E` |
| Light olive | `#ADB58F` |
| Soft dividers | `#DDE2D5` |
| Webflow dashboard sidebar | Dark charcoal visually sampled from screenshot (approximate, not a formally supplied token) |

The development navigation has a larger, responsive desktop sidebar to align with the supplied full-screen Webflow screenshot. The sidebar can still collapse for work that needs more horizontal space.

## Existing assets

Original navigation SVGs from `kkeel/course-picker/img/menu-icons/` were copied to `public/brand/navigation/` as a curated set. This avoids blindly retaining last year's entire asset directory structure.

Existing planner app also contains:
- Branding image / favicon at `img/Alveary Lt. Green.png`.
- Local `Plantin MT Pro` font files at `assets/fonts/plantin/`.
- Local `Circular Pro` font files at `assets/fonts/circular/`.
- Google-hosted `DM Sans`, which is used for body text.

The navigation icon files are available in this project. CMI confirmed permission to reuse these fonts. The site now prepares exact source versions of the Plantin MT Pro and Circular Pro WOFF2 files and the existing Alveary emblem at build time via `scripts/prepare-brand-assets.mjs` (verified using Git blob SHA-1 hashes). Binary files are excluded from source commits but included in the built public website. The logo image is reused from last year’s planner; confirm whether this is also the preferred Webflow dashboard mark. The build depends on the existing public `course-picker` repository remaining accessible until assets are migrated permanently.

## Dashboard links

Development return URL (same tab; wordmark, breadcrumb, top action, and sidebar return): `https://alveary.org/alveary-2027-2028/dashboard-test`.

Override on deployment with the public variable `NEXT_PUBLIC_ALVEARY_DASHBOARD_URL` when the target changes. The actual Webflow entry link should open the planning app in a new tab so the original member dashboard remains available.

No Memberstack or Supabase identity checks have been added. Public visitors can open current placeholder routes without authentication. This is intentional until SSO and entitlement verification are built and tested.

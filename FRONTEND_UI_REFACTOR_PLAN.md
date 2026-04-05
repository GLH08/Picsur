# Frontend UI Refactor Plan

## Goal

This document freezes the implementation plan for the frontend UI redesign before any code changes begin.

Primary goals:

- Rebuild the frontend visual system instead of patching page-level CSS
- Keep only light mode
- Make images, videos, and albums the visual focus
- Unify layout, interaction, overlays, and motion
- Avoid style drift, duplicated solutions, and partial migration issues

This plan is the baseline for all future implementation work.

## Scope

Phase 1 covers:

- Global visual system
- App shell and navigation chrome
- Images page
- Videos page
- Albums list page
- Album detail page
- Shared overlays used by these areas

Out of scope for the first pass:

- Login and register redesign
- Full settings page redesign
- API docs page
- Backend API semantics

## Current Problems

### System-level issues

- The frontend still relies on an old Angular Material theme structure with both dark and light modes
- Core pages each define their own visual language
- Color, radius, border, shadow, and spacing rules are inconsistent
- Menus, dialogs, viewers, and side panels do not share a consistent overlay system

### Page-level issues

- Images, videos, and albums feel like different products
- Borders are too heavy and compete with the media content
- Hover states are inconsistent or visually weak
- Selection state is visually crude
- Core content is not visually prioritized
- Layout density and hierarchy are uneven

### Code-level issues

- Large route components mix business logic, interaction state, and presentation concerns
- Similar UI behavior is duplicated across images, videos, and albums
- Global style values are hardcoded across page SCSS files

## Technology Decision

### Framework

Do not change framework.

Keep:

- Angular 18
- Angular Router
- Angular CDK
- RxJS

Adjust:

- Reduce Angular Material visual influence
- Keep Material for low-level primitives where useful
- Rebuild the visual layer on top of custom tokens and shared UI components
- Remove dark mode support

## Design Direction

### Visual style

- Light-only interface
- Liquid glass aesthetic for shell, toolbars, menus, dialogs, and panels
- Soft atmospheric background with subtle gradients and blurred color fields
- Media-first presentation: images and videos must dominate the page visually
- Refined, low-contrast borders
- Soft layered shadows instead of heavy card outlines

### Inspirations

- Mature image hosting products such as Lsky Pro
- Modern album/gallery applications
- iOS-style fluid and layered light surfaces

### Rules

- Glass effects are used for structural UI, not for media surfaces themselves
- Media cards should feel elevated and tactile, but never overloaded
- Hover motion must be subtle, smooth, and consistent
- Avoid purple-heavy accenting from the current UI

## Design System Plan

All page styles must consume shared tokens. No page should invent its own visual constants.

### Color tokens

- `--bg-canvas`
- `--bg-gradient-start`
- `--bg-gradient-end`
- `--surface-base`
- `--surface-glass`
- `--surface-elevated`
- `--border-soft`
- `--border-strong`
- `--text-primary`
- `--text-secondary`
- `--text-tertiary`
- `--accent-primary`
- `--accent-secondary`
- `--danger`
- `--success`

### Radius tokens

- `--radius-sm`
- `--radius-md`
- `--radius-lg`
- `--radius-xl`
- `--radius-2xl`
- `--radius-pill`

### Shadow tokens

- `--shadow-soft`
- `--shadow-card`
- `--shadow-float`

### Blur tokens

- `--blur-sm`
- `--blur-md`
- `--blur-lg`

### Spacing tokens

- `--space-1` through `--space-8`

### Motion tokens

- `--duration-fast`
- `--duration-normal`
- `--duration-slow`
- `--ease-standard`
- `--ease-emphasis`

### Layering tokens

- `--z-toolbar`
- `--z-overlay`
- `--z-menu`
- `--z-modal`
- `--z-viewer`

## SCSS Architecture

Planned structure:

- `frontend/src/scss/tokens/`
- `frontend/src/scss/foundation/`
- `frontend/src/scss/components/`

Planned responsibilities:

- `tokens/`: CSS variables, maps, reusable scales
- `foundation/`: reset, typography, layout shells, global background, motion rules
- `components/`: shared visual primitives such as glass panel, toolbar, viewer shell, menus

### Existing files to rework

- `frontend/src/scss/index.scss`
- `frontend/src/scss/material/material-theme.scss`
- `frontend/src/styles.scss`

### Theme strategy

- Replace dual-theme styling with a single light theme
- Remove dark-specific branches from page styles during migration
- Keep Material functionality, but remap component appearance into the new light system

## App Shell Plan

Areas to redesign:

- Header
- Main page container
- Floating toolbar regions
- Shared overlays
- Footer
- Settings sidebar shell

### Header

- Convert to a floating glass navigation bar
- Reduce visual weight
- Make core actions clearer: upload, images, settings, auth

### Page shell

- Introduce a consistent `page-shell`
- Introduce a consistent `page-hero`
- Use shared spacing and width constraints

### Footer

- Minimize visual prominence
- Keep only essential metadata and status output

## Component Plan

Create reusable UI primitives before page migration.

### UI primitives

- `UiGlassPanel`
- `UiPageHero`
- `UiSectionHeader`
- `UiFloatingToolbar`
- `UiEmptyState`
- `UiContextMenu`
- `UiActionIconButton`
- `UiInfoChip`

### Media components

- `MediaGrid`
- `MediaCard`
- `MediaCardImage`
- `MediaCardVideo`
- `MediaCardAlbum`
- `MediaOverlayActions`
- `MediaSelectionToolbar`
- `MediaViewerShell`

### Overlay strategy

The following must be unified:

- Right-click context menus
- Image viewer shell
- Video viewer shell
- Share dialog styling
- Album picker dialog styling

## Feature Layout Strategy

### Images page

Objectives:

- Media-first gallery layout
- Cleaner grouping and reduced visual clutter
- Unified hover actions
- Better selection UX
- Better search and bulk action presentation

Plan:

- Use a shared media grid
- Convert group headers into lightweight section headers
- Move search and selection controls into a shared floating toolbar
- Replace heavy selection outlines with glow-style selection feedback
- Standardize hover actions: open, share, add to album, delete

### Videos page

Objectives:

- Share the same visual system as images
- Add video-specific overlays without forking the design language

Plan:

- Reuse `MediaGrid` and `MediaCard`
- Use video-specific thumbnail ratio and play affordance
- Reuse the same context menu and viewer shell

### Albums list page

Objectives:

- Make albums cover-driven and visually premium
- Emphasize cover, count, and updated time
- Remove generic card-list feeling

Plan:

- Rebuild album cards around cover hierarchy
- Use shared page hero and glass action bar
- Redesign create/edit album flows with unified modal styling

### Album detail page

Objectives:

- Make the page feel like an album destination, not a generic CRUD page
- Reuse the shared media system for album contents

Plan:

- Introduce an album hero area
- Reuse media grid for contained items
- Unify remove/set-cover/view actions with the shared action model
- Reuse viewer shell for image and video viewing

## Interaction Rules

These rules apply globally.

### Hover

- Lift: `translateY(-4px)` to `translateY(-8px)` depending on surface depth
- Media scale: `scale(1.02)` to `scale(1.04)`
- Action reveal: fade + slight upward movement

### Selection

- Use glow border and subtle surface tint
- Avoid thick outline-based selection

### Context menu

- Shared glass menu component
- Shared spacing, icon sizing, destructive action styling

### Dialogs and side panels

- Shared glass treatment
- Shared title/body/action regions
- Shared layering behavior

### Viewer

- Shared shell for image and video
- Immersive but refined backdrop
- No hard visual split between different media types

### Motion

- One motion system across cards, menus, overlays, and viewer transitions
- No page-specific ad hoc animation values

## Code Reorganization Plan

Planned new app structure:

- `frontend/src/app/ui/`
- `frontend/src/app/features/media/`
- `frontend/src/app/features/albums/`
- `frontend/src/app/layout/`

Migration rules:

- Route components keep orchestration responsibility
- Presentation moves into shared components
- Visual constants move into SCSS tokens
- Overlay logic is centralized wherever possible

## Migration Phases

### Phase 0: Freeze plan

- Save this document
- Use this as the reference for implementation

### Phase 1: Foundation

- Build token layer
- Replace dual-theme foundation with single light-theme foundation
- Rebuild app shell styling

### Phase 2: Shared UI primitives

- Implement glass panel
- Implement page hero
- Implement floating toolbar
- Implement empty state
- Implement shared context menu
- Implement shared viewer shell

### Phase 3: Media system

- Implement shared media grid
- Implement shared media card
- Implement shared media actions layer
- Implement shared selection toolbar

### Phase 4: Images page

- Use as reference implementation
- Complete full redesign before moving on

### Phase 5: Videos page

- Reuse image-page media system
- Only add video-specific behavior

### Phase 6: Albums pages

- Rebuild album list
- Rebuild album detail
- Reuse media system and shared overlays

### Phase 7: Overlay cleanup

- Unify share dialog styling
- Unify album picker styling
- Remove page-private overlay visuals

### Phase 8: Cleanup

- Remove old dark-mode branches
- Remove duplicate page-specific visual constants
- Remove obsolete style code paths

## Quality Gates

Every migration phase must satisfy the following checks.

### Visual consistency

- Images, videos, and albums look like one product
- Shared overlays look identical in structure and tone
- Button, menu, card, panel, and chip styles are not duplicated

### Technical consistency

- No hardcoded page-specific color values for core system colors
- No page-specific shadow systems
- No retained old theme branches for migrated areas
- No dual implementation of viewer or context menu

### UX consistency

- Hover language is shared
- Selection language is shared
- Search and bulk actions are structurally consistent
- Empty states are structurally consistent

### Responsive consistency

- Verify desktop
- Verify medium tablet width
- Verify mobile width

## Risk Controls

To avoid repeating the previous failed refactor, these rules are mandatory.

- Do not migrate multiple core pages before the shared system exists
- Do not preserve parallel old and new style systems longer than necessary
- Do not let page SCSS files define new visual primitives
- Do not redesign videos independently from images
- Do not keep separate viewer or context menu implementations
- Do not mix legacy dark-mode support into new components

## Acceptance Criteria

The first major redesign pass is accepted only if:

- The app runs in light mode only
- Images, videos, and albums share a unified visual language
- Media is the visual focus of those pages
- Borders feel refined and low-weight
- Hover and floating behavior are elegant and consistent
- Overlays feel premium and unified
- No major old-theme artifacts remain in migrated areas

## Next Implementation Order

When implementation begins, use this order:

1. Rebuild global theme foundation
2. Rebuild app shell and overlay layer
3. Build shared media primitives
4. Redesign images page
5. Redesign videos page
6. Redesign albums list page
7. Redesign album detail page
8. Unify dialogs and menus
9. Remove old residual style branches

## Reference Principle

No implementation step should violate this rule:

If a style, motion, overlay, or card pattern is needed in more than one core page, it must be extracted into the shared system before the second page is migrated.

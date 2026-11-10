# Architecture

Nook is a client-side React and TypeScript application built with Vite. Three.js renders procedural models; Zustand manages editor state, Zod validates saved data and Dexie stores projects in IndexedDB.

The static homepage and editor have separate entry points. Model families load through dynamic imports. Catalogue browsing uses prepared PNGs rather than constructing a WebGL renderer for each tile. Generation and verification commands are documented in `scripts/thumbnail-generator/README.md`.

Domain dimensions use millimeters. Shared geometry supplies placement validation and plan primitives so the 3D scene and exported plans agree. Changes to existing concept IDs, dimensions or persisted fields require compatibility review for saved projects.

The current room capacity is 24 placed objects. A larger catalogue does not increase that capacity. Device performance, accessibility and export accuracy need representative browser testing before release; build success is not a performance guarantee.

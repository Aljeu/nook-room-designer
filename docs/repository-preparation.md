# Repository preparation — 2026-11-11

## Cleanup

The public project folder now contains runtime source, tests, public assets, development scripts, configuration and current contributor documentation. Historical planning handouts, specialist coordination notes, raw references, recovery sources, recordings and design studies were moved to a sibling local archive outside the repository. They are not inputs to the runtime or build. OS metadata and an empty folder were deleted.

Removed from the repository folder: old thumbnail service and its tests (no remaining callers), historical performance server, unused public media/logo variants, original font download bundles, retired typography pages and their fonts/styles. A relative-import scan found no additional unreferenced source modules apart from the explicit application/build entry points and tests. Static asset checks found no missing literal references other than the intentionally generated `site/catalogue.js`, which exists in production output.

React Three Fiber was unused by the direct Three.js implementation and was uninstalled along with ten unused packages in total. Runtime models and editor persistence formats were preserved. Export test fixtures were updated to supply the browser image loader and check the current logo text/position; export implementation was not changed.

The visible homepage font families were compared in the browser before/after cleanup: both sets were identical (Clash Display and Creato). Colitez, Otflag, Strong and Mooxy were retired studies, not the current visible typography. Retained font licence notices are listed in `THIRD_PARTY_NOTICES.md`.

## Verification

- Full suite: 179 passed, two conditional skips, no failures, across 35 files. Removing three tests for the obsolete thumbnail service explains the lower count compared with the pre-cleanup suite.
- All 83 previews regenerated and source-fingerprint/image/coverage checks passed.
- TypeScript checking and production build passed. Vite's existing future native-config extensionless-import advisory remains.
- `npm audit` after dependency cleanup: zero known vulnerabilities, including development dependencies.
- Text scans found no common GitHub/AWS/API token patterns, private-key headers, credential-like files or local absolute paths in the intended public source. This is a bounded heuristic scan, not a guarantee of absence of secrets or a formal penetration test.
- Public output uses root-relative asset paths. GitHub repository hosting is supported; GitHub Pages project-subpath deployment still requires a base/routing adaptation.

## GitHub handoff

The curated project was published to the public GitHub repository [`Aljeu/nook-room-designer`](https://github.com/Aljeu/nook-room-designer) on the `main` branch. The repository description introduces Nook as an approachable 3D room planner. Only the prepared application source, required assets, tests, build configuration, and current contributor/security documentation were uploaded; dependencies, build output, local exports, environment files, keys, logs, OS metadata, and the sibling archive remain outside the public repository. CI runs installation, tests, thumbnail verification, build, and dependency audit with read-only repository permissions.

A project-wide reuse licence has not been selected. Public visibility does not grant reuse rights. Keep third-party font licence notices with their files, and do not add the sibling archive of local working history to the repository.

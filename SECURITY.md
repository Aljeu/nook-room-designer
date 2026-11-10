# Security

Nook currently runs in the browser without server credentials or user accounts. Saved designs live in the browser's IndexedDB and are not a cloud backup. Use trusted devices and avoid entering sensitive personal information into project names or comments.

Do not commit credentials, private keys, `.env` files or personal project exports. Generated output and local dependencies are ignored by Git.

Before release, run `npm audit`, the test suite and the production build. The audit checks known advisories in the dependency tree; it does not establish that the application has no vulnerabilities. Review changes to imported files, rendering, HTML/SVG escaping, browser storage and development servers.

Report security concerns privately to the repository owner through a private channel or GitHub private vulnerability reporting if enabled. Do not put credentials or private design files in a public issue.

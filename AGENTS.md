# Agent instructions

A TypeScript library that converts Mind Elixir mind maps to Mermaid `mindmap` source.
MIT. Not an official Mind Elixir package.

- Write all code, identifiers, comments, documentation, commits and user-facing text in English.
- Use strict TypeScript and two spaces. `npm run format` applies formatting.
- Use English branch names prefixed with `feature/` or `hotfix/`.
- Keep the library free of runtime dependencies and of the DOM. Read Mind Elixir data
  structurally; `mind-elixir` and `pele` are development dependencies for tests only.
- Every output must parse: tests render it with Pele. A change to escaping or syntax needs
  a test with the characters involved. Keep coverage at 100%.
- Verify Mermaid syntax against Mermaid's documentation and real renderers, not assumptions.

Before release: `npm ci`, `npm run check` and `npm run test:package`.

After CI passes, publish a GitHub Release whose title and new tag are `v` plus the exact
`package.json` version. The release creates the tag and triggers npm publication; pushing a
tag alone does not publish. `publish.yml` uses npm Trusted Publishing (OIDC), environment
`npm`, without committed tokens. Publish the same tarball installed by the package test.
Never replace a published release. Record changes in CHANGELOG.md.

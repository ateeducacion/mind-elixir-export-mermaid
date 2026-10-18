# Changelog

## Unreleased

- Encode `%` (`#37;`). Mermaid removes `%%{...}%%` directives anywhere in the source before
  parsing, so a topic containing one lost that text or made the whole diagram fail to parse.

## 0.1.1 — 2026-10-18

- Published from CI with npm Trusted Publishing and provenance. No code changes.

## 0.1.0 — 2026-10-18

- First release: `mindElixirToMermaid(data, options)` converts Mind Elixir data or a node
  to Mermaid `mindmap` source, with node shapes, classes, icons, markdown strings for bold,
  italic and line breaks, and the option to leave out folded branches.
- Text is escaped with Mermaid entity codes, so any topic renders as typed in Mermaid and
  in Pele.

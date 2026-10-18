# Security

## Supported versions

Only the latest release on npm receives fixes. The package is pre-1.0, so a fix ships as a new
patch or minor version.

## Reporting

Please report vulnerabilities privately through
[GitHub Security Advisories](https://github.com/ateeducacion/mind-elixir-export-mermaid/security/advisories/new)
("Report a vulnerability"). Do not open public issues for them. Include the version, the map data
(or the smallest topic) that triggers the problem, the options you passed and, if it is about
rendering, the renderer and its version.

## Threat model

The library turns Mind Elixir data into Mermaid `mindmap` source. It is pure: it does not touch the
DOM, the file system or the network, and it has no runtime dependencies. Map data is treated as
hostile, because maps are often written by other people (shared documents, imported files).

| Threat                                                                     | Mitigation                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A topic that closes its label, adds lines or nodes, or changes the diagram | Every topic is written as a quoted label with Mermaid entity codes for `#`, `%`, `"`, `<`, `>`, `'`, `` ` ``, `*` and `_` (`#` first, so codes are never encoded twice). Line breaks become spaces, or stay inside the quoted markdown string with the `markdown` option. |
| A topic that forms a Mermaid directive (`%%{init: …}%%`)                   | `%` is encoded, so Mermaid's directive pre-processing never sees one (from the release after 0.1.1, [#2](https://github.com/ateeducacion/mind-elixir-export-mermaid/pull/2)).                                                                                             |
| A topic read as HTML or markdown by the renderer                           | `<`, `>`, `*`, `_` and `` ` `` are encoded; in markdown mode only bold and italic from the node's style are added, by the library.                                                                                                                                        |
| Callbacks returning syntax (`className`, `icon`, `shape`)                  | Class names must match `^[A-Za-z_][\w-]*$`, icons `^[\w -]+$`, and shapes one of the six Mermaid shapes; anything else throws a `RangeError` instead of being written.                                                                                                    |
| Input that is not a Mind Elixir map                                        | Throws a `TypeError`; nothing is written.                                                                                                                                                                                                                                 |
| Very deep maps                                                             | The traversal is iterative, so depth cannot overflow the call stack.                                                                                                                                                                                                      |
| Very large maps                                                            | Output grows linearly with the input, and there is no size limit: limit the size of untrusted maps before converting them.                                                                                                                                                |

## Using the output safely

The library produces text. Rendering it is the renderer's responsibility:

- Insert the source as text (`textContent`, or HTML-escaped inside `<pre class="mermaid">`), never as
  raw HTML.
- Keep Mermaid's default `securityLevel: "strict"`. Do not render untrusted diagrams with `"loose"`
  or `"antiscript"`.
- Keep the Mind Elixir data as the source of the map; the Mermaid output is a view of it.

## Supply chain

- No runtime dependencies; development dependencies are pinned and updated through Dependabot.
- Releases are published from GitHub Actions with npm Trusted Publishing (OIDC) and provenance,
  after the same lint, type and coverage checks as CI. `npm audit signatures` verifies them.
- `main` is protected, and CodeQL, secret scanning with push protection and Dependabot security
  updates are enabled.

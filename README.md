# Mind Elixir export to Mermaid

[![CI](https://github.com/erseco/mind-elixir-export-mermaid/actions/workflows/ci.yml/badge.svg)](https://github.com/erseco/mind-elixir-export-mermaid/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/erseco/mind-elixir-export-mermaid/branch/main/graph/badge.svg)](https://codecov.io/gh/erseco/mind-elixir-export-mermaid)
[![npm](https://img.shields.io/npm/v/@erseco/mind-elixir-export-mermaid)](https://www.npmjs.com/package/@erseco/mind-elixir-export-mermaid)
[![Publish](https://github.com/erseco/mind-elixir-export-mermaid/actions/workflows/publish.yml/badge.svg)](https://github.com/erseco/mind-elixir-export-mermaid/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Converts [Mind Elixir](https://github.com/SSShooter/mind-elixir-core) mind maps to
[Mermaid `mindmap`](https://mermaid.js.org/syntax/mindmap.html) source.

Mermaid text is tiny, and it can be rendered to a sharp, lightweight SVG by
[Mermaid](https://mermaid.js.org) or by [Pele](https://github.com/obsidianmd/pele), which
needs no DOM and also runs on a server. GitHub, GitLab, Obsidian, Notion and many
documentation tools display it as well. For a 16-node map, the SVG that Pele renders from
this output is 8 KB (1.7 KB gzip), against 84 KB for a PNG screenshot of the same map.

No runtime dependencies, no DOM, and it works in browsers, Node.js, Bun and Deno.

## Install

```sh
npm install @erseco/mind-elixir-export-mermaid
```

## Use

```ts
import MindElixir from "mind-elixir";
import { mindElixirToMermaid } from "@erseco/mind-elixir-export-mermaid";

const mind = new MindElixir({ el: "#map" });
mind.init(MindElixir.new("Science"));

const source = mindElixirToMermaid(mind.getData());
// mindmap
//   n0(("Science"))
```

It takes the data returned by `mind.getData()`, or a single node and its descendants.

Render it with Pele:

```ts
import { render } from "pele";

const { svg } = render(source);
```

or with Mermaid:

```ts
import mermaid from "mermaid";

const { svg } = await mermaid.render("mindmap", source);
```

## Options

```ts
mindElixirToMermaid(data, {
  rootShape: "circle",
  nodeShape: "rounded",
  shape: (node, depth) => (depth === 1 ? "cloud" : undefined),
  className: (node) => (node.branchColor === "#c0392b" ? "red" : undefined),
  icon: (node) => (node.tags?.includes("book") ? "fa fa-book" : undefined),
  markdown: true,
  omitCollapsed: false,
  indent: 2,
});
```

| Option                   | Default     | Description                                                                                                                                                                                                      |
| ------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootShape`              | `"circle"`  | Shape of the root: `square`, `rounded`, `circle`, `bang`, `cloud` or `hexagon`.                                                                                                                                  |
| `nodeShape`              | `"rounded"` | Shape of the other nodes.                                                                                                                                                                                        |
| `shape(node, depth)`     |             | Shape of one node; return `undefined` to use the defaults.                                                                                                                                                       |
| `className(node, depth)` |             | CSS classes written as `:::name` (letters, digits, `-` and `_`).                                                                                                                                                 |
| `icon(node, depth)`      |             | Icon classes written as `::icon(...)`, for example `"fa fa-book"`.                                                                                                                                               |
| `markdown`               | `false`     | Write [markdown strings](https://mermaid.js.org/syntax/mindmap.html#markdown-strings), keeping bold (`fontWeight: "bold"`), italic (`fontStyle: "italic"`) and line breaks. Otherwise line breaks become spaces. |
| `omitCollapsed`          | `false`     | Leave out the children of folded nodes (`expanded: false`).                                                                                                                                                      |
| `indent`                 | `2`         | Spaces per level, from 1 to 8.                                                                                                                                                                                   |

`escapeLabel(text, markdown?)` is exported too, for building labels by hand.

## What is exported

The hierarchy, the order and the text of every node. Text is written with Mermaid's
entity codes (`#quot;`, `#lt;`, `#35;`, …), so a topic can contain quotes, brackets,
`#`, `%`, `*`, `_` or HTML-like text and still renders exactly as typed, never as markup
or as a Mermaid directive (`%%{init: …}%%`).

Mermaid's `mindmap` syntax has no equivalent for per-node colours and font styles (other
than bold and italic in markdown mode), branch sides, folded state, arrows, summaries,
links, images or tags, so those are not exported. Keep the Mind Elixir data as the source
of your map and use this output as a view of it. The `className` option can carry some of
that information as CSS classes if your page styles them.

Invalid input throws a `TypeError`, and an invalid option, class name or icon throws a
`RangeError`, rather than writing source that Mermaid cannot parse.

## Background

This package was proposed in
[mind-elixir-core#386](https://github.com/SSShooter/mind-elixir-core/issues/386). Thanks
to [@SSShooter](https://github.com/SSShooter) for Mind Elixir and for the suggestion to
make it a separate package. It is used by [eXeLearning](https://github.com/exelearning/exelearning),
an open-source authoring tool for educational content, whose published content needs a
static image of each mind map.

## Develop

```sh
npm ci
npm run check         # format, typecheck, tests with 100% coverage, build
npm run test:package  # pack, install the tarball in an empty project and import it
```

## License

[MIT](LICENSE)

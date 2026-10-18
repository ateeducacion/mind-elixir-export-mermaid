/**
 * Converts Mind Elixir mind maps to Mermaid `mindmap` source.
 *
 * The output can be rendered to SVG by Mermaid (https://mermaid.js.org) or by Pele
 * (https://github.com/obsidianmd/pele), and is understood by GitHub, GitLab, Obsidian and
 * other tools. It keeps the hierarchy, the order and the text of the map. Mermaid mindmaps
 * have no per-node colours, branch sides, arrows or summaries, so those are not exported.
 */

/** The fields of a Mind Elixir node this module reads (compatible with `NodeObj`). */
export interface MindElixirNode {
  topic: string;
  children?: readonly MindElixirNode[] | undefined;
  expanded?: boolean | undefined;
  style?:
    | {
        fontWeight?: string | undefined;
        fontStyle?: string | undefined;
      }
    | undefined;
}

/** The fields of Mind Elixir data this module reads (compatible with `MindElixirData`). */
export interface MindElixirData {
  nodeData: MindElixirNode;
}

/** Mermaid mindmap node shapes. */
export type MermaidShape =
  "square" | "rounded" | "circle" | "bang" | "cloud" | "hexagon";

/**
 * Options. `N` is the node type of your data (Mind Elixir's `NodeObj`, for example), which
 * the callbacks receive.
 */
export interface MermaidExportOptions<
  N extends MindElixirNode = MindElixirNode,
> {
  /** Shape of the root node. Default: `"circle"`. */
  rootShape?: MermaidShape;
  /** Shape of the other nodes. Default: `"rounded"`. */
  nodeShape?: MermaidShape;
  /** Shape of one node, overriding the two options above when it returns a shape. */
  shape?: (node: N, depth: number) => MermaidShape | undefined;
  /** CSS classes for a node, written as `:::name`. Names may contain letters, digits, `-` and `_`. */
  className?: (
    node: N,
    depth: number,
  ) => string | readonly string[] | undefined;
  /** Icon classes for a node, written as `::icon(...)`, for example `"fa fa-book"`. */
  icon?: (node: N, depth: number) => string | undefined;
  /**
   * Write labels as Mermaid markdown strings, which keep bold (`fontWeight: "bold"`),
   * italic (`fontStyle: "italic"`) and line breaks. Default: `false` (plain labels, line
   * breaks become spaces).
   */
  markdown?: boolean;
  /** Leave out the children of folded nodes (`expanded: false`). Default: `false`. */
  omitCollapsed?: boolean;
  /** Spaces per level. Default: `2`. */
  indent?: number;
}

const SHAPES: Record<MermaidShape, readonly [string, string]> = {
  square: ["[", "]"],
  rounded: ["(", ")"],
  circle: ["((", "))"],
  bang: [")", "("],
  cloud: ["))", "(("],
  hexagon: ["{{", "}}"],
};

const CLASS_NAME = /^[A-Za-z_][\w-]*$/;
const ICON = /^[\w -]+$/;

/**
 * Mermaid entity codes for the characters Mermaid would otherwise read as syntax, markup,
 * entities or formatting (Pele formats `*` and `_` even outside markdown strings). `#` comes
 * first, so the codes added afterwards are not encoded again.
 */
const ENTITIES: ReadonlyArray<readonly [RegExp, string]> = [
  [/#/g, "#35;"],
  [/"/g, "#quot;"],
  [/</g, "#lt;"],
  [/>/g, "#gt;"],
  [/'/g, "#39;"],
  [/`/g, "#96;"],
  [/\*/g, "#42;"],
  [/_/g, "#95;"],
];

/** Escapes a topic for a quoted Mermaid label. */
export function escapeLabel(text: string, markdown = false): string {
  let label = String(text).replace(/\r\n?/g, "\n").replace(/\t/g, " ");
  for (const [pattern, code] of ENTITIES) label = label.replace(pattern, code);
  if (markdown) {
    label = label
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim();
  } else {
    label = label.replace(/\s*\n\s*/g, " ").trim();
  }
  // An empty quoted label is a syntax error
  return label || " ";
}

function label(node: MindElixirNode, markdown: boolean): string {
  const text = escapeLabel(node.topic, markdown);
  if (!markdown) return `"${text}"`;
  let formatted = text;
  if (text.trim()) {
    if (node.style?.fontStyle === "italic") formatted = `*${formatted}*`;
    if (node.style?.fontWeight === "bold") formatted = `**${formatted}**`;
  }
  return `"\`${formatted}\`"`;
}

function classes(value: string | readonly string[] | undefined): string[] {
  if (value === undefined) return [];
  const names = (
    typeof value === "string" ? value.split(/\s+/) : [...value]
  ).filter(Boolean);
  for (const name of names) {
    if (!CLASS_NAME.test(name))
      throw new RangeError(
        `Invalid Mermaid class name: ${JSON.stringify(name)}`,
      );
  }
  return names;
}

function isNode(value: unknown): value is MindElixirNode {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MindElixirNode).topic === "string"
  );
}

/**
 * Converts Mind Elixir data (as returned by `mind.getData()`) or a single node and its
 * descendants to Mermaid `mindmap` source.
 *
 * @throws {TypeError} when the input is not a Mind Elixir node or data.
 * @throws {RangeError} when an option or a class name/icon returned by a callback is invalid.
 */
export function mindElixirToMermaid<N extends MindElixirNode>(
  data: { nodeData: N } | N,
  options: MermaidExportOptions<N> = {},
): string {
  const root = isNode(data)
    ? data
    : (data as MindElixirData | undefined)?.nodeData;
  if (!isNode(root))
    throw new TypeError(
      "Expected Mind Elixir data or a node with a string topic",
    );

  const indent = options.indent ?? 2;
  if (!Number.isInteger(indent) || indent < 1 || indent > 8) {
    throw new RangeError("indent must be an integer from 1 to 8");
  }
  const markdown = options.markdown === true;
  const rootShape = options.rootShape ?? "circle";
  const nodeShape = options.nodeShape ?? "rounded";
  for (const shape of [rootShape, nodeShape]) {
    if (!(shape in SHAPES))
      throw new RangeError(`Unknown Mermaid shape: ${JSON.stringify(shape)}`);
  }

  const lines = ["mindmap"];
  let count = 0;
  // Iterative, so a very deep map cannot overflow the call stack
  const stack: Array<{ node: MindElixirNode; depth: number }> = [
    { node: root, depth: 0 },
  ];
  while (stack.length > 0) {
    const { node: current, depth } = stack.pop() as {
      node: MindElixirNode;
      depth: number;
    };
    // Every node of the map has the caller's node type
    const node = current as N;
    if (!isNode(node))
      throw new TypeError("Every node must have a string topic");
    const shape =
      options.shape?.(node, depth) ?? (depth === 0 ? rootShape : nodeShape);
    const brackets = SHAPES[shape];
    if (!brackets)
      throw new RangeError(`Unknown Mermaid shape: ${JSON.stringify(shape)}`);
    const pad = " ".repeat(indent * (depth + 1));
    lines.push(
      `${pad}n${count++}${brackets[0]}${label(node, markdown)}${brackets[1]}`,
    );

    const icon = options.icon?.(node, depth);
    if (icon !== undefined) {
      if (!ICON.test(icon))
        throw new RangeError(`Invalid Mermaid icon: ${JSON.stringify(icon)}`);
      lines.push(`${pad}::icon(${icon})`);
    }
    const names = classes(options.className?.(node, depth));
    if (names.length > 0) lines.push(`${pad}:::${names.join(" ")}`);

    if (options.omitCollapsed && node.expanded === false) continue;
    const children = node.children ?? [];
    for (let i = children.length - 1; i >= 0; i--)
      stack.push({ node: children[i] as MindElixirNode, depth: depth + 1 });
  }
  return lines.join("\n");
}

export default mindElixirToMermaid;

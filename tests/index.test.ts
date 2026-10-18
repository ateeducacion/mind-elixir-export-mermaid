import { describe, expect, it } from "vitest";
import { render } from "pele";
import example from "mind-elixir/example";
import MindElixir, { type MindElixirData } from "mind-elixir";
import mindElixirToMermaid, {
  escapeLabel,
  mindElixirToMermaid as named,
  type MindElixirNode,
} from "../src/index.js";

/** Text of each node Pele draws, sorted (Pele does not draw them in source order). */
function renderedTopics(source: string): string[] {
  const { svg } = render(source);
  return svg
    .split('<g class="pele-node')
    .slice(1)
    .map((group) => {
      const inner = /<text[^>]*>([\s\S]*?)<\/text>/.exec(group)?.[1] ?? "";
      // Pele writes one <tspan> per line when a label has several, and wraps long labels
      const lines = [...inner.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map(
        (m) => m[1],
      );
      return (lines.length > 0 ? lines.join(" ") : inner)
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
    })
    .sort();
}

function topics(node: MindElixirNode): string[] {
  return [node.topic, ...(node.children ?? []).flatMap(topics)];
}

const tree: MindElixirNode = {
  topic: "Ciencias",
  children: [
    { topic: "Física", children: [{ topic: "Óptica" }] },
    { topic: "Química" },
  ],
};

describe("mindElixirToMermaid", () => {
  it("writes the hierarchy in order", () => {
    expect(mindElixirToMermaid({ nodeData: tree })).toBe(
      [
        "mindmap",
        '  n0(("Ciencias"))',
        '    n1("Física")',
        '      n2("Óptica")',
        '    n3("Química")',
      ].join("\n"),
    );
  });

  it("accepts a node as well as the data", () => {
    expect(mindElixirToMermaid(tree)).toBe(
      mindElixirToMermaid({ nodeData: tree }),
    );
    expect(named).toBe(mindElixirToMermaid);
  });

  it("renders with Pele, keeping every topic", () => {
    const source = mindElixirToMermaid(tree);
    expect(renderedTopics(source)).toEqual(topics(tree).sort());
  });

  it("converts Mind Elixir's own example map", () => {
    const source = mindElixirToMermaid(example);
    const expected = topics(example.nodeData).map((t) =>
      t.replace(/\s+/g, " ").trim(),
    );
    expect(source.split("\n")).toHaveLength(expected.length + 1);
    expect(renderedTopics(source)).toEqual(expected.sort());
  });

  it("escapes text that Mermaid would read as syntax, markup or entities", () => {
    const special = [
      "Hidrología & <clima> \"comillas\" 'simples'",
      "C# #quot; 100%",
      "a `b` c \\ d",
      "( ) [ ] { } :: :::",
      "数学 🌍 ñ",
      "**not bold** and _not italic_",
    ];
    const source = mindElixirToMermaid({
      topic: "Root",
      children: special.map((topic) => ({ topic })),
    });
    expect(source).not.toMatch(/[<>'`]/);
    expect(renderedTopics(source)).toEqual(["Root", ...special].sort());
  });

  it("writes empty topics as a blank label", () => {
    const source = mindElixirToMermaid({
      topic: "",
      children: [{ topic: "  " }],
    });
    expect(source).toBe('mindmap\n  n0((" "))\n    n1(" ")');
    expect(() => render(source)).not.toThrow();
  });

  it("turns line breaks into spaces by default", () => {
    expect(mindElixirToMermaid({ topic: "one\r\ntwo\n  three\tfour" })).toBe(
      'mindmap\n  n0(("one two three four"))',
    );
  });

  it("uses the requested shapes", () => {
    const source = mindElixirToMermaid(tree, {
      rootShape: "hexagon",
      nodeShape: "square",
      shape: (node) => (node.topic === "Química" ? "cloud" : undefined),
    });
    expect(source).toBe(
      [
        "mindmap",
        '  n0{{"Ciencias"}}',
        '    n1["Física"]',
        '      n2["Óptica"]',
        '    n3))"Química"((',
      ].join("\n"),
    );
    for (const shape of [
      "square",
      "rounded",
      "circle",
      "bang",
      "cloud",
      "hexagon",
    ] as const) {
      expect(() =>
        render(mindElixirToMermaid(tree, { nodeShape: shape })),
      ).not.toThrow();
    }
  });

  it("adds classes and icons", () => {
    const source = mindElixirToMermaid(tree, {
      className: (node, depth) =>
        depth === 1
          ? ["branch", `branch-${node.topic === "Física" ? 1 : 2}`]
          : undefined,
      icon: (node) => (node.topic === "Óptica" ? "fa fa-eye" : undefined),
    });
    expect(source).toBe(
      [
        "mindmap",
        '  n0(("Ciencias"))',
        '    n1("Física")',
        "    :::branch branch-1",
        '      n2("Óptica")',
        "      ::icon(fa fa-eye)",
        '    n3("Química")',
        "    :::branch branch-2",
      ].join("\n"),
    );
    expect(() => render(source)).not.toThrow();
    expect(mindElixirToMermaid(tree, { className: () => "a  b" })).toContain(
      ":::a b",
    );
    expect(mindElixirToMermaid(tree, { className: () => "" })).not.toContain(
      ":::",
    );
  });

  it("rejects class names and icons that would break the syntax", () => {
    expect(() =>
      mindElixirToMermaid(tree, { className: () => "bad)" }),
    ).toThrow(RangeError);
    expect(() =>
      mindElixirToMermaid(tree, { className: () => ["1st"] }),
    ).toThrow(RangeError);
    expect(() =>
      mindElixirToMermaid(tree, { icon: () => "fa)\nmindmap" }),
    ).toThrow(RangeError);
  });

  it("keeps bold, italic and line breaks as markdown strings", () => {
    const source = mindElixirToMermaid(
      {
        topic: "Root",
        style: { fontWeight: "bold" },
        children: [
          { topic: "Both", style: { fontWeight: "bold", fontStyle: "italic" } },
          { topic: "one\ntwo" },
          { topic: "keep *stars* and _underscores_" },
          { topic: "", style: { fontWeight: "bold" } },
        ],
      },
      { markdown: true },
    );
    expect(source).toBe(
      [
        "mindmap",
        '  n0(("`**Root**`"))',
        '    n1("`***Both***`")',
        '    n2("`one\ntwo`")',
        '    n3("`keep #42;stars#42; and #95;underscores#95;`")',
        '    n4("` `")',
      ].join("\n"),
    );
    const { svg } = render(source);
    expect(svg).toMatch(/font-weight="[^"]+"[^>]*><tspan[^>]*>Root</);
    expect(renderedTopics(source)).toContain("keep *stars* and _underscores_");
  });

  it("can leave out the children of folded nodes", () => {
    const folded: MindElixirNode = {
      topic: "Root",
      children: [
        { topic: "Folded", expanded: false, children: [{ topic: "Hidden" }] },
      ],
    };
    expect(mindElixirToMermaid(folded)).toContain("Hidden");
    expect(mindElixirToMermaid(folded, { omitCollapsed: true })).toBe(
      'mindmap\n  n0(("Root"))\n    n1("Folded")',
    );
  });

  it("uses the requested indent", () => {
    expect(mindElixirToMermaid(tree, { indent: 4 }).split("\n")[2]).toBe(
      '        n1("Física")',
    );
    for (const indent of [0, 9, 1.5]) {
      expect(() => mindElixirToMermaid(tree, { indent })).toThrow(RangeError);
    }
  });

  it("handles large and very deep maps", () => {
    const wide: MindElixirNode = {
      topic: "Root",
      children: Array.from({ length: 50 }, (_, i) => ({
        topic: `Branch ${i}`,
        children: Array.from({ length: 20 }, (_, j) => ({
          topic: `Idea ${i}.${j}`,
        })),
      })),
    };
    const source = mindElixirToMermaid(wide);
    expect(source.split("\n")).toHaveLength(1 + 1 + 50 + 1000);
    expect(renderedTopics(source)).toHaveLength(1051);

    let deep: MindElixirNode = { topic: "leaf" };
    for (let i = 0; i < 20000; i++) deep = { topic: `n${i}`, children: [deep] };
    expect(mindElixirToMermaid(deep).split("\n")).toHaveLength(20002);
  });

  it("rejects input that is not a Mind Elixir map", () => {
    for (const value of [
      null,
      undefined,
      42,
      "x",
      {},
      { nodeData: {} },
      { nodeData: { topic: 1 } },
    ]) {
      expect(() => mindElixirToMermaid(value as never)).toThrow(TypeError);
    }
    expect(() =>
      mindElixirToMermaid({ topic: "Root", children: [{} as MindElixirNode] }),
    ).toThrow(TypeError);
  });

  it("rejects unknown shapes", () => {
    expect(() =>
      mindElixirToMermaid(tree, { nodeShape: "star" as never }),
    ).toThrow(RangeError);
    expect(() =>
      mindElixirToMermaid(tree, { shape: () => "star" as never }),
    ).toThrow(RangeError);
  });
});

describe("with Mind Elixir's types", () => {
  it("passes the caller's node type to the callbacks", () => {
    const data: MindElixirData = MindElixir.new("Science");
    data.nodeData.children = [
      { id: "a", topic: "Red", branchColor: "#c0392b", tags: ["book"] },
    ];
    // Mind Elixir's own fields are available without casts
    const source = mindElixirToMermaid(data, {
      className: (node) => (node.branchColor === "#c0392b" ? "red" : undefined),
      icon: (node) => (node.tags?.includes("book") ? "fa fa-book" : undefined),
    });
    expect(source).toContain(":::red");
    expect(source).toContain("::icon(fa fa-book)");
  });
});

describe("escapeLabel", () => {
  it("encodes # first, so the entity codes are not encoded twice", () => {
    expect(escapeLabel('#"')).toBe("#35;#quot;");
  });

  it("keeps line breaks only in markdown mode", () => {
    expect(escapeLabel(" a \n b ")).toBe("a b");
    expect(escapeLabel(" a \n b ", true)).toBe("a\nb");
  });

  it("returns a blank label for empty text", () => {
    expect(escapeLabel("")).toBe(" ");
    expect(escapeLabel("\n", true)).toBe(" ");
  });
});

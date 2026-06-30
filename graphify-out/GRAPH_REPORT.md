# Graph Report - .  (2026-06-30)

## Corpus Check
- Corpus is ~4,273 words - fits in a single context window. You may not need a graph.

## Summary
- 72 nodes · 61 edges · 17 communities (9 shown, 8 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Development Dependencies|Development Dependencies]]
- [[_COMMUNITY_Frontend Package & Dependencies|Frontend Package & Dependencies]]
- [[_COMMUNITY_Stellar Shield Project & Documentation|Stellar Shield Project & Documentation]]
- [[_COMMUNITY_ZK Architecture & Scope|ZK Architecture & Scope]]
- [[_COMMUNITY_Package Scripts|Package Scripts]]
- [[_COMMUNITY_App Layout & Fonts|App Layout & Fonts]]
- [[_COMMUNITY_TypeScript Scope|TypeScript Scope]]
- [[_COMMUNITY_Agent Rules & Guides|Agent Rules & Guides]]
- [[_COMMUNITY_ESLint Configuration|ESLint Configuration]]
- [[_COMMUNITY_Next.js Configuration|Next.js Configuration]]
- [[_COMMUNITY_PostCSS Configuration|PostCSS Configuration]]
- [[_COMMUNITY_File Icon Asset|File Icon Asset]]
- [[_COMMUNITY_Globe Icon Asset|Globe Icon Asset]]
- [[_COMMUNITY_Window Icon Asset|Window Icon Asset]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `scripts` - 5 edges
3. `MVP Scope Decision` - 4 edges
4. `Central Orchestrator Pattern` - 3 edges
5. `Stellar Shield Platform` - 3 edges
6. `Frontend Getting Started` - 3 edges
7. `paths` - 2 edges
8. `ZK Stack Selection` - 2 edges
9. `ZK Credentials & Identity (Noir)` - 2 edges
10. `Private Payroll (RISC Zero + Noir)` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Frontend Getting Started` --conceptually_related_to--> `Stellar Shield Platform`  [INFERRED]
  frontend/README.md → README.md
- `Frontend Getting Started` --references--> `Next.js Logo SVG`  [INFERRED]
  frontend/README.md → frontend/public/next.svg
- `Frontend Getting Started` --references--> `Vercel Logo SVG`  [INFERRED]
  frontend/README.md → frontend/public/vercel.svg
- `Stellar Shield Platform` --references--> `ZK Stack Selection`  [EXTRACTED]
  README.md → ADR.md
- `Stellar Shield Platform` --references--> `MVP Success Criteria`  [EXTRACTED]
  README.md → TRD.md

## Import Cycles
- None detected.

## Communities (17 total, 8 thin omitted)

### Community 0 - "TypeScript Configuration"
Cohesion: 0.12
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 1 - "Development Dependencies"
Cohesion: 0.22
Nodes (9): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+1 more)

### Community 2 - "Frontend Package & Dependencies"
Cohesion: 0.25
Nodes (7): dependencies, next, react, react-dom, name, private, version

### Community 3 - "Stellar Shield Project & Documentation"
Cohesion: 0.33
Nodes (6): ZK Stack Selection, Next.js Logo SVG, Vercel Logo SVG, Frontend Getting Started, Stellar Shield Platform, MVP Success Criteria

### Community 4 - "ZK Architecture & Scope"
Cohesion: 0.60
Nodes (5): Central Orchestrator Pattern, ZK Credentials & Identity (Noir), Private Payroll (RISC Zero + Noir), Private DAO Voting (Circom), MVP Scope Decision

### Community 5 - "Package Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 6 - "App Layout & Fonts"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

## Knowledge Gaps
- **49 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `compilerOptions` connect `TypeScript Configuration` to `TypeScript Scope`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Development Dependencies` to `Frontend Package & Dependencies`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `scripts` connect `Package Scripts` to `Frontend Package & Dependencies`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TypeScript Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
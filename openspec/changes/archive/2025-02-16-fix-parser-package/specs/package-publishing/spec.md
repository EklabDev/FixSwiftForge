## ADDED Requirements

### Requirement: Publishable scoped npm package
The deliverable SHALL be a publishable npm package with the scoped name `@eklabdev/fix-swift-forge`. Consumers SHALL be able to install it with `npm install @eklabdev/fix-swift-forge` (or equivalent with yarn/pnpm). The package SHALL declare a main entry point and SHALL expose the public API for parser initialization, parse, validate, Message Builder, and masking.

#### Scenario: Install via npm
- **WHEN** a user runs `npm install @eklabdev/fix-swift-forge` in a Node.js or TypeScript project
- **THEN** the package SHALL be installed and SHALL be requireable/importable from the declared entry point(s)

#### Scenario: Public API is stable and documented
- **WHEN** a consumer imports the package
- **THEN** the public API for creating a parser (by version or custom XML), parsing, validation, Message Builder, and masking SHALL be available and SHALL match the behavior specified in the other capability specs

### Requirement: TypeScript support
The package SHALL provide TypeScript types (e.g. via bundled `.d.ts` or `types` in package.json). Types SHALL cover the public API so that consumers get type checking and inference when using the package in TypeScript.

#### Scenario: TypeScript project uses package with types
- **WHEN** a TypeScript project imports and uses @eklabdev/fix-swift-forge
- **THEN** the compiler SHALL resolve types for the public API (parser, parse result, builder, validation result, etc.) without requiring separate @types package

### Requirement: Bundled FIX XML included
The package SHALL include the bundled FIX XML definition files for versions 4.0, 4.1, 4.2, 4.3, 4.4, 5.0, 5.0 SP1, and 5.0 SP2 so that consumers can initialize the parser by version without supplying their own XML. The files SHALL be shipped inside the package and SHALL be resolvable by the parser when initializing by version identifier.

#### Scenario: Initialize parser by version without external XML
- **WHEN** the user initializes the parser with a bundled version identifier (e.g. "4.4", "5.0sp2") and does not supply any XML
- **THEN** the system SHALL load the corresponding XML from within the package and SHALL succeed without network or filesystem access to external definitions

### Requirement: Package structure and entry points
The package SHALL have a clear structure: library code (e.g. under `src/` or `dist/`), bundled XML under a dedicated directory (e.g. `definitions/` or `xml/`), and `package.json` with correct `main`, `types`, and `exports` (or equivalent) so that Node and bundlers can resolve the package and its types.

#### Scenario: Default import resolves to parser factory
- **WHEN** the user does `require('@eklabdev/fix-swift-forge')` or `import ... from '@eklabdev/fix-swift-forge'`
- **THEN** the default or main export SHALL provide the API to create a parser (e.g. `createParser(options)` or `FIXParser.fromVersion(...)`) and related public types

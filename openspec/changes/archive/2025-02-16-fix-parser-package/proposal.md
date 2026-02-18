# Proposal: FixSwiftForge — TypeScript FIX Parser Package

## Why

There is no good FIX (Financial Information eXchange) message parser for TypeScript. FIX definitions are expressed in XML, and organizations extend or customize them; existing solutions often hard-code a single spec version instead of letting users supply their own XML. This change delivers an npm package **@eklabdev/fix-swift-forge** that fills that gap: a type-safe, XML-driven FIX parser for TypeScript that supports custom definitions, parsing to JSON, validation, Message Builder, and field masking.

## What Changes

- **New npm package "@eklabdev/fix-swift-forge"** — Publish a scoped package installable via `npm install @eklabdev/fix-swift-forge`, with clear public API and TypeScript types.
- **Bundled FIX XML definitions** — Include official FIX XML for **4.0, 4.1, 4.2, 4.3, 4.4, 5.0, 5.0 SP1, and 5.0 SP2** for easy reference and so users can initialize the parser to a specific version (e.g. FIX 4.4 or 5.0 SP2) without supplying their own XML.
- **XML-driven FIX parser** — Allow initialization with a bundled version above or with a custom FIX definition (XML) for organization-specific extensions.
- **Parse FIX → JSON** — Accept raw FIX messages and parse them to a JSON structure so developers can read and work with data in a familiar format.
- **Type-safe, definition-driven types** — Types are inferred dynamically from the loaded XML definition so that message structures, fields, and values are type-safe in TypeScript.
- **Validation** — For every message type known to the parser, support validation of both raw FIX messages and parsed JSON against the definition.
- **Message Builder** — For all known message types, provide an open API to manipulate fields and construct FIX messages (fluent, type-aware), including building and attaching the correct **checksum**.
- **Field masking** — Support masking of user-predefined fields (e.g. sensitive data) for logging or auditing without exposing full values.

## Capabilities

### New Capabilities

- `xml-definition`: Load and interpret FIX protocol definitions from XML; includes bundled definitions for FIX 4.0, 4.1, 4.2, 4.3, 4.4, 5.0, 5.0 SP1, 5.0 SP2 and support for custom XML; foundation for message structure and type inference.
- `message-parsing`: Parse raw FIX messages to JSON with structure and types inferred from the loaded XML definition.
- `message-validation`: Validate raw FIX message strings and parsed JSON against the loaded definition for all known message types.
- `message-builder`: Message Builder — open API for all known message types to manipulate fields and construct FIX messages (including checksum calculation and attachment) with type safety derived from the definition.
- `field-masking`: Mask values for user-configured fields (e.g. for logs or audit trails).
- `package-publishing`: @eklabdev/fix-swift-forge as a publishable scoped npm package with correct structure, entry points, bundled FIX XML (4.0–5.0 SP2), and TypeScript support for `npm install`.

### Modified Capabilities

- _(None — no existing specs in this repo.)_

## Impact

- **New codebase** — New package (@eklabdev/fix-swift-forge) as the primary deliverable of this repo; no existing production code is modified.
- **Bundled assets** — FIX XML files for 4.0, 4.1, 4.2, 4.3, 4.4, 5.0, 5.0 SP1, 5.0 SP2 shipped with the package for easy initialization by version.
- **Consumers** — TypeScript/JavaScript projects that need to parse, validate, build, or mask FIX messages; teams using standard FIX versions or custom/extended FIX XML.
- **Dependencies** — XML parsing for FIX definitions; behavior is driven by the chosen bundled version or supplied custom XML.
- **APIs** — Public API surface: parser initialization (by version or custom XML), parse, validate, Message Builder (manipulation + checksum), and masking configuration; all typed from the loaded definition where applicable.

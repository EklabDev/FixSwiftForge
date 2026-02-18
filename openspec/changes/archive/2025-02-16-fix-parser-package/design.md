# Design: @eklabdev/fix-swift-forge

## Context

FIX (Financial Information eXchange) messages are tag=value delimited; protocol semantics (fields, message types, enums) are defined in XML (e.g. FIX Repository format). Organizations often extend or customize these definitions. There is no strong, type-safe FIX parser for TypeScript that supports arbitrary XML definitions and standard versions out of the box. This design describes how to implement **@eklabdev/fix-swift-forge**: a TypeScript-first, XML-driven parser with bundled FIX 4.0–5.0 SP2 definitions, parse-to-JSON, validation, Message Builder (with checksum), and field masking. Stakeholders are Node/TS applications that consume or produce FIX messages; constraints are TypeScript type safety derived from the loaded definition and a clear, open API for all known message types.

## Goals / Non-Goals

**Goals:**

- Ship a scoped npm package `@eklabdev/fix-swift-forge` installable via `npm install @eklabdev/fix-swift-forge`.
- Bundle official FIX XML for 4.0, 4.1, 4.2, 4.3, 4.4, 5.0, 5.0 SP1, 5.0 SP2 and allow parser initialization by version or by custom XML.
- Parse raw FIX messages to JSON with structure and types informed by the loaded XML definition.
- Provide type-safe APIs where possible (dynamic inference from XML or generated types; no hard-coded single FIX version).
- Validate raw FIX strings and parsed JSON against the loaded definition for all known message types.
- Message Builder: open API for all known message types to set/update fields and produce a valid FIX string including correct checksum (Tag 10).
- Support configurable field masking (e.g. for logging) for user-specified tags.

**Non-Goals:**

- Real-time / session layer (e.g. FIX engine, logon, sequencing); focus is parsing, validation, building, and masking.
- Supporting non-XML definition formats in v1.
- Implementing every FIX extension or proprietary schema; custom XML is supported so orgs can extend.

## Decisions

### 1. Package layout and bundled XML

- **Decision:** Single package with `src/` for library code, a dedicated directory (e.g. `definitions/` or `xml/`) for bundled FIX XML files, and `package.json` exports pointing at the main entry (and optionally types).
- **Rationale:** Keeps definitions as first-class assets; consumers can `require`/import by version or path if needed. Alternative: ship XML in a separate `@eklabdev/fix-swift-forge-definitions` package; rejected for v1 to avoid extra install and version skew.
- **Bundled versions:** One XML file (or one per version) for FIX 4.0, 4.1, 4.2, 4.3, 4.4, 5.0, 5.0 SP1, 5.0 SP2. Naming convention (e.g. `fix.4.0.xml`, `fix.5.0.sp2.xml`) to be consistent and discoverable.

### 2. XML definition format and parsing

- **Decision:** Support the FIX Repository-style XML schema used by the official FIX specifications (fields, messages, components, etc.). Parse XML at runtime when initializing the parser; produce an in-memory definition model (fields by tag, message types, component inclusion, data types).
- **Rationale:** Aligns with official FIX XML; allows custom/org-specific XML that follows the same schema. Alternative: custom DSL; rejected to avoid maintaining a separate format.
- **Implementation note:** Use a standard XML parser (e.g. fast-xml-parser or similar) and map elements to an internal definition model used by parsing, validation, and Message Builder.

### 3. Parser initialization API

- **Decision:** Two entry points: (1) initialize by version identifier (e.g. `'4.4'`, `'5.0'`, `'5.0sp1'`, `'5.0sp2'`) loading the corresponding bundled XML; (2) initialize with custom XML (string or buffer or path). Both return a parser instance bound to that definition.
- **Rationale:** Covers “use standard FIX 4.4” and “use our custom XML” without forcing users to ship XML themselves for standard versions.

### 4. Type safety and inference from XML

- **Decision:** Prefer a design that allows type safety “as much as possible” given runtime XML: (a) generic types for parsed JSON (e.g. `ParsedMessage`) and builder result; (b) optional codegen step that emits TS types from a given XML for stricter per-field typing. Default behavior: runtime definition drives validation and structure; TypeScript types reflect “message with tag/value map” and known required/optional fields from definition where feasible.
- **Rationale:** “Dynamically infer from XML” in the proposal is satisfied by runtime structure; optional codegen improves DX without blocking v1. Alternative: full codegen-only; rejected for v1 to keep setup simple and support arbitrary custom XML without pre-generation.

### 5. Parse FIX → JSON

- **Decision:** Parser instance exposes `parse(raw: string): ParsedMessage` (or equivalent). Output is a JSON-friendly structure: message type (MsgType), fields as tag or name-keyed values, components/groups represented in a consistent way (e.g. nested arrays for repeating groups). Structure and field names/types follow the loaded definition.
- **Rationale:** Gives developers a consistent, definition-driven representation for all FIX versions and custom XML.

### 6. Validation (raw and JSON)

- **Decision:** Provide `validateRaw(raw: string)` and `validateJson(obj: ParsedMessage)` (or similar). Both use the loaded definition to check required fields, data types, and allowed values/enums where defined. Return a result type (e.g. valid + optional warnings, or list of errors).
- **Rationale:** Supports pre-send checks and post-parse verification for all known message types.

### 7. Message Builder API and checksum

- **Decision:** Message Builder: open API for every message type present in the definition. For each, expose a way to create a builder (e.g. `parser.getBuilder('D')` for NewOrderSingle), set required and optional fields via method or key-value API, then call `build()` to produce the FIX string. Checksum (Tag 10): computed over the message body (after BodyLength, before CheckSum), three-digit modulo 256; always appended by the builder so callers do not set Tag 10 manually.
- **Rationale:** “Open API for manipulation and build checksum” is met by per-message-type builders that handle field order and checksum internally. Alternative: single generic builder with no message-type awareness; rejected to keep type safety and validation aligned with the definition.

### 8. Field masking

- **Decision:** Configurable list of tag numbers (or field names) to mask. When producing a “masked” view of a message (e.g. for logging), replace values of those fields with a fixed placeholder (e.g. `***` or configurable). Apply to both raw FIX string and parsed JSON output if we expose a “toLoggable” or “mask” helper.
- **Rationale:** Keeps sensitive data out of logs while preserving structure; user-predefined list matches proposal.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Official FIX XML may vary in structure across 4.0 vs 5.0 | Normalize to a single internal definition model; add version-specific adapters if needed. |
| Large XML files may slow startup when loading custom definitions | Parse once at init; cache in-memory model. Consider lazy-loading for bundled versions if needed. |
| Type safety is best-effort without codegen | Document patterns (generics, optional codegen); iterate on codegen in a later iteration if needed. |
| Checksum and field order differ by FIX version | Builder must follow the definition’s message layout and the standard rules for BodyLength (Tag 9) and CheckSum (Tag 10) for the chosen version. |

## Migration Plan

- **New package:** No migration of existing code. Release as a new scoped package `@eklabdev/fix-swift-forge`.
- **Versioning:** Use semantic versioning; initial release as 1.0.0 after feature-complete and tested.
- **Rollback:** Consumers can pin the previous version or remove the dependency; no in-repo rollback needed.

## Open Questions

- Exact naming of bundled XML files and version keys (e.g. `'5.0sp1'` vs `'5.0-sp1'`) to be fixed in implementation.
- Whether to ship a small CLI (e.g. parse/validate a message from stdin) in v1 or defer.

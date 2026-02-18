## Why

The package currently only supports FIX protocol messages. In many mid-office and payment systems, **SWIFT messages** (ISO 15022 MT and ISO 20022 MX) are equally critical — they power securities settlement, payment instructions, confirmations, and corporate actions. Teams working with both FIX and SWIFT need a single TypeScript library rather than stitching together separate tools or falling back to Java/C#. Adding MT and MX support makes `@eklabdev/fix-swift-forge` a comprehensive financial messaging toolkit.

## What Changes

- **New ISO 15022 (MT) parser** — Parse raw SWIFT MT messages (**all MT types**, categories 1–9) into a structured JSON representation, resolving blocks, fields, and sub-fields per the MT specification.
- **New ISO 20022 (MX) parser** — Parse raw MX messages (**all ISO 20022 MX message types**) into a structured JSON representation, mapping XML elements to a typed model.
- **MT Message Builder** — Fluent API to construct MT messages field-by-field, with automatic block structure and formatting.
- **MX Message Builder** — Fluent API to construct MX messages element-by-element, producing valid ISO 20022 XML output.
- **MT validation** — Validate raw MT strings and parsed MT JSON against MT field rules (field format, mandatory/optional, allowed values), including runtime validation via **Zod** schemas.
- **MX validation** — Validate raw MX XML and parsed MX JSON against the ISO 20022 message schema (XSD-driven or built-in rules), including runtime validation via **Zod** schemas.
- **TypeScript type definitions for all MT and MX message types** — Generate or maintain **per-message-type** TypeScript interfaces (e.g. `MT103Message`, `Pacs008Message`) for every bundled MT and MX type, so consumers get full type safety when parsing or building.
- **MT ↔ MX interconversion** — Convert between MT and MX representations for **all message type pairs** that have defined mappings, applying field-level translation rules.
- **MT/MX field masking** — Extend existing masking to work on MT and MX messages (raw and parsed), using the same `MaskConfig` pattern.

## Capabilities

### New Capabilities
- `mt-parsing`: Parse raw SWIFT MT messages into structured JSON (blocks 1–5, fields, sub-fields).
- `mx-parsing`: Parse raw ISO 20022 MX XML messages into structured JSON.
- `mt-builder`: Fluent builder API for constructing MT messages.
- `mx-builder`: Fluent builder API for constructing MX messages (outputs valid XML).
- `mt-validation`: Validate MT messages (raw and parsed) against MT field specifications.
- `mx-validation`: Validate MX messages (raw and parsed) against ISO 20022 schema rules.
- `mt-mx-conversion`: Interconvert between MT and MX for supported message type pairs.
- `swift-masking`: Field masking for MT and MX messages (raw and parsed).

### Modified Capabilities
_(none — all existing FIX capabilities remain unchanged)_

## Impact

- **New source files**: `src/mt/` and `src/mx/` modules for parsing, building, validation, and conversion.
- **New definitions**: Bundled **all** MT field specifications (categories 1–9) and **all** ISO 20022 MX schema definitions under `definitions/swift/`.
- **Public API expansion**: New exports from `src/index.ts` — `MTParser`, `MXParser`, `MTBuilder`, `MXBuilder`, `convertMtToMx`, `convertMxToMt`, and related types.
- **Types**: New interfaces for `ParsedMTMessage`, `ParsedMXMessage`, `MTValidationResult`, `MXValidationResult`, `MTFieldDef`, `MXElementDef`, conversion mapping types; plus **per-message-type** TypeScript definitions for all MT and MX types (e.g. `MT103Message`, `MT202Message`, `Pacs008Message`, `Camt053Message`).
- **Zod**: Add **zod** as a dependency; generate or maintain Zod schemas for all MT and MX message types; validators SHALL use Zod for runtime validation and map Zod errors to `ValidationResult`.
- **Dependencies**: Add **zod**; may add an XML builder dependency (or reuse `fast-xml-parser`'s `XMLBuilder`) for MX output.
- **Package size**: Will grow with bundled MT specs and MX schema definitions.
- **No breaking changes**: Existing FIX API remains untouched.

## Context

`@eklabdev/fix-swift-forge` currently supports only FIX protocol messages (FIX 4.0–5.0 SP2). The package provides parsing, validation, message building, and field masking via an XML-driven definition model.

SWIFT messages come in two flavours:

- **ISO 15022 (MT)** — Text-based, block-structured messages (e.g. MT103 payment, MT202 bank transfer, MT940 statement). Each message has 5 blocks: Basic Header (1), Application Header (2), User Header (3), Text (4), and Trailer (5). Block 4 contains tagged fields like `:20:`, `:32A:`, etc.
- **ISO 20022 (MX)** — XML-based messages following XSD schemas (e.g. `pacs.008.001.08`, `camt.053.001.08`). Messages use the ISO 20022 Business Application Header (BAH) plus a document body.

The existing FIX architecture (definition → parser → validator → builder → masking) provides a pattern to follow, but MT and MX have fundamentally different formats (text blocks vs. XML) so each needs its own parser/builder, with a shared validation and masking pattern.

## Goals / Non-Goals

**Goals:**
- Parse raw MT messages (text) into structured JSON with block/field decomposition.
- Parse raw MX messages (XML) into structured JSON with element mapping.
- Build MT messages from a fluent API producing correctly formatted SWIFT text.
- Build MX messages from a fluent API producing valid ISO 20022 XML.
- Validate MT and MX messages against their respective field/schema rules.
- Convert between MT and MX for **all** message type pairs that have defined mappings.
- Apply field masking to MT and MX messages (raw and parsed).
- Support **all** SWIFT MT message types (categories 1–9) and **all** ISO 20022 MX message types.
- Keep existing FIX API completely untouched.

**Non-Goals:**
- Full SWIFT network integration (FIN connectivity, SWIFT Alliance, etc.).
- SWIFT authentication or PKI handling.
- Real-time message routing or queue management.
- Replacing or modifying the existing FIX parser, validator, or builder.

## Decisions

### 1. Module layout: `src/mt/` and `src/mx/`

**Decision:** Create separate `src/mt/` and `src/mx/` directories, each containing their own parser, builder, validator, and types. A shared `src/swift/` directory holds conversion logic and shared utilities (masking adapter).

**Rationale:** MT (text-based) and MX (XML-based) are fundamentally different formats. Separating them keeps each module focused. Shared conversion logic sits in `src/swift/` which depends on both.

**Alternatives considered:**
- Single `src/swift/` with everything — rejected because MT and MX parsing are too different to share a single parser approach.
- Extending the existing FIX parser — rejected because MT/MX have completely different structure (no tag=value pairs).

### 2. MT message model: block-based structure

**Decision:** Represent a parsed MT message as:
```
ParsedMTMessage {
  type: string            // e.g. "103", "202", "940"
  block1: BasicHeader     // sender BIC, session, sequence
  block2: AppHeader       // I/O indicator, message type, receiver BIC, priority, delivery
  block3: UserHeader      // optional service codes (key-value pairs)
  block4: MTField[]       // array of { tag, value, subFields? }
  block5: TrailerBlock    // checksum, MAC, etc.
  raw: string             // original message text
}
```

**Rationale:** The 5-block structure is the fundamental MT layout. Block 4 fields follow the `:tag:value` pattern. Preserving the raw text enables round-trip fidelity.

### 3. MX message model: element tree mapped to JSON

**Decision:** Parse MX XML using `fast-xml-parser` (already a dependency) into a typed structure:
```
ParsedMXMessage {
  type: string              // e.g. "pacs.008.001.08"
  namespace: string         // ISO 20022 namespace URI
  header: MXAppHeader       // Business Application Header
  document: Record<string, any>  // message body as nested JSON
  raw: string               // original XML text
}
```

**Rationale:** Reusing `fast-xml-parser` avoids adding another XML dependency. The MX format is already XML, so mapping to JSON is straightforward. The typed `MXAppHeader` captures the BAH fields, while the document body remains flexible (validated separately).

### 4. MT field definitions: bundled JSON specs

**Decision:** Bundle MT field specifications as JSON files under `definitions/swift/mt/`. Each file defines the fields, their format patterns (e.g. `16x` = 16 alphanumeric chars), mandatory/optional status, and allowed values for a specific MT type.

**Rationale:** MT field rules are well-defined by SWIFT but not distributed as machine-readable schemas (unlike MX XSD). Encoding them as JSON provides a definition-driven approach consistent with the FIX XML pattern.

### 5. MX schema definitions: bundled XSD-derived specs

**Decision:** Bundle MX message definitions as JSON files under `definitions/swift/mx/`, derived from ISO 20022 XSD schemas. These capture element names, types, cardinality, and constraints.

**Rationale:** The full XSD files are large and validation via XSD in JavaScript is slow. Pre-processing XSDs into a lightweight JSON model enables fast validation without a heavy XSD engine.

### 6. MT ↔ MX conversion: mapping table approach

**Decision:** Define conversion mappings as JSON configuration files under `definitions/swift/mappings/`. Each mapping file describes the field-level correspondence between an MT type and its MX counterpart (e.g. MT103 `:32A:` → `pacs.008` `IntrBkSttlmAmt` + `IntrBkSttlmDt`).

**Rationale:** Field-level mappings are specific to each MT/MX pair and can be complex (one MT field may split into multiple MX elements, or vice versa). Externalising them as data (not code) makes them maintainable and extensible.

**Alternatives considered:**
- Hardcoded conversion functions — rejected because they're harder to maintain and extend.
- Rely on SWIFT's official mapping tables — these aren't freely available as machine-readable files; we encode the well-known mappings ourselves.

### 7. Builder API pattern: consistent with FIX builder

**Decision:** `MTBuilder` and `MXBuilder` follow the same fluent pattern as the existing `MessageBuilder`:
- `MTBuilder`: `.setField(tag, value)`, `.setBlock1(...)`, `.build()` → SWIFT text string.
- `MXBuilder`: `.setElement(path, value)`, `.setHeader(...)`, `.build()` → XML string.

**Rationale:** Consistency with the FIX builder gives users a familiar API across all message types.

### 8. Validation approach: definition-driven + Zod

**Decision:** Both MT and MX validators load their respective definitions and:
- Use **Zod** schemas (one per message type) for runtime validation of parsed structures. Zod provides type inference, composable schemas, and clear error paths.
- Map Zod parse failures to the existing `ValidationResult` type (valid, errors[], warnings[]) so the consumer API stays consistent with FIX validation.
- MT: field format (regex from spec), mandatory fields, field ordering, block structure — encoded as Zod schemas derived from MT definition JSON.
- MX: element presence, type constraints, cardinality — encoded as Zod schemas derived from MX schema definition JSON.

**Rationale:** SWIFT messages are more rigid than FIX (fixed block layout, well-defined field sets per message type). Per-message-type Zod schemas give compile-time types and runtime validation in one place; reusing `ValidationResult` keeps the API consistent.

**Alternatives considered:** Custom validation only (no Zod) — rejected because Zod gives type inference and a single source of truth for structure + validation.

### 9. TypeScript type definitions: per-message-type for all MT and MX

**Decision:** Generate or maintain **TypeScript interface definitions for every bundled MT and MX message type** (e.g. `MT103Message`, `MT202Message`, `Pacs008Message`, `Camt053Message`). Types SHALL align with the Zod schemas so that `z.infer<typeof MT103Schema>` matches `MT103Message`. Types live under `src/mt/types/` and `src/mx/types/` (or generated into a single types file per category/area).

**Rationale:** SWIFT message structures are fixed per type; per-message-type interfaces give consumers full type safety when parsing or building, and pair naturally with Zod for runtime validation.

## Risks / Trade-offs

- **[Risk] MT field specs are manually curated** → Mitigation: Obtain or generate definitions for all MT types (categories 1–9) from SWIFT standards; include version identifiers so specs can be updated.
- **[Risk] MX schema complexity** → Mitigation: Pre-process XSDs into lightweight JSON; don't attempt full XSD validation in-process.
- **[Risk] MT ↔ MX conversion is lossy for edge cases** → Mitigation: Document known limitations per mapping. Return warnings in conversion result for fields that couldn't be mapped.
- **[Risk] Package size growth from bundled definitions** → Mitigation: Keep definition JSON compact. Offer tree-shaking entry points (`@eklabdev/fix-swift-forge/mt`, `/mx`) in a future version if needed.
- **[Trade-off] Reusing `fast-xml-parser` for MX** → It's already a dependency so no new dep, but its API may require careful configuration for ISO 20022 namespace handling.
- **[Risk] Large number of MT/MX types** → Mitigation: Generate TypeScript types and Zod schemas from definition JSON (codegen) rather than hand-writing each; document generation script and regeneration steps.

## Open Questions

- Source for full MT field definitions (categories 1–9): SWIFT standards documentation, third-party spec repository, or generated from official SWIFT MT specification.
- Source for full ISO 20022 MX schema definitions: ISO 20022 registry, XSD downloads, or pre-processed JSON from official schemas.
- Should MT ↔ MX conversion mappings be bundled for all pairs that have official SWIFT/ISO mapping documentation, or loaded on demand?

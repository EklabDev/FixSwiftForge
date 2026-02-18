# Tasks: @eklabdev/fix-swift-forge

## 1. Package setup

- [x] 1.1 Create package structure with `package.json` scoped as `@eklabdev/fix-swift-forge` (name, main, types, exports)
- [x] 1.2 Add `src/` for library code and configure TypeScript (tsconfig, build output to `dist/` or equivalent)
- [x] 1.3 Add XML parsing dependency (e.g. fast-xml-parser) for FIX definition loading
- [x] 1.4 Declare main entry and types so default import exposes parser factory / public API

## 2. Bundled FIX XML definitions

- [x] 2.1 Create `definitions/` (or `xml/`) directory for bundled FIX XML files
- [x] 2.2 Obtain and add official FIX XML for 4.0, 4.1, 4.2, 4.3, 4.4 (FIX 4.x)
- [x] 2.3 Obtain and add official FIX XML for 5.0, 5.0 SP1, 5.0 SP2 (FIX 5.x)
- [x] 2.4 Define version identifier mapping (e.g. "4.4", "5.0sp2") to bundled file paths and document in code or README

## 3. XML definition loader and in-memory model

- [x] 3.1 Parse FIX Repository–style XML into an in-memory definition model (fields by tag, data types, enums)
- [x] 3.2 Build message type registry and component/group structure from XML for each definition
- [x] 3.3 Expose definition model API used by parse, validate, and Message Builder (single source of truth)
- [x] 3.4 Handle malformed or unsupported XML with clear initialization errors

## 4. Parser initialization

- [x] 4.1 Implement initialization by version identifier: load corresponding bundled XML and build definition model
- [x] 4.2 Implement initialization with custom XML (string, buffer, or resolvable path)
- [x] 4.3 Return a parser instance bound to the loaded definition for all subsequent operations
- [x] 4.4 Fail with clear error for unknown version identifier or invalid custom XML

## 5. Message parsing (FIX → JSON)

- [x] 5.1 Implement `parse(raw: string)` that returns a JSON-serializable structure (message type, fields, components/groups)
- [x] 5.2 Use definition model for field names, types, and message layout in parsed output
- [x] 5.3 Represent repeating groups in a consistent way (e.g. nested arrays)
- [x] 5.4 Define behavior for malformed or partially interpretable messages (error or best-effort with warnings)

## 6. Validation

- [x] 6.1 Implement `validateRaw(raw: string)`: check required fields, types, enums against definition; return valid/invalid and list of errors
- [x] 6.2 Implement `validateJson(obj)`: validate parsed message object against definition with same rules
- [x] 6.3 Support validation for every message type present in the loaded definition
- [x] 6.4 Return deterministic result type (e.g. `{ valid: boolean, errors?: [...], warnings?: [...] }`)

## 7. Message Builder

- [x] 7.1 Implement API to get a builder for a message type (e.g. `getBuilder(msgType)`); fail for unknown message type
- [x] 7.2 Implement fluent/type-aware API to set, update, and clear fields (by tag or name) per message type
- [x] 7.3 Compute BodyLength (Tag 9) and CheckSum (Tag 10) per FIX rules; append automatically on `build()`
- [x] 7.4 Ensure built messages pass `validateRaw` when validated against the same definition
- [x] 7.5 Support building for all message types defined in the loaded definition

## 8. Field masking

- [x] 8.1 Support configurable list of field identifiers (tag numbers and/or field names) to mask
- [x] 8.2 Support configurable placeholder string (e.g. "***") for masked values
- [x] 8.3 Implement masking for raw FIX string: return string with masked tag values replaced by placeholder
- [x] 8.4 Implement masking for parsed JSON: return object with masked field values replaced by placeholder

## 9. Public API and TypeScript types

- [x] 9.1 Export parser factory (e.g. `createParser({ version })` or `FIXParser.fromVersion(...)` and `fromXml(...)`)
- [x] 9.2 Export types for parsed message, validation result, and builder usage where feasible from definition
- [x] 9.3 Ensure package `types` field resolves so consumers get type checking without @types package
- [x] 9.4 Document public API (README or docs) for init, parse, validate, Message Builder, and masking

## 10. Tests and publish readiness

- [x] 10.1 Add unit tests for definition loading (by version and custom XML)
- [x] 10.2 Add unit tests for parse (valid and invalid messages), validateRaw, validateJson
- [x] 10.3 Add unit tests for Message Builder (field set, build, checksum correctness)
- [x] 10.4 Add unit tests for field masking (raw and parsed)
- [x] 10.5 Verify `npm pack` / install from tarball works and bundled XML is resolvable
- [x] 10.6 Bump version (e.g. 1.0.0) and prepare for publish to npm under @eklabdev/fix-swift-forge

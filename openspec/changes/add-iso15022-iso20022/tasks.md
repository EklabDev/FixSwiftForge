# Tasks: Add ISO 15022 (MT) and ISO 20022 (MX) Support

## 1. Project structure and definitions

- [x] 1.1 Create `src/mt/` directory with `index.ts`, `types.ts`, `parser.ts`, `builder.ts`, `validator.ts`
- [x] 1.2 Create `src/mx/` directory with `index.ts`, `types.ts`, `parser.ts`, `builder.ts`, `validator.ts`
- [x] 1.3 Create `src/swift/` directory with `converter.ts`, `masking.ts`, `types.ts`
- [x] 1.4 Create `definitions/swift/mt/` directory for MT field definition JSON files
- [x] 1.5 Create `definitions/swift/mx/` directory for MX schema definition JSON files
- [x] 1.6 Create `definitions/swift/mappings/` directory for MT ↔ MX conversion mapping files

## 2. MT field definitions (all message types, categories 1–9)

- [x] 2.1 Obtain/create MT field definition JSON for **Category 1** (1xx — Customer Payments: MT103, MT103+, MT104–MT112, MT121, MT190–MT199)
- [x] 2.2 Obtain/create MT field definition JSON for **Category 2** (2xx — Financial Institution Transfers: MT200–MT210, MT256, MT290–MT299)
- [x] 2.3 Obtain/create MT field definition JSON for **Category 3** (3xx — Foreign Exchange: MT300–MT399)
- [x] 2.4 Obtain/create MT field definition JSON for **Category 4** (4xx — Collections and Cash Letters: MT400–MT499)
- [x] 2.5 Obtain/create MT field definition JSON for **Category 5** (5xx — Securities: MT500–MT599)
- [x] 2.6 Obtain/create MT field definition JSON for **Category 6** (6xx — Precious Metals and Syndications: MT600–MT699)
- [x] 2.7 Obtain/create MT field definition JSON for **Category 7** (7xx — Documentary Credits: MT700–MT799)
- [x] 2.8 Obtain/create MT field definition JSON for **Category 8** (8xx — Traveller's Cheques: MT800–MT899)
- [x] 2.9 Obtain/create MT field definition JSON for **Category 9** (9xx — Cash Management and Customer Status: MT900–MT999)
- [x] 2.10 Create MT definition loader that reads all bundled JSON specs and provides a lookup API for any MT type

## 3. MX schema definitions (all ISO 20022 message types)

- [x] 3.1 Obtain/create MX schema definition JSON for **all ISO 20022 message types** (all business areas: pacs, camt, acmt, semt, tsmt, pain, seev, sese, setr, sese, etc., and all published versions)
- [x] 3.2 Create MX definition loader that reads all bundled JSON specs and provides a lookup API for any MX type

## 4. MT types and data model

- [x] 4.1 Define `ParsedMTMessage` interface (type, block1–5, raw)
- [x] 4.2 Define `BasicHeader`, `AppHeader`, `UserHeader`, `TrailerBlock` interfaces
- [x] 4.3 Define `MTField` interface (tag, value, subFields)
- [x] 4.4 Define `MTFieldDef` interface for definition model (tag, format pattern, mandatory, repeatable)

## 5. TypeScript type definitions (all MT and MX message types)

- [x] 5.1 Add codegen script or source from which to generate TypeScript interfaces for all MT message types (e.g. `MT103Message`, `MT202Message`, … one per bundled MT type)
- [x] 5.2 Generate or create TypeScript interface definitions for **all MT message types** (categories 1–9), aligned with MT field definition JSON (e.g. `src/mt/types/messages.ts` or per-category files)
- [x] 5.3 Generate or create TypeScript interface definitions for **all MX message types** (all business areas and versions), aligned with MX schema definition JSON (e.g. `src/mx/types/messages.ts` or per-area files)
- [x] 5.4 Export all MT and MX message types from `src/mt/index.ts` and `src/mx/index.ts` (or a dedicated types entry) so consumers get full type safety per message type

## 6. Zod schemas and validation

- [x] 6.1 Add **zod** as a dependency in package.json
- [x] 6.2 Generate or create Zod schemas for **all MT message types** from MT field definition JSON (one schema per MT type, e.g. `MT103Schema`, `MT202Schema`); schemas SHALL enforce block structure, mandatory fields, and field format (string length, regex) where applicable
- [x] 6.3 Generate or create Zod schemas for **all MX message types** from MX schema definition JSON (one schema per MX type); schemas SHALL enforce element presence, types, and cardinality
- [x] 6.4 Integrate Zod into MT validator: `validateMTRaw` / `validateMTParsed` SHALL run parsed message through the corresponding MT Zod schema and map Zod errors to `ValidationResult` (valid, errors[], warnings[])
- [x] 6.5 Integrate Zod into MX validator: `validateMXRaw` / `validateMXParsed` SHALL run parsed message through the corresponding MX Zod schema and map Zod errors to `ValidationResult`
- [x] 6.6 Ensure TypeScript types and Zod schemas stay in sync (e.g. `z.infer<typeof MT103Schema>` equals `MT103Message`); document or automate regeneration when definitions change

## 7. MT parser

- [x] 7.1 Implement Block 1 (Basic Header) parser: extract appId, serviceId, senderLT, sessionNumber, sequenceNumber
- [x] 7.2 Implement Block 2 (Application Header) parser: extract direction, messageType, receiver/sender, priority
- [x] 7.3 Implement Block 3 (User Header) parser: extract key-value pairs
- [x] 7.4 Implement Block 4 (Text) parser: extract fields as `MTField[]` with tag/value, support multi-line and repeating tags
- [x] 7.5 Implement Block 5 (Trailer) parser: extract checksum, MAC, etc.
- [x] 7.6 Implement top-level `parseMT(raw)` that orchestrates block parsing and returns `ParsedMTMessage`
- [x] 7.7 Handle malformed input: throw descriptive errors for empty input, missing blocks, unparseable structure

## 8. MT builder

- [x] 8.1 Implement `MTBuilder` class with constructor accepting message type (e.g. `"103"`)
- [x] 8.2 Implement `setSender(bic)`, `setReceiver(bic)`, `setPriority(p)` for Block 1/2 configuration
- [x] 8.3 Implement `setField(tag, value)` for Block 4 fields with overwrite semantics
- [x] 8.4 Implement `clearField(tag)` to remove a Block 4 field
- [x] 8.5 Implement `build()` that assembles blocks 1–5 into a correctly formatted raw MT string

## 9. MT validator

- [x] 9.1 Implement `validateMTRaw(raw)` that parses then validates using MT definition and **Zod schema** for the detected type, returning `ValidationResult`
- [x] 9.2 Check mandatory fields presence and field format via Zod; map Zod parse errors to `ValidationResult.errors`
- [x] 9.3 Implement `validateMTParsed(msg)` that validates a `ParsedMTMessage` against the corresponding MT Zod schema and maps errors to `ValidationResult`

## 10. MX types and data model

- [x] 10.1 Define `ParsedMXMessage` interface (type, namespace, header, document, raw)
- [x] 10.2 Define `MXAppHeader` interface (from, to, businessMessageIdentifier, messageDefinitionIdentifier, creationDate)
- [x] 10.3 Define `MXElementDef` interface for definition model (name, type, minOccurs, maxOccurs, children)

## 11. MX parser

- [x] 11.1 Implement BAH (Business Application Header) extraction from MX XML
- [x] 11.2 Implement document body XML → JSON mapping preserving element hierarchy
- [x] 11.3 Handle repeating XML elements as arrays in JSON output
- [x] 11.4 Implement top-level `parseMX(raw)` that returns `ParsedMXMessage`
- [x] 11.5 Handle malformed input: throw descriptive errors for invalid XML, missing namespace

## 12. MX builder

- [x] 12.1 Implement `MXBuilder` class with constructor accepting message type (e.g. `"pacs.008.001.08"`)
- [x] 12.2 Implement `setHeader(fields)` for BAH fields (from, to, messageId, creationDate)
- [x] 12.3 Implement `setElement(path, value)` for document elements using dot-path notation
- [x] 12.4 Implement `clearElement(path)` to remove a previously set element
- [x] 12.5 Implement `build()` that produces valid ISO 20022 XML with namespace, BAH, and document body

## 13. MX validator

- [x] 13.1 Implement `validateMXRaw(raw)` that parses then validates using MX schema definition and **Zod schema** for the detected type, returning `ValidationResult`
- [x] 13.2 Check mandatory element presence and type constraints via Zod; map Zod parse errors to `ValidationResult.errors`
- [x] 13.3 Implement `validateMXParsed(msg)` that validates a `ParsedMXMessage` against the corresponding MX Zod schema and maps errors to `ValidationResult`

## 14. MT ↔ MX conversion (all mappable pairs)

- [x] 14.1 Obtain/create mapping definition JSON for **all MT/MX pairs** that have official or well-known mappings (e.g. MT103↔pacs.008, MT202↔pacs.009, and every other mappable pair across categories 1–9 and ISO 20022)
- [x] 14.2 Implement mapping loader that reads all mapping JSON files and indexes by MT type and MX type
- [x] 14.3 Implement `convertMtToMx(mtMsg, targetType?)` using mapping definitions
- [x] 14.4 Implement `convertMxToMt(mxMsg, targetType?)` using mapping definitions
- [x] 14.5 Include `warnings` array in conversion result for unmapped fields
- [x] 14.6 Implement `getSupportedConversions()` that returns all available MT/MX pairs

## 15. SWIFT field masking

- [x] 15.1 Implement `maskMTRaw(raw, config)` that replaces MT field values by tag with placeholder
- [x] 15.2 Implement `maskMTParsed(msg, config)` that replaces field values in `ParsedMTMessage`
- [x] 15.3 Implement `maskMXRaw(raw, config)` that replaces MX element values by name/path with placeholder
- [x] 15.4 Implement `maskMXParsed(msg, config)` that replaces element values in `ParsedMXMessage`

## 16. Public API and exports

- [x] 16.1 Export MT API from `src/mt/index.ts`: `parseMT`, `MTBuilder`, `validateMTRaw`, `validateMTParsed`
- [x] 16.2 Export MX API from `src/mx/index.ts`: `parseMX`, `MXBuilder`, `validateMXRaw`, `validateMXParsed`
- [x] 16.3 Export conversion API from `src/swift/converter.ts`: `convertMtToMx`, `convertMxToMt`, `getSupportedConversions`
- [x] 16.4 Export masking API from `src/swift/masking.ts`: `maskMTRaw`, `maskMTParsed`, `maskMXRaw`, `maskMXParsed`
- [x] 16.5 Export all new types (including per-message-type MT/MX interfaces) and Zod schemas from `src/index.ts`
- [x] 16.6 Add `definitions/swift/` to package.json `files` array

## 17. Tests

- [x] 17.1 Unit tests for MT parser: representative types from each category (1–9), valid/malformed, multi-line and repeating fields
- [x] 17.2 Unit tests for MT builder: build messages from at least one type per category, field set/clear, block formatting
- [x] 17.3 Unit tests for MT validator (Zod): valid, missing mandatory, format violation; ensure Zod validation and error mapping work for any bundled MT type
- [x] 17.4 Unit tests for MX parser: representative types from multiple business areas (pacs, camt, etc.), valid/malformed, repeating elements
- [x] 17.5 Unit tests for MX builder: build messages from at least one type per business area, element set/clear, header, XML output
- [x] 17.6 Unit tests for MX validator (Zod): valid, missing mandatory, type violation; ensure Zod validation and error mapping work for any bundled MX type
- [x] 17.7 Unit tests for MT ↔ MX conversion: representative mappable pairs, unsupported type, unmapped field warnings; list of supported pairs matches bundled mappings
- [x] 17.8 Unit tests for SWIFT masking (MT raw/parsed, MX raw/parsed, default placeholder)
- [x] 17.9 Unit tests for TypeScript types and Zod schemas: ensure `z.infer<typeof MT103Schema>` matches `MT103Message` (and representative MX types)
- [x] 17.10 Verify existing FIX tests still pass (no regressions)

## 18. Documentation and publish

- [x] 18.1 Update README with MT and MX usage examples (parse, build, validate with Zod, convert, mask) and per-message-type types
- [x] 18.2 Bump version to 1.1.0
- [x] 18.3 Run `npm pack` to verify bundled definitions are included
- [ ] 18.4 Publish with `npm publish --access public`

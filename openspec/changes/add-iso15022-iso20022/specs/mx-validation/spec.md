## ADDED Requirements

### Requirement: Validate raw MX messages
The system SHALL provide `validateMXRaw(raw)` that validates a raw MX XML string against the ISO 20022 schema rules for the detected message type, returning a `ValidationResult` with `valid`, `errors`, and `warnings`.

#### Scenario: Valid pacs.008 message
- **WHEN** a correctly structured pacs.008 XML with all mandatory elements is validated
- **THEN** the result SHALL have `valid: true` and `errors` SHALL be empty

#### Scenario: Missing mandatory element
- **WHEN** a pacs.008 XML missing the mandatory `<GrpHdr>` element is validated
- **THEN** the result SHALL have `valid: false` and `errors` SHALL contain an entry referencing the missing element

#### Scenario: Invalid element type
- **WHEN** an MX element that expects a decimal value contains non-numeric text
- **THEN** the result SHALL have `valid: false` and `errors` SHALL describe the type violation

### Requirement: Validate parsed MX messages
The system SHALL provide `validateMXParsed(msg)` that validates a `ParsedMXMessage` object against the schema rules, returning a `ValidationResult`.

#### Scenario: Valid parsed MX message
- **WHEN** a `ParsedMXMessage` with all mandatory elements and correct types is validated
- **THEN** the result SHALL have `valid: true`

#### Scenario: Invalid parsed MX message
- **WHEN** a `ParsedMXMessage` missing a mandatory element is validated
- **THEN** the result SHALL have `valid: false` with an appropriate error

### Requirement: Support validation for all bundled MX types
The system SHALL support validation for every MX message type included in the bundled definitions.

#### Scenario: Validate any bundled MX type
- **WHEN** a message of any bundled MX type (e.g. pacs.008, camt.053) is validated
- **THEN** the system SHALL apply the correct schema rules for that MX type

### Requirement: Validate using Zod schemas
The system SHALL perform runtime validation of parsed MX messages using **Zod** schemas (one schema per MX message type). Zod parse failures SHALL be mapped to `ValidationResult.errors` with element path and message so the consumer receives the same `ValidationResult` shape as FIX validation.

#### Scenario: Zod validation produces ValidationResult
- **WHEN** a parsed MX message fails Zod validation (e.g. missing mandatory element or type violation)
- **THEN** the system SHALL return `ValidationResult` with `valid: false` and `errors` populated from the Zod error path and message

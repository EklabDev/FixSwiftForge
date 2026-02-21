## ADDED Requirements

### Requirement: Validate raw MT messages
The system SHALL provide `validateMTRaw(raw)` that validates a raw MT string against the MT field definitions for the detected message type, returning a `ValidationResult` with `valid`, `errors`, and `warnings`.

#### Scenario: Valid MT103 message
- **WHEN** a correctly formatted MT103 with all mandatory fields is validated
- **THEN** the result SHALL have `valid: true` and `errors` SHALL be empty

#### Scenario: Missing mandatory field
- **WHEN** an MT103 missing mandatory field `:32A:` (Value Date/Currency/Amount) is validated
- **THEN** the result SHALL have `valid: false` and `errors` SHALL contain an entry referencing field `"32A"` as missing

#### Scenario: Invalid field format
- **WHEN** an MT103 field `:20:` exceeds 16 characters (the spec allows 16x)
- **THEN** the result SHALL have `valid: false` and `errors` SHALL contain an entry describing the format violation

### Requirement: Validate parsed MT messages
The system SHALL provide `validateMTParsed(msg)` that validates a `ParsedMTMessage` object against the MT field definitions, returning a `ValidationResult`.

#### Scenario: Valid parsed message
- **WHEN** a `ParsedMTMessage` with all mandatory fields and correct formats is validated
- **THEN** the result SHALL have `valid: true`

#### Scenario: Invalid parsed message
- **WHEN** a `ParsedMTMessage` with a missing mandatory field is validated
- **THEN** the result SHALL have `valid: false` with an appropriate error

### Requirement: Support validation for all bundled MT types
The system SHALL support validation for every MT message type included in the bundled definitions.

#### Scenario: Validate any bundled MT type
- **WHEN** a message of any bundled MT type (e.g. MT103, MT202, MT940) is validated
- **THEN** the system SHALL apply the correct field rules for that MT type

### Requirement: Validate using Zod schemas
The system SHALL perform runtime validation of parsed MT messages using **Zod** schemas (one schema per MT message type). Zod parse failures SHALL be mapped to `ValidationResult.errors` with field and message so the consumer receives the same `ValidationResult` shape as FIX validation.

#### Scenario: Zod validation produces ValidationResult
- **WHEN** a parsed MT message fails Zod validation (e.g. missing mandatory field or format violation)
- **THEN** the system SHALL return `ValidationResult` with `valid: false` and `errors` populated from the Zod error path and message

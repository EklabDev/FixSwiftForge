## ADDED Requirements

### Requirement: Mask MT message fields in raw format
The system SHALL provide `maskMTRaw(raw, config)` that replaces specified MT field values in the raw string with a placeholder, using the same `MaskConfig` pattern as FIX masking. Fields SHALL be identified by tag (e.g. `"20"`, `"59"`) or field name.

#### Scenario: Mask by tag in raw MT
- **WHEN** `maskMTRaw(raw, { fields: ["20", "59"], placeholder: "***" })` is called
- **THEN** the returned string SHALL have `:20:***` and `:59:***` with all other fields unchanged

### Requirement: Mask MT message fields in parsed format
The system SHALL provide `maskMTParsed(msg, config)` that replaces specified field values in a `ParsedMTMessage` with a placeholder, returning a new `ParsedMTMessage`.

#### Scenario: Mask parsed MT fields
- **WHEN** a parsed MT103 is masked with `fields: ["20"]` and `placeholder: "REDACTED"`
- **THEN** the field with tag `"20"` in `block4` SHALL have its value replaced with `"REDACTED"`, and all other fields SHALL be unchanged

### Requirement: Mask MX message elements in raw format
The system SHALL provide `maskMXRaw(raw, config)` that replaces specified MX element values in the raw XML with a placeholder. Elements SHALL be identified by element name or dot-path.

#### Scenario: Mask by element name in raw MX
- **WHEN** `maskMXRaw(raw, { fields: ["MsgId", "InstdAmt"], placeholder: "***" })` is called
- **THEN** the returned XML SHALL have the text content of `<MsgId>` and `<InstdAmt>` replaced with `***`

### Requirement: Mask MX message elements in parsed format
The system SHALL provide `maskMXParsed(msg, config)` that replaces specified element values in a `ParsedMXMessage` with a placeholder, returning a new `ParsedMXMessage`.

#### Scenario: Mask parsed MX elements
- **WHEN** a parsed pacs.008 is masked with `fields: ["MsgId"]` and `placeholder: "***"`
- **THEN** `document.GrpHdr.MsgId` SHALL be `"***"` and all other elements SHALL be unchanged

### Requirement: Use existing MaskConfig type
The masking functions SHALL accept the existing `MaskConfig` type (`{ fields: (number | string)[], placeholder?: string }`) to maintain API consistency with FIX masking.

#### Scenario: Default placeholder
- **WHEN** `maskMTRaw(raw, { fields: ["20"] })` is called without a `placeholder`
- **THEN** the default placeholder `"***"` SHALL be used

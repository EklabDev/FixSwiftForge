## ADDED Requirements

### Requirement: Build MT messages via fluent API
The system SHALL provide an `MTBuilder` class that allows setting Block 1–5 fields and produces a correctly formatted raw MT string on `build()`.

#### Scenario: Build a minimal MT103
- **WHEN** the user creates an `MTBuilder` for type `"103"`, sets Block 1 sender, Block 2 receiver, and Block 4 fields `:20:`, `:32A:`, `:50K:`, `:59:`
- **THEN** `build()` SHALL return a raw MT string with correct block delimiters `{1:...}{2:...}{4:...}` and field formatting

### Requirement: Set Block 4 fields by tag
The system SHALL provide `setField(tag, value)` to set a Block 4 field by its tag string (e.g. `"20"`, `"32A"`). The builder SHALL accept multiple calls to set different fields.

#### Scenario: Set and overwrite a field
- **WHEN** the user calls `setField("20", "REF001")` then `setField("20", "REF002")`
- **THEN** the built message SHALL contain `:20:REF002` (latest value wins)

#### Scenario: Set multi-line field
- **WHEN** the user calls `setField("59", "/ACC123\nBeneficiary Name\nAddress Line")`
- **THEN** the built message SHALL contain the `:59:` field with the value spanning multiple lines within Block 4

### Requirement: Auto-format Block 1 and Block 2
The system SHALL automatically construct Block 1 and Block 2 from provided parameters (sender BIC, receiver BIC, message type, priority), formatting them per the MT specification.

#### Scenario: Block 1 formatting
- **WHEN** the user sets sender BIC `"BANKBICAXXXX"`
- **THEN** Block 1 in the built message SHALL follow the format `{1:F01BANKBICAXXXX0000000000}`

### Requirement: Clear fields
The system SHALL provide `clearField(tag)` to remove a previously set Block 4 field.

#### Scenario: Clear a field
- **WHEN** the user sets `:20:REF001` then calls `clearField("20")`
- **THEN** the built message SHALL NOT contain a `:20:` field

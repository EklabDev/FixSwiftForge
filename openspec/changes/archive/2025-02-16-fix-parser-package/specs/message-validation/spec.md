## ADDED Requirements

### Requirement: Validate raw FIX message
The system SHALL provide an API (e.g. `validateRaw(raw: string)`) that validates a raw FIX message string against the loaded definition. Validation SHALL check required fields, data types, and allowed values/enums where defined for the message type. The result SHALL indicate valid or invalid and SHALL include a list of errors (and optionally warnings) when invalid.

#### Scenario: Valid raw message passes
- **WHEN** the user calls validateRaw with a raw FIX message that conforms to the loaded definition for its message type
- **THEN** the system SHALL return a result indicating valid (and optionally any warnings)

#### Scenario: Invalid raw message fails with errors
- **WHEN** the user calls validateRaw with a raw message that is missing required fields, has wrong types, or violates enum/value rules
- **THEN** the system SHALL return a result indicating invalid and SHALL include at least one error describing the failure

### Requirement: Validate parsed JSON
The system SHALL provide an API (e.g. `validateJson(obj)`) that validates a previously parsed message (JSON-like structure) against the loaded definition. The same rules as raw validation SHALL apply: required fields, types, and allowed values for the message type. The result SHALL indicate valid or invalid and SHALL include errors when invalid.

#### Scenario: Valid parsed object passes
- **WHEN** the user calls validateJson with a parsed message object that conforms to the definition
- **THEN** the system SHALL return a result indicating valid

#### Scenario: Invalid parsed object fails with errors
- **WHEN** the user calls validateJson with an object that does not conform (e.g. missing required field, wrong type)
- **THEN** the system SHALL return a result indicating invalid and SHALL include at least one error describing the failure

### Requirement: Validation for all known message types
Validation (raw and JSON) SHALL be supported for every message type present in the loaded definition. The system SHALL use the definition to determine required/optional fields and rules per message type.

#### Scenario: Validate any defined message type
- **WHEN** the user validates a message whose MsgType is defined in the loaded XML
- **THEN** the system SHALL apply the correct rules for that message type and SHALL return a deterministic valid/invalid result

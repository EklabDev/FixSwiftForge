## ADDED Requirements

### Requirement: Parse raw FIX message to JSON
The system SHALL provide an API (e.g. `parse(raw: string)`) that accepts a raw FIX message string and returns a JSON-friendly structure. The structure SHALL reflect the message type (MsgType), fields as tag- or name-keyed values, and SHALL represent components and repeating groups in a consistent way (e.g. nested arrays for groups).

#### Scenario: Parse valid FIX message
- **WHEN** the user calls parse with a valid raw FIX message string and a definition is loaded
- **THEN** the system SHALL return a parsed representation (e.g. object with message type and field values) that is JSON-serializable and whose structure is informed by the loaded definition

#### Scenario: Parse with unknown or invalid message
- **WHEN** the user calls parse with a string that is not valid FIX (e.g. malformed tag=value) or that cannot be fully interpreted with the loaded definition
- **THEN** the system SHALL either return a best-effort result with optional warnings or SHALL throw/return an error with sufficient detail for the caller to handle

### Requirement: Parsed output is definition-driven
The parsed JSON structure SHALL be driven by the loaded XML definition. Field names, types, and message layout (including components and groups) SHALL be inferred from the definition so that the output is consistent and type-inference-friendly.

#### Scenario: Field names and types from definition
- **WHEN** a message is parsed and the definition includes field metadata (name, type, enum values)
- **THEN** the parsed output SHALL expose fields in a form that allows developers to read and work with the data in a familiar, definition-aligned way

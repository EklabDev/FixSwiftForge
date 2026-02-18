## ADDED Requirements

### Requirement: Load FIX definition from bundled version
The system SHALL support initializing the parser with a FIX definition by version identifier. Bundled definitions MUST be provided for FIX 4.0, 4.1, 4.2, 4.3, 4.4, 5.0, 5.0 SP1, and 5.0 SP2.

#### Scenario: Initialize parser by version identifier
- **WHEN** the user initializes the parser with a supported version identifier (e.g. "4.4", "5.0", "5.0sp2")
- **THEN** the system SHALL load the corresponding bundled FIX XML and build an in-memory definition model usable for parsing, validation, and Message Builder

#### Scenario: Unsupported version identifier
- **WHEN** the user supplies a version identifier that is not in the bundled set
- **THEN** the system SHALL fail initialization with a clear error (e.g. unknown version)

### Requirement: Load FIX definition from custom XML
The system SHALL support initializing the parser with a custom FIX definition supplied as XML (string, buffer, or resolvable path). The XML MUST follow a supported FIX Repository–style schema so that fields, message types, and components can be interpreted.

#### Scenario: Initialize parser with custom XML string
- **WHEN** the user supplies a valid FIX definition as an XML string
- **THEN** the system SHALL parse the XML and build an in-memory definition model and SHALL use that definition for all subsequent parse, validate, and build operations

#### Scenario: Invalid or unsupported XML
- **WHEN** the user supplies XML that is malformed or does not conform to the expected FIX definition schema
- **THEN** the system SHALL fail initialization with a clear error describing the problem

### Requirement: Definition model drives message structure and types
The in-memory definition model produced from XML SHALL expose fields by tag, message types, component inclusion, and data types so that parsing, validation, and Message Builder can operate in a definition-driven way. The model SHALL be the single source of truth for message structure and type inference.

#### Scenario: Definition model used for parsing
- **WHEN** a raw FIX message is parsed
- **THEN** the system SHALL use the loaded definition model to resolve field names, types, and message structure for the output JSON

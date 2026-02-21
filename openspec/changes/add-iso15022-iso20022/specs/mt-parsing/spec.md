## ADDED Requirements

### Requirement: Parse raw MT message into structured JSON
The system SHALL accept a raw SWIFT MT message string and return a `ParsedMTMessage` object containing the message type, all five blocks (Basic Header, Application Header, User Header, Text, Trailer), and the original raw text.

#### Scenario: Parse a valid MT103 message
- **WHEN** a valid raw MT103 string is provided to `parseMT(raw)`
- **THEN** the result SHALL contain `type: "103"`, a populated `block1` with sender BIC, `block2` with I/O indicator, `block4` with an array of fields including `:20:`, `:32A:`, `:59:`, and the original raw string

#### Scenario: Parse a valid MT940 message
- **WHEN** a valid raw MT940 string is provided to `parseMT(raw)`
- **THEN** the result SHALL contain `type: "940"`, `block4` with statement fields including `:20:`, `:25:`, `:60F:`, `:61:`, `:62F:`

### Requirement: Decompose MT Block 4 fields into tag-value pairs
The system SHALL parse Block 4 of an MT message into an ordered array of `MTField` objects, each containing a `tag` (e.g. `"20"`, `"32A"`) and `value` (the field content as a string).

#### Scenario: Multi-line field values
- **WHEN** a Block 4 field spans multiple lines (e.g. `:59:` beneficiary with name and address lines)
- **THEN** the parsed `MTField.value` SHALL preserve all lines as a single string with newlines

#### Scenario: Repeating fields
- **WHEN** Block 4 contains multiple instances of the same tag (e.g. multiple `:61:` statement lines in MT940)
- **THEN** each occurrence SHALL appear as a separate entry in the fields array in original order

### Requirement: Parse MT Block 1 (Basic Header)
The system SHALL extract the Basic Header block and populate `block1` with `appId`, `serviceId`, `senderLT` (logical terminal / BIC), `sessionNumber`, and `sequenceNumber`.

#### Scenario: Standard Block 1
- **WHEN** the raw message contains `{1:F01BANKBICAXXXX0000000000}`
- **THEN** `block1.appId` SHALL be `"F"`, `block1.serviceId` SHALL be `"01"`, `block1.senderLT` SHALL be `"BANKBICAXXXX"`, `block1.sessionNumber` SHALL be `"0000"`, `block1.sequenceNumber` SHALL be `"000000"`

### Requirement: Parse MT Block 2 (Application Header)
The system SHALL extract the Application Header and populate `block2` with direction (`I` for input, `O` for output), message type, destination BIC (for input) or sender info (for output), and priority.

#### Scenario: Input message (Block 2 type I)
- **WHEN** the raw message contains `{2:I103BANKBICAXXXXN}`
- **THEN** `block2.direction` SHALL be `"I"`, `block2.messageType` SHALL be `"103"`, `block2.receiverAddress` SHALL be `"BANKBICAXXXX"`, `block2.priority` SHALL be `"N"`

#### Scenario: Output message (Block 2 type O)
- **WHEN** the raw message contains `{2:O1031300210101BANKBICAXXXX00000000001301011300N}`
- **THEN** `block2.direction` SHALL be `"O"`, `block2.messageType` SHALL be `"103"`

### Requirement: Handle malformed MT messages
The system SHALL throw a descriptive error when the raw MT string is empty, missing required blocks, or contains unparseable block structure.

#### Scenario: Empty input
- **WHEN** an empty string is provided to `parseMT()`
- **THEN** the system SHALL throw an error with a message indicating the input is empty

#### Scenario: Missing Block 4
- **WHEN** a raw MT string has Block 1 and Block 2 but no Block 4
- **THEN** the system SHALL throw an error indicating the mandatory text block is missing

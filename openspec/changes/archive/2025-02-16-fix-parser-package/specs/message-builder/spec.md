## ADDED Requirements

### Requirement: Message Builder for all known message types
The system SHALL provide an open API to obtain a Message Builder for every message type defined in the loaded definition (e.g. `getBuilder(msgType)` or equivalent). Each builder SHALL allow the caller to set and manipulate fields required and optional for that message type in a fluent, type-aware way, and SHALL produce a valid FIX message string.

#### Scenario: Get builder for defined message type
- **WHEN** the user requests a builder for a message type that exists in the loaded definition (e.g. "D" for NewOrderSingle)
- **THEN** the system SHALL return a builder instance that supports setting fields for that message type and building the final message

#### Scenario: Builder rejects unknown message type
- **WHEN** the user requests a builder for a message type not in the loaded definition
- **THEN** the system SHALL fail with a clear error (e.g. unknown message type)

### Requirement: Builder produces correct checksum
The Message Builder SHALL compute and append the FIX checksum (Tag 10) according to the standard rules: checksum is the three-digit modulo 256 of the sum of byte values of the message (after BodyLength, before CheckSum). The builder SHALL always append BodyLength (Tag 9) and CheckSum (Tag 10); the caller SHALL NOT set Tag 10 manually.

#### Scenario: Built message includes valid checksum
- **WHEN** the user completes the builder and calls build()
- **THEN** the returned FIX string SHALL include Tag 9 (BodyLength) and Tag 10 (CheckSum) with a correctly computed checksum so that the message is valid for on-the-wire use

#### Scenario: Checksum matches message content
- **WHEN** a built message is parsed or validated by the same or another compliant parser
- **THEN** the checksum in Tag 10 SHALL be accepted as valid for the message content (i.e. recomputing the checksum from the message yields the same value)

### Requirement: Builder allows field manipulation
The Message Builder SHALL expose an API to set, update, and clear fields (by tag or by name when supported by the definition). The API SHALL be open and usable for all fields defined for that message type and SHALL support building messages that pass validation against the loaded definition.

#### Scenario: Set required and optional fields then build
- **WHEN** the user sets all required fields and any optional fields and calls build()
- **THEN** the system SHALL produce a FIX string that passes validateRaw when validated against the same definition

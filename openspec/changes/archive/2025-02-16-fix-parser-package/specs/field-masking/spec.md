## ADDED Requirements

### Requirement: Configurable list of fields to mask
The system SHALL support a user-configurable list of FIX field identifiers (tag numbers and/or field names from the definition) that are to be masked. When producing a masked view of a message, the system SHALL replace the values of those fields with a configurable placeholder (e.g. "***" or a custom string).

#### Scenario: Mask predefined fields in output
- **WHEN** the user has configured a set of tags (e.g. 554, 925) or field names to mask and requests a masked representation of a message (raw or parsed)
- **THEN** the system SHALL return the message with those field values replaced by the configured placeholder so that sensitive data is not exposed

#### Scenario: Non-masked fields unchanged
- **WHEN** a masked view is produced
- **THEN** all fields not in the mask list SHALL retain their original values; only the configured fields SHALL show the placeholder

### Requirement: Masking for raw and parsed representation
The system SHALL support applying masking to both (1) a raw FIX message string and (2) a parsed JSON-like message. The behavior SHALL be consistent: the same configured fields are masked in both forms, and the placeholder SHALL be applied in a way appropriate to the format (e.g. tag=*** in raw, value "***" in JSON).

#### Scenario: Mask raw FIX string
- **WHEN** the user supplies a raw FIX string and requests a masked version with a configured mask list
- **THEN** the system SHALL return a FIX string where values for the masked tags are replaced by the placeholder

#### Scenario: Mask parsed JSON
- **WHEN** the user supplies a parsed message object and requests a masked version with a configured mask list
- **THEN** the system SHALL return an object where values for the masked fields are replaced by the placeholder, suitable for logging or auditing

## ADDED Requirements

### Requirement: Convert MT to MX
The system SHALL provide `convertMtToMx(mtMsg, targetType?)` that converts a `ParsedMTMessage` to a `ParsedMXMessage` using the defined field-level mappings for supported MT/MX pairs.

#### Scenario: Convert MT103 to pacs.008
- **WHEN** a parsed MT103 is provided to `convertMtToMx()`
- **THEN** the result SHALL be a `ParsedMXMessage` of type `pacs.008` with fields mapped from the MT103 (e.g. `:32A:` amount → `IntrBkSttlmAmt`, `:32A:` date → `IntrBkSttlmDt`, `:50K:` → `Dbtr`)

#### Scenario: Unsupported MT type for conversion
- **WHEN** an MT type with no defined MX mapping is provided
- **THEN** the system SHALL throw an error indicating the MT type has no supported MX conversion

### Requirement: Convert MX to MT
The system SHALL provide `convertMxToMt(mxMsg, targetType?)` that converts a `ParsedMXMessage` to a `ParsedMTMessage` using the defined field-level mappings for supported MT/MX pairs.

#### Scenario: Convert pacs.008 to MT103
- **WHEN** a parsed pacs.008 message is provided to `convertMxToMt()`
- **THEN** the result SHALL be a `ParsedMTMessage` of type `"103"` with fields mapped from the pacs.008 (e.g. `IntrBkSttlmAmt` + `IntrBkSttlmDt` → `:32A:`, `Dbtr` → `:50K:`)

#### Scenario: Unsupported MX type for conversion
- **WHEN** an MX type with no defined MT mapping is provided
- **THEN** the system SHALL throw an error indicating the MX type has no supported MT conversion

### Requirement: Conversion result includes warnings for unmapped fields
The system SHALL include a `warnings` array in the conversion result for any source fields that could not be mapped to the target format.

#### Scenario: Unmapped fields produce warnings
- **WHEN** an MT message contains fields that have no equivalent in the target MX type
- **THEN** the conversion result SHALL include a warning for each unmapped field, listing the source tag and a description

### Requirement: Support all defined mapping pairs
The system SHALL support conversion for every MT/MX pair that has a bundled mapping definition.

#### Scenario: List supported conversions
- **WHEN** the user queries supported conversion pairs (e.g. `getSupportedConversions()`)
- **THEN** the system SHALL return an array of objects each containing `mtType` and `mxType`

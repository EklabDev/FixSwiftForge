## ADDED Requirements

### Requirement: Parse raw MX message into structured JSON
The system SHALL accept a raw ISO 20022 MX XML string and return a `ParsedMXMessage` object containing the message type identifier (e.g. `"pacs.008.001.08"`), namespace, application header, document body as nested JSON, and the original raw XML.

#### Scenario: Parse a valid pacs.008 message
- **WHEN** a valid pacs.008 XML string is provided to `parseMX(raw)`
- **THEN** the result SHALL contain `type` matching the message identifier, `namespace` matching the ISO 20022 namespace, a populated `header` with BAH fields, and `document` with the payment instruction elements

#### Scenario: Parse a valid camt.053 message
- **WHEN** a valid camt.053 XML string is provided to `parseMX(raw)`
- **THEN** the result SHALL contain `type: "camt.053..."`, and `document` with statement entries

### Requirement: Extract Business Application Header (BAH)
The system SHALL parse the ISO 20022 Business Application Header from the MX XML and populate `header` with `from` (BIC), `to` (BIC), `businessMessageIdentifier`, `messageDefinitionIdentifier`, `creationDate`, and `businessService` where present.

#### Scenario: BAH with sender and receiver BICs
- **WHEN** the MX XML contains an `AppHdr` element with `Fr` and `To` BIC elements
- **THEN** `header.from` SHALL contain the sender BIC and `header.to` SHALL contain the receiver BIC

### Requirement: Map MX document body to nested JSON
The system SHALL convert the XML document body into a JSON object preserving the element hierarchy, with element names as keys and text content as string values. Repeating elements SHALL be represented as arrays.

#### Scenario: Nested elements
- **WHEN** the MX document contains `<CdtTrfTxInf>` with nested `<Amt><InstdAmt Ccy="USD">1000.00</InstdAmt></Amt>`
- **THEN** the JSON SHALL contain the nested structure with `InstdAmt` value `"1000.00"` and attribute `Ccy: "USD"`

#### Scenario: Repeating elements
- **WHEN** the MX document contains multiple `<CdtTrfTxInf>` entries
- **THEN** `document.CdtTrfTxInf` SHALL be an array of objects

### Requirement: Handle malformed MX messages
The system SHALL throw a descriptive error when the raw MX XML is not valid XML, missing the document namespace, or missing required root elements.

#### Scenario: Invalid XML
- **WHEN** a non-XML string is provided to `parseMX()`
- **THEN** the system SHALL throw an error indicating XML parse failure

#### Scenario: Missing namespace
- **WHEN** valid XML is provided but lacks an ISO 20022 namespace
- **THEN** the system SHALL throw an error indicating the namespace is missing or unrecognised

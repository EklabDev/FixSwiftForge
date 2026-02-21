## ADDED Requirements

### Requirement: Build MX messages via fluent API
The system SHALL provide an `MXBuilder` class that allows setting BAH header fields and document body elements, and produces valid ISO 20022 XML on `build()`.

#### Scenario: Build a minimal pacs.008 message
- **WHEN** the user creates an `MXBuilder` for type `"pacs.008.001.08"`, sets header fields (from BIC, to BIC), and sets document elements (message ID, credit transfer details)
- **THEN** `build()` SHALL return a well-formed XML string with the correct ISO 20022 namespace, BAH, and document body

### Requirement: Set document elements by path
The system SHALL provide `setElement(path, value)` to set elements using a dot-separated path (e.g. `"CdtTrfTxInf.Amt.InstdAmt"`) with the value being a string or object.

#### Scenario: Set a nested element
- **WHEN** the user calls `setElement("CdtTrfTxInf.Amt.InstdAmt", { value: "1000.00", attrs: { Ccy: "USD" } })`
- **THEN** the built XML SHALL contain `<InstdAmt Ccy="USD">1000.00</InstdAmt>` within the correct parent hierarchy

#### Scenario: Set a simple element
- **WHEN** the user calls `setElement("GrpHdr.MsgId", "MSG-001")`
- **THEN** the built XML SHALL contain `<MsgId>MSG-001</MsgId>` within `<GrpHdr>`

### Requirement: Set BAH header fields
The system SHALL provide `setHeader(fields)` to set Business Application Header fields including `from`, `to`, `businessMessageIdentifier`, and `creationDate`.

#### Scenario: Set header fields
- **WHEN** the user calls `setHeader({ from: "BANKUS33", to: "BANKGB2L", businessMessageIdentifier: "MSG-001" })`
- **THEN** the built XML SHALL contain an `<AppHdr>` element with `<Fr>` containing `BANKUS33` and `<To>` containing `BANKGB2L`

### Requirement: Clear elements
The system SHALL provide `clearElement(path)` to remove a previously set element.

#### Scenario: Clear an element
- **WHEN** the user sets `GrpHdr.MsgId` then calls `clearElement("GrpHdr.MsgId")`
- **THEN** the built XML SHALL NOT contain a `<MsgId>` element under `<GrpHdr>`

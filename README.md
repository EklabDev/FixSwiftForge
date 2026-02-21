# @eklabdev/fix-swift-forge

A **TypeScript-first** financial messaging toolkit covering **FIX protocol**, **SWIFT MT (ISO 15022)**, and **SWIFT MX (ISO 20022)**. Parse, validate, build, convert, and mask messages across all three formats—without relying on Java or C# stacks.

---

## Motivation

I used to work in an **investment bank** building internal **Node.js mid-office systems**. We regularly had to:

- **Generate** FIX messages (orders, executions, session messages)
- **Validate** FIX messages from counterparties or internal engines
- **Respond** to FIX messages (e.g. session admin, order ack)

Most production-grade FIX libraries are **Java** or **C#**. For teams already on Node.js/TypeScript, that meant either:

- Introducing a JVM/.NET service just for FIX, or  
- Rolling our own parsing/validation and fighting checksums and specs by hand.

This package exists to give **TypeScript/Node.js** a single, type-aware library: load a FIX definition (bundled or your own XML), parse and validate messages, build correctly checksummed messages, and mask sensitive fields for logging—all from one API.

---

## Features

### FIX Protocol
- **Bundled FIX definitions**: 4.0, 4.1, 4.2, 4.3, 4.4, 5.0, 5.0 SP1, 5.0 SP2
- **Custom XML**: Use your own FIX Repository–style XML for house rules or extensions
- **Parse** raw FIX strings into a JSON-friendly structure (header, body, trailer, repeating groups)
- **Validate** raw messages or parsed objects against the loaded definition
- **Message Builder**: Fluent API to build messages with automatic BodyLength and CheckSum
- **Field masking**: Redact sensitive tags (e.g. for logging) in raw or parsed form

### SWIFT MT (ISO 15022)
- **All MT categories 1–9**: 235+ message type definitions (MT103, MT202, MT940, MT700, etc.)
- **Parse** raw MT messages into structured JSON (blocks 1–5, header fields, tag/value pairs)
- **Build** MT messages with `MTBuilder` (fluent API for sender, receiver, fields)
- **Validate** against bundled definitions and **Zod schemas** (mandatory fields, format patterns)
- **Mask** sensitive tags in raw or parsed MT messages

### SWIFT MX (ISO 20022)
- **All ISO 20022 business areas**: pacs, camt, pain, sese, semt, seev, acmt, setr, head (116+ message types)
- **Parse** raw XML into structured JSON (BAH, document body, namespace)
- **Build** MX messages with `MXBuilder` (dot-path element setting, header config)
- **Validate** against bundled definitions and **Zod schemas** (element presence, types, cardinality)
- **Mask** sensitive elements in raw or parsed MX messages

### Conversion & Cross-format
- **MT ↔ MX conversion**: Convert between MT and MX with field mapping (MT103 ↔ pacs.008, MT202 ↔ pacs.009, etc.)
- **Zod validation**: Runtime validation with Zod schemas for all message types
- **TypeScript**: Full type safety with exported interfaces and Zod-inferred types

---

## Installation

```bash
npm install @eklabdev/fix-swift-forge
```

---

## Quick start

### 1. Create a parser (bundled version)

```ts
import { FIXParser } from '@eklabdev/fix-swift-forge';

// Use a bundled FIX version (e.g. FIX 4.4)
const parser = FIXParser.fromVersion('4.4');
```

Or with the factory:

```ts
import { createParser } from '@eklabdev/fix-swift-forge';

const parser = createParser({ version: '4.4' });
```

### 2. Parse a raw FIX message

```ts
const raw =
  '8=FIX.4.4\x019=55\x0135=D\x0149=Sender\x0156=Target\x0134=1\x0152=20230101-00:00:00\x01' +
  '11=ClOrdID-001\x0155=AAPL\x0154=1\x0160=20230101-00:00:00\x0140=2\x0110=123\x01';

const msg = parser.parse(raw);

console.log(msg.msgType);       // "D"
console.log(msg.msgTypeName);   // "NewOrderSingle"
console.log(msg.body.Symbol);  // "AAPL"
console.log(msg.body.ClOrdID); // "ClOrdID-001"
console.log(msg.header.SenderCompID); // "Sender"
```

### 3. Validate a raw message

```ts
const result = parser.validateRaw(raw);

if (result.valid) {
  console.log('Message is valid');
} else {
  result.errors.forEach((e) => console.error(e.field, e.message));
}
```

### 4. Build a FIX message (with correct checksum)

Use the **Message Builder** to build messages; BodyLength (9) and CheckSum (10) are computed for you.

```ts
const builder = parser.getBuilder('D'); // NewOrderSingle

builder
  .setTag(49, 'MY_COMPANY')
  .setTag(56, 'COUNTERPARTY')
  .setTag(34, '1')
  .setTag(52, '20230101-12:00:00')
  .setTag(11, 'ClOrdID-002')
  .setTag(55, 'MSFT')
  .setTag(54, '1')   // Side: Buy
  .setTag(60, '20230101-12:00:00')
  .setTag(40, '2');  // OrdType: Limit

const fixMessage = builder.build();

// fixMessage is a valid FIX string with 8=, 9=, 35=D, ... 10=xxx
console.log(fixMessage);
// Validate what we built
const validation = parser.validateRaw(fixMessage);
console.log(validation.valid); // true (when required fields are present)
```

You can use **field names** instead of tag numbers where the definition has them:

```ts
builder
  .set('SenderCompID', 'MY_COMPANY')
  .set('TargetCompID', 'COUNTERPARTY')
  .set('ClOrdID', 'ClOrdID-002')
  .set('Symbol', 'MSFT')
  .set('Side', '1')
  .set('TransactTime', '20230101-12:00:00')
  .set('OrdType', '2');
```

### 5. Mask sensitive fields (e.g. for logging)

Mask by **tag** or **field name**:

```ts
import type { MaskConfig } from '@eklabdev/fix-swift-forge';

const maskConfig: MaskConfig = {
  fields: [11, 55, 'Password'],  // ClOrdID, Symbol, Password
  placeholder: '***',
};

const maskedRaw = parser.maskRaw(raw, maskConfig);
// Values for tags 11, 55 and Password are replaced by "***"

const parsed = parser.parse(raw);
const maskedParsed = parser.maskParsed(parsed, maskConfig);
// Same masking applied to the parsed object
```

---

## Custom FIX definition (XML)

Use your own FIX Repository–style XML (e.g. house rules or extensions):

```ts
import { FIXParser } from '@eklabdev/fix-swift-forge';
import * as fs from 'fs';

// From string or Buffer
const xml = fs.readFileSync('./path/to/MyFIX44.xml', 'utf-8');
const parser = FIXParser.fromXml(xml);

// Or from file path
const parserFromPath = FIXParser.fromPath('./path/to/MyFIX44.xml');
```

---

## Supported versions

Bundled version identifiers:

| Identifier | Description     |
|-----------|-----------------|
| `4.0`     | FIX 4.0        |
| `4.1`     | FIX 4.1        |
| `4.2`     | FIX 4.2        |
| `4.3`     | FIX 4.3        |
| `4.4`     | FIX 4.4        |
| `5.0`     | FIX 5.0        |
| `5.0sp1`  | FIX 5.0 SP1    |
| `5.0sp2`  | FIX 5.0 SP2   |

```ts
import { SUPPORTED_VERSIONS } from '@eklabdev/fix-swift-forge';

console.log(SUPPORTED_VERSIONS);
// ['4.0', '4.1', '4.2', '4.3', '4.4', '5.0', '5.0sp1', '5.0sp2']
```

---

## API overview

| Method / export        | Description |
|-----------------------|------------|
| `FIXParser.fromVersion(version)` | Parser from a bundled FIX version. |
| `FIXParser.fromXml(xml)`         | Parser from custom XML string or Buffer. |
| `FIXParser.fromPath(filePath)`   | Parser from an XML file path. |
| `createParser(options)`          | Factory: `{ version }`, `{ xml }`, or `{ path }`. |
| `parser.parse(raw)`              | Parse raw FIX string → `ParsedMessage`. |
| `parser.validateRaw(raw)`        | Validate raw string → `ValidationResult`. |
| `parser.validateJson(msg)`       | Validate parsed object → `ValidationResult`. |
| `parser.getBuilder(msgType)`    | Get a `MessageBuilder` for a message type (e.g. `'D'`). |
| `parser.maskRaw(raw, config)`   | Mask fields in raw string. |
| `parser.maskParsed(msg, config)`| Mask fields in parsed object. |
| `loadDefinitionFromXml(xml)`   | Load XML into a `FIXDefinition` (advanced). |

**MessageBuilder**

- `set(name, value)` / `setTag(tag, value)` – set field by name or tag  
- `clear(name)` / `clearTag(tag)` – clear field  
- `get(name)` / `getTag(tag)` – get current value  
- `build()` – return FIX string with BodyLength and CheckSum set  

**Types** (exported for TypeScript users):  
`FIXVersion`, `FIXDefinition`, `ParsedMessage`, `ParsedField`, `ValidationResult`, `ValidationError`, `MaskConfig`, `CreateParserOptions`, and related builder/definition types.

---

## Delimiter

FIX uses **SOH** (ASCII 1, `\x01`) as the field delimiter. The parser also accepts **pipe** `|` when present in the message (e.g. in some logs).

---

## How to use SWIFT MT (ISO 15022)

1. **Parse** a raw MT string with `parseMT(raw)` to get a structured object (blocks 1–5, type, fields).
2. **Validate** with `validateMTRaw(raw)` or `validateMTParsed(parsed)` (optionally pass `getMTDefinition(type)` for mandatory/format checks). Use `validateMTWithZod(parsed, def)` for Zod-based validation.
3. **Build** messages with `new MTBuilder(messageType)`, then `setSender`, `setReceiver`, `setField`, and `build()`.
4. **Look up** message types with `getMTTypes()`, `getMTTypesByCategory(category)`, or `getMTDefinition(type)`.
5. **Mask** sensitive tags with `maskMTRaw(raw, config)` or `maskMTParsed(parsed, config)`.

All MT message types (categories 1–9, 235+ types) have bundled definitions. Each type has one **positive** test (valid parse/build) and one **negative** test (malformed input or validation failure) in the test suite.

---

## SWIFT MT (ISO 15022)

### Parse an MT message

```ts
import { parseMT } from '@eklabdev/fix-swift-forge';

const raw = '{1:F01BANKBICAAXXX0000000000}{2:I103BANKBICBBXXXN}{3:{108:MT103}}{4:\r\n:20:REF123456\r\n:23B:CRED\r\n:32A:230101USD1000,00\r\n:50A:John Doe\r\n:59:Jane Smith\r\n:71A:SHA\r\n-}{5:{CHK:ABCDEF123456}}';

const msg = parseMT(raw);

console.log(msg.type);                // "103"
console.log(msg.block1.senderLT);     // "BANKBICAAXXX"
console.log(msg.block2.direction);    // "I"
console.log(msg.block4[0].tag);       // "20"
console.log(msg.block4[0].value);     // "REF123456"
```

### Build an MT message

```ts
import { MTBuilder } from '@eklabdev/fix-swift-forge';

const builder = new MTBuilder('103');
builder
  .setSender('BANKBICAA')
  .setReceiver('BANKBICBB')
  .setField('20', 'REF123456')
  .setField('23B', 'CRED')
  .setField('32A', '230101USD1000,00')
  .setField('50A', 'John Doe')
  .setField('59', 'Jane Smith')
  .setField('71A', 'SHA');

const rawMT = builder.build();
console.log(rawMT);
```

### Validate an MT message

```ts
import { validateMTRaw, getMTDefinition } from '@eklabdev/fix-swift-forge';

const def = getMTDefinition('103');
const result = validateMTRaw(raw, def);

if (result.valid) {
  console.log('MT103 is valid');
} else {
  result.errors.forEach((e) => console.error(e.message));
}
```

### Validate with Zod

```ts
import { parseMT, validateMTWithZod, getMTDefinition } from '@eklabdev/fix-swift-forge';

const parsed = parseMT(raw);
const def = getMTDefinition('103')!;
const zodResult = validateMTWithZod(parsed, def);

console.log(zodResult.valid);  // true or false
zodResult.errors.forEach((e) => console.error(e.path, e.message));
```

### Look up definitions

```ts
import { getMTTypes, getMTTypesByCategory, getAllMTDefinitions } from '@eklabdev/fix-swift-forge';

console.log(getMTTypes().length);         // 235+ MT message types
console.log(getMTTypesByCategory(1));     // All Category 1 (Customer Payments)
console.log(getAllMTDefinitions()[0].name); // e.g. "Request for Transfer"
```

### MT API quick reference

| Function / class      | Description |
|-----------------------|-------------|
| `parseMT(raw)`        | Parse raw MT string → `ParsedMTMessage`. |
| `MTBuilder`, `createMTBuilder(type)` | Build MT messages; `setSender`, `setReceiver`, `setField`, `build()`. |
| `validateMTRaw(raw, def?)` | Validate raw string → `ValidationResult`. |
| `validateMTParsed(msg, def?)` | Validate parsed message → `ValidationResult`. |
| `validateMTWithZod(msg, def)` | Validate with Zod schema → `{ valid, errors }`. |
| `getMTDefinition(type)`, `getMTTypes()`, `getMTTypesByCategory(cat)` | Look up definitions. |
| `maskMTRaw(raw, config)`, `maskMTParsed(msg, config)` | Mask sensitive tags. |

---

## How to use SWIFT MX (ISO 20022)

1. **Parse** ISO 20022 XML with `parseMX(xml)` to get type, namespace, header (BAH), and document body as JSON.
2. **Validate** with `validateMXRaw(xml)` or `validateMXParsed(parsed)` (optionally pass `getMXDefinition(type)`). Use `validateMXWithZod(parsed, def)` for Zod-based validation.
3. **Build** messages with `new MXBuilder(messageType)`, then `setHeader`, `setElement(path, value)` (dot-path for nested elements), and `build()`.
4. **Look up** message types with `getMXTypes()`, `getMXTypesByArea(area)` (e.g. `'pacs'`, `'camt'`), or `getMXDefinition(type)`.
5. **Mask** sensitive elements with `maskMXRaw(xml, config)` or `maskMXParsed(parsed, config)`.

All ISO 20022 business areas (pacs, camt, pain, sese, semt, seev, acmt, setr; 116+ types) have bundled definitions. Each type has one **positive** test (valid parse) and one **negative** test (non-XML input) in the test suite.

---

## SWIFT MX (ISO 20022)

### Parse an MX message

```ts
import { parseMX } from '@eklabdev/fix-swift-forge';

const xml = `<Biz>
  <AppHdr>
    <Fr><FIId><FinInstnId><BICFI>BANKBICAA</BICFI></FinInstnId></FIId></Fr>
    <To><FIId><FinInstnId><BICFI>BANKBICBB</BICFI></FinInstnId></FIId></To>
    <BizMsgIdr>MSG-001</BizMsgIdr>
    <MsgDefIdr>pacs.008.001.08</MsgDefIdr>
    <CreDt>2023-01-01T12:00:00Z</CreDt>
  </AppHdr>
  <Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
    <FIToFICstmrCdtTrf>
      <GrpHdr><MsgId>MSG-001</MsgId><CreDtTm>2023-01-01T12:00:00Z</CreDtTm><NbOfTxs>1</NbOfTxs></GrpHdr>
    </FIToFICstmrCdtTrf>
  </Document>
</Biz>`;

const msg = parseMX(xml);

console.log(msg.type);             // "pacs.008.001.08"
console.log(msg.header.from);      // "BANKBICAA"
console.log(msg.document);         // Nested JSON of Document body
```

### Build an MX message

```ts
import { MXBuilder } from '@eklabdev/fix-swift-forge';

const builder = new MXBuilder('pacs.008.001.08');
builder
  .setHeader({
    from: 'BANKBICAA',
    to: 'BANKBICBB',
    businessMessageIdentifier: 'MSG-001',
    creationDate: '2023-01-01T12:00:00Z',
  })
  .setElement('GrpHdr.MsgId', 'MSG-001')
  .setElement('GrpHdr.CreDtTm', '2023-01-01T12:00:00Z')
  .setElement('GrpHdr.NbOfTxs', '1');

const xmlOutput = builder.build();
console.log(xmlOutput);
```

### Validate an MX message

```ts
import { validateMXRaw, getMXDefinition } from '@eklabdev/fix-swift-forge';

const def = getMXDefinition('pacs.008.001.10');
const result = validateMXRaw(xml, def);
console.log(result.valid);
```

### Look up MX definitions

```ts
import { getMXTypes, getMXTypesByArea } from '@eklabdev/fix-swift-forge';

console.log(getMXTypes().length);         // 116+ MX message types
console.log(getMXTypesByArea('pacs'));     // All pacs.xxx types
console.log(getMXTypesByArea('camt'));     // All camt.xxx types
```

### MX API quick reference

| Function / class      | Description |
|-----------------------|-------------|
| `parseMX(xml)`        | Parse ISO 20022 XML → `ParsedMXMessage`. |
| `MXBuilder`, `createMXBuilder(type)` | Build MX messages; `setHeader`, `setElement(path, value)`, `build()`. |
| `validateMXRaw(xml, def?)` | Validate raw XML → `ValidationResult`. |
| `validateMXParsed(msg, def?)` | Validate parsed message → `ValidationResult`. |
| `validateMXWithZod(msg, def)` | Validate with Zod schema → `{ valid, errors }`. |
| `getMXDefinition(type)`, `getMXTypes()`, `getMXTypesByArea(area)` | Look up definitions. |
| `maskMXRaw(xml, config)`, `maskMXParsed(msg, config)` | Mask sensitive elements. |

---

## MT ↔ MX Conversion

```ts
import { loadMappings, convertMtToMx, convertMxToMt, getSupportedConversions } from '@eklabdev/fix-swift-forge';
import * as fs from 'fs';

// Load bundled mappings
const mappings = JSON.parse(
  fs.readFileSync('node_modules/@eklabdev/fix-swift-forge/definitions/swift/mappings/mt-mx-mappings.json', 'utf-8')
);
loadMappings(mappings);

// See supported conversion pairs
console.log(getSupportedConversions());
// [{ mtType: '103', mxType: 'pacs.008.001.08' }, { mtType: '202', mxType: 'pacs.009.001.08' }, ...]

// Convert MT → MX
const mxResult = convertMtToMx(rawMT103);
console.log(mxResult.message.type);    // "pacs.008.001.08"
console.log(mxResult.warnings);         // Unmapped field warnings

// Convert MX → MT
const mtResult = convertMxToMt(parsedMX, '103');
console.log(mtResult.message.type);    // "103"
```

---

## SWIFT Masking

```ts
import { maskMTRaw, maskMTParsed, maskMXRaw, maskMXParsed } from '@eklabdev/fix-swift-forge';

// Mask MT fields by tag
const maskedMT = maskMTRaw(rawMT, { fields: ['20', '59'], placeholder: '***' });

// Mask MX elements by name
const maskedMX = maskMXRaw(rawXML, { fields: ['MsgId', 'BICFI'], placeholder: '[REDACTED]' });

// Works on parsed objects too
const maskedParsedMT = maskMTParsed(parsedMT, { fields: ['20'] });
const maskedParsedMX = maskMXParsed(parsedMX, { fields: ['MsgId'] });
```

---

## License

MIT

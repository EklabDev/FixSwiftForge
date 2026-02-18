# @eklabdev/fix-swift-forge

A **TypeScript-first** FIX protocol library for parsing, validating, building, and masking FIX messages. Use it in Node.js mid-office systems, gateways, or any service that needs to generate FIX messages, validate incoming FIX, or respond to FIX sessions—without relying on Java or C# stacks.

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

- **Bundled FIX definitions**: 4.0, 4.1, 4.2, 4.3, 4.4, 5.0, 5.0 SP1, 5.0 SP2
- **Custom XML**: Use your own FIX Repository–style XML for house rules or extensions
- **Parse** raw FIX strings into a JSON-friendly structure (header, body, trailer, repeating groups)
- **Validate** raw messages or parsed objects against the loaded definition
- **Message Builder**: Fluent API to build messages with automatic BodyLength and CheckSum
- **Field masking**: Redact sensitive tags (e.g. for logging) in raw or parsed form
- **TypeScript**: Typed API and exported types; no `@types` package needed

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

## License

MIT

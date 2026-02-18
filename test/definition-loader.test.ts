
import { describe, it, expect } from 'vitest';
import { loadDefinitionFromXml } from '../src/definition-loader';
import { FIXParser } from '../src/fix-parser';
import * as path from 'path';
import * as fs from 'fs';

describe('Definition Loader', () => {
  const sampleXml = `
<fix major="4" minor="4">
  <header>
    <field name="BeginString" required="Y"/>
  </header>
  <trailer>
    <field name="CheckSum" required="Y"/>
  </trailer>
  <messages>
    <message name="NewOrderSingle" msgtype="D" msgcat="app">
      <field name="ClOrdID" required="Y"/>
      <field name="Symbol" required="Y"/>
    </message>
  </messages>
  <fields>
    <field number="8" name="BeginString" type="STRING"/>
    <field number="10" name="CheckSum" type="STRING"/>
    <field number="11" name="ClOrdID" type="STRING"/>
    <field number="55" name="Symbol" type="STRING"/>
  </fields>
</fix>
  `;

  it('should parse valid FIX XML', () => {
    const def = loadDefinitionFromXml(sampleXml);
    expect(def.major).toBe(4);
    expect(def.minor).toBe(4);
    expect(def.messagesByName.has('NewOrderSingle')).toBe(true);
    expect(def.fieldsByTag.has(55)).toBe(true);
  });

  it('should throw on invalid XML', () => {
    expect(() => loadDefinitionFromXml('<fix>')).toThrow();
  });
});

describe('FIXParser Initialization', () => {
  it('should load from bundled version 4.4', () => {
    const parser = FIXParser.fromVersion('4.4');
    expect(parser.definition.major).toBe(4);
    expect(parser.definition.minor).toBe(4);
    expect(parser.definition.messagesByName.has('NewOrderSingle')).toBe(true);
  });

  it('should load from bundled version 5.0sp2', () => {
    const parser = FIXParser.fromVersion('5.0sp2');
    expect(parser.definition.major).toBe(5);
    expect(parser.definition.minor).toBe(0);
    expect(parser.definition.servicepack).toBe(2);
  });

  it('should throw for unknown version', () => {
    expect(() => FIXParser.fromVersion('9.9' as any)).toThrow();
  });

  it('should load from custom XML string', () => {
    const xml = fs.readFileSync(path.join(__dirname, '../definitions/FIX42.xml'), 'utf-8');
    const parser = FIXParser.fromXml(xml);
    expect(parser.definition.major).toBe(4);
    expect(parser.definition.minor).toBe(2);
  });
});

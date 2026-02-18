/**
 * Tests per message type for every bundled FIX definition.
 * Ensures each message type in each FIX version has a working builder and can produce a valid message.
 */

import { describe, it, expect } from 'vitest';
import { FIXParser } from '../src/fix-parser';
import { SUPPORTED_VERSIONS } from '../src/version-map';
import type { FIXVersion } from '../src/types';

const SOH = '\x01';

/** One parser per version, created at load time to avoid creating 1000+ parsers during tests. */
const parsersByVersion = Object.fromEntries(
  SUPPORTED_VERSIONS.map((v) => [v, FIXParser.fromVersion(v as FIXVersion)])
) as Record<string, ReturnType<typeof FIXParser.fromVersion>>;

function getMessageTypesForVersion(version: FIXVersion): [string, { name: string }][] {
  const parser = parsersByVersion[version];
  return Array.from(parser.definition.messagesByType.entries());
}

describe('All FIX definitions – message type coverage', () => {
  for (const version of SUPPORTED_VERSIONS) {
    const messageTypes = getMessageTypesForVersion(version as FIXVersion);
    const parser = parsersByVersion[version];

    describe(`FIX ${version}`, () => {
      it.each(messageTypes)(
        'message type %s (%s) – getBuilder and build',
        (msgType: string, _msgDef: { name: string }) => {
          const builder = parser.getBuilder(msgType);
          expect(builder).toBeDefined();

          const raw = builder.build();
          expect(raw).toBeTruthy();
          expect(typeof raw).toBe('string');
          expect(raw).toContain(`35=${msgType}`);
          expect(raw).toMatch(/10=\d{3}/);
          expect(raw).toContain(SOH);
        }
      );

      it(`has ${messageTypes.length} message types defined`, () => {
        expect(messageTypes.length).toBeGreaterThan(0);
      });
    });
  }
});

describe('All FIX definitions – parse round-trip per message type', () => {
  for (const version of SUPPORTED_VERSIONS) {
    const messageTypes = getMessageTypesForVersion(version as FIXVersion);
    const parser = parsersByVersion[version];

    describe(`FIX ${version}`, () => {
      it.each(messageTypes)(
        'message type %s (%s) – build then parse',
        (msgType: string, msgDef: { name: string }) => {
          const builder = parser.getBuilder(msgType);
          const raw = builder.build();
          const parsed = parser.parse(raw);
          expect(parsed.msgType).toBe(msgType);
          expect(parsed.msgTypeName).toBe(msgDef.name);
        }
      );
    });
  }
});

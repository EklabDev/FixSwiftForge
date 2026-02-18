/**
 * FIXParser — main parser class that binds to a loaded definition.
 */

import * as fs from 'fs';
import type {
  FIXDefinition,
  FIXVersion,
  ParsedMessage,
  ValidationResult,
  MaskConfig,
  CreateParserOptions,
  CreateParserByVersionOptions,
  CreateParserFromXmlOptions,
  CreateParserFromPathOptions,
} from './types';
import { loadDefinitionFromXml } from './definition-loader';
import { getDefinitionPath, SUPPORTED_VERSIONS } from './version-map';
import { parseMessage } from './parser';
import { validateRaw, validateParsed } from './validator';
import { MessageBuilder, createBuilder } from './builder';
import { maskRaw, maskParsed } from './masking';

export class FIXParser {
  /** The loaded FIX definition model */
  readonly definition: FIXDefinition;

  private constructor(definition: FIXDefinition) {
    this.definition = definition;
  }

  /**
   * Create a parser from a bundled FIX version.
   */
  static fromVersion(version: FIXVersion): FIXParser {
    const filePath = getDefinitionPath(version);
    let xmlContent: string;
    try {
      xmlContent = fs.readFileSync(filePath, 'utf-8');
    } catch (err: any) {
      throw new Error(
        `Failed to load bundled FIX definition for version "${version}": ${err.message}`
      );
    }
    const definition = loadDefinitionFromXml(xmlContent);
    return new FIXParser(definition);
  }

  /**
   * Create a parser from custom XML (string, Buffer, or file path).
   */
  static fromXml(xml: string | Buffer): FIXParser {
    const xmlStr = typeof xml === 'string' ? xml : xml.toString('utf-8');
    const definition = loadDefinitionFromXml(xmlStr);
    return new FIXParser(definition);
  }

  /**
   * Create a parser from a file path to a FIX XML definition.
   */
  static fromPath(filePath: string): FIXParser {
    let xmlContent: string;
    try {
      xmlContent = fs.readFileSync(filePath, 'utf-8');
    } catch (err: any) {
      throw new Error(
        `Failed to load FIX definition from path "${filePath}": ${err.message}`
      );
    }
    const definition = loadDefinitionFromXml(xmlContent);
    return new FIXParser(definition);
  }

  /**
   * Parse a raw FIX message string to a structured object.
   */
  parse(raw: string): ParsedMessage {
    return parseMessage(raw, this.definition);
  }

  /**
   * Validate a raw FIX message string against the definition.
   */
  validateRaw(raw: string): ValidationResult {
    return validateRaw(raw, this.definition);
  }

  /**
   * Validate a parsed message object against the definition.
   */
  validateJson(msg: ParsedMessage): ValidationResult {
    return validateParsed(msg, this.definition);
  }

  /**
   * Get a MessageBuilder for a given message type (e.g. "D" for NewOrderSingle).
   */
  getBuilder(msgType: string): MessageBuilder {
    return createBuilder(this.definition, msgType);
  }

  /**
   * Mask a raw FIX message string, replacing configured field values with a placeholder.
   */
  maskRaw(raw: string, config: MaskConfig): string {
    return maskRaw(raw, config, this.definition);
  }

  /**
   * Mask a parsed message, replacing configured field values with a placeholder.
   */
  maskParsed(msg: ParsedMessage, config: MaskConfig): ParsedMessage {
    return maskParsed(msg, config, this.definition);
  }
}

/**
 * Factory function to create a parser from options.
 */
export function createParser(options: CreateParserOptions): FIXParser {
  if ('version' in options) {
    return FIXParser.fromVersion((options as CreateParserByVersionOptions).version);
  }
  if ('xml' in options) {
    return FIXParser.fromXml((options as CreateParserFromXmlOptions).xml);
  }
  if ('path' in options) {
    return FIXParser.fromPath((options as CreateParserFromPathOptions).path);
  }
  throw new Error(
    'Invalid options: provide "version", "xml", or "path"'
  );
}

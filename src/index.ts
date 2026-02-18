/**
 * @eklabdev/fix-swift-forge
 *
 * A type-safe, XML-driven FIX protocol parser for TypeScript.
 * Supports FIX 4.0–5.0 SP2, custom definitions, parsing, validation,
 * message building, and field masking.
 */

export { FIXParser, createParser } from './fix-parser';
export { MessageBuilder } from './builder';
export { loadDefinitionFromXml } from './definition-loader';
export { SUPPORTED_VERSIONS, getDefinitionPath } from './version-map';

// Re-export all types
export type {
  FIXVersion,
  FIXDefinition,
  FieldDef,
  FieldRef,
  GroupDef,
  ComponentRef,
  ComponentDef,
  MessageDef,
  ParsedMessage,
  ParsedField,
  ParsedGroupEntry,
  ValidationResult,
  ValidationError,
  MaskConfig,
  CreateParserOptions,
  CreateParserByVersionOptions,
  CreateParserFromXmlOptions,
  CreateParserFromPathOptions,
} from './types';

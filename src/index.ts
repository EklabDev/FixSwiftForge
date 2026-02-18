/**
 * @eklabdev/fix-swift-forge
 *
 * A type-safe FIX, SWIFT MT (ISO 15022), and MX (ISO 20022) toolkit for TypeScript.
 * Supports FIX 4.0–5.0 SP2, all MT categories 1–9, all ISO 20022 business areas,
 * parsing, validation, message building, conversion, and field masking.
 */

// FIX exports
export { FIXParser, createParser } from './fix-parser';
export { MessageBuilder } from './builder';
export { loadDefinitionFromXml } from './definition-loader';
export { SUPPORTED_VERSIONS, getDefinitionPath } from './version-map';

// MT (ISO 15022) exports
export {
  parseMT,
  MTBuilder,
  createMTBuilder,
  validateMTRaw,
  validateMTParsed,
  getMTDefinition,
  getAllMTDefinitions,
  getMTTypes,
  getMTTypesByCategory,
  BasicHeaderSchema,
  AppHeaderSchema,
  UserHeaderSchema,
  TrailerBlockSchema,
  MTFieldSchema,
  createMTMessageSchema,
  validateMTWithZod,
} from './mt';

// MX (ISO 20022) exports
export {
  parseMX,
  MXBuilder,
  createMXBuilder,
  validateMXRaw,
  validateMXParsed,
  getMXDefinition,
  getAllMXDefinitions,
  getMXTypes,
  getMXTypesByArea,
  MXAppHeaderSchema,
  createElementSchema,
  createMXMessageSchema,
  validateMXWithZod,
} from './mx';

// SWIFT conversion and masking exports
export {
  convertMtToMx,
  convertMxToMt,
  getSupportedConversions,
  loadMappings,
  maskMTRaw,
  maskMTParsed,
  maskMXRaw,
  maskMXParsed,
} from './swift';

// FIX types
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

// MT types
export type {
  BasicHeader,
  AppHeader,
  UserHeader,
  TrailerBlock,
  MTField,
  MTFieldDef,
  MTMessageDef,
  ParsedMTMessage,
} from './mt';

// MX types
export type {
  MXAppHeader,
  MXElementDef,
  MXMessageDef,
  ParsedMXMessage,
} from './mx';

// SWIFT conversion types
export type {
  ConversionMapping,
  FieldMapping,
  FieldMappingDirection,
  ConversionResult,
  ConversionWarning,
  SupportedConversion,
} from './swift';

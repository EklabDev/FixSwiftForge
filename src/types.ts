/**
 * Core types for @eklabdev/fix-swift-forge
 */

/** Supported bundled FIX version identifiers */
export type FIXVersion =
  | '4.0' | '4.1' | '4.2' | '4.3' | '4.4'
  | '5.0' | '5.0sp1' | '5.0sp2';

/** A FIX field definition from the XML */
export interface FieldDef {
  tag: number;
  name: string;
  type: string;
  values: Map<string, string>; // enum value → description
}

/** A field reference within a message or component */
export interface FieldRef {
  name: string;
  required: boolean;
}

/** A repeating group definition */
export interface GroupDef {
  name: string;
  required: boolean;
  /** The counter field name (e.g. NoPartyIDs) */
  counterField: string;
  fields: FieldRef[];
  groups: GroupDef[];
  components: ComponentRef[];
}

/** A component reference */
export interface ComponentRef {
  name: string;
  required: boolean;
}

/** A component definition */
export interface ComponentDef {
  name: string;
  fields: FieldRef[];
  groups: GroupDef[];
  components: ComponentRef[];
}

/** A message definition */
export interface MessageDef {
  name: string;
  msgtype: string;
  msgcat: string; // 'admin' | 'app'
  fields: FieldRef[];
  groups: GroupDef[];
  components: ComponentRef[];
}

/** The in-memory FIX definition model */
export interface FIXDefinition {
  major: number;
  minor: number;
  servicepack: number;
  /** Fields indexed by tag number */
  fieldsByTag: Map<number, FieldDef>;
  /** Fields indexed by name */
  fieldsByName: Map<string, FieldDef>;
  /** Message definitions indexed by MsgType */
  messagesByType: Map<string, MessageDef>;
  /** Message definitions indexed by name */
  messagesByName: Map<string, MessageDef>;
  /** Component definitions indexed by name */
  components: Map<string, ComponentDef>;
  /** Header field/component refs */
  header: { fields: FieldRef[]; groups: GroupDef[]; components: ComponentRef[] };
  /** Trailer field/component refs */
  trailer: { fields: FieldRef[]; groups: GroupDef[]; components: ComponentRef[] };
}

/** Parsed FIX message field */
export interface ParsedField {
  tag: number;
  name: string;
  value: string;
  /** Enum description if the value matches a known enum */
  enumDescription?: string;
}

/** A parsed repeating group entry */
export interface ParsedGroupEntry {
  [fieldName: string]: string | ParsedGroupEntry[] | undefined;
}

/** Parsed FIX message */
export interface ParsedMessage {
  /** BeginString value (e.g. "FIX.4.4") */
  beginString: string;
  /** MsgType value (e.g. "D") */
  msgType: string;
  /** Message type name (e.g. "NewOrderSingle") */
  msgTypeName: string;
  /** Body length from Tag 9 */
  bodyLength: number;
  /** Checksum from Tag 10 */
  checkSum: string;
  /** All header fields */
  header: Record<string, string>;
  /** All body fields (non-header, non-trailer) */
  body: Record<string, string | ParsedGroupEntry[]>;
  /** All trailer fields */
  trailer: Record<string, string>;
  /** Raw fields in order as tag/value pairs */
  fields: ParsedField[];
}

/** Validation error */
export interface ValidationError {
  tag?: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/** Options for creating a parser by version */
export interface CreateParserByVersionOptions {
  version: FIXVersion;
}

/** Options for creating a parser from custom XML */
export interface CreateParserFromXmlOptions {
  xml: string | Buffer;
}

/** Options for creating a parser from an XML file path */
export interface CreateParserFromPathOptions {
  path: string;
}

/** Union of parser creation options */
export type CreateParserOptions =
  | CreateParserByVersionOptions
  | CreateParserFromXmlOptions
  | CreateParserFromPathOptions;

/** Field masking configuration */
export interface MaskConfig {
  /** Tag numbers or field names to mask */
  fields: (number | string)[];
  /** Placeholder string for masked values (default: "***") */
  placeholder?: string;
}

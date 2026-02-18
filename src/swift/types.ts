/**
 * SWIFT conversion type definitions
 */

/** Direction of field mapping between MT and MX formats */
export type FieldMappingDirection = 'mt-to-mx' | 'mx-to-mt' | 'both';

/** Mapping for a single field between MT tag and MX path */
export interface FieldMapping {
  mtTag: string;
  mxPath: string;
  transform?: string; // e.g. "splitDate", "combineCurrencyAmount"
  direction: FieldMappingDirection;
}

/** Complete mapping configuration between an MT type and MX type */
export interface ConversionMapping {
  mtType: string; // e.g. "103"
  mxType: string; // e.g. "pacs.008.001.08"
  fieldMappings: FieldMapping[];
}

/** Warning produced during conversion */
export interface ConversionWarning {
  sourceField: string;
  message: string;
}

/** Result of a conversion operation */
export interface ConversionResult<T> {
  message: T;
  warnings: ConversionWarning[];
}

/** Supported MT/MX conversion pair */
export interface SupportedConversion {
  mtType: string;
  mxType: string;
}

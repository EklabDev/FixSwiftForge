export { parseMX } from './parser';
export { MXBuilder, createMXBuilder } from './builder';
export { validateMXRaw, validateMXParsed } from './validator';
export {
  getMXDefinition,
  getAllMXDefinitions,
  getMXTypes,
  getMXTypesByArea,
  clearMXDefinitionCache,
} from './definition-loader';
export {
  MXAppHeaderSchema,
  createElementSchema,
  createMXMessageSchema,
  validateMXWithZod,
} from './schemas';

export type {
  MXAppHeader,
  MXElementDef,
  MXMessageDef,
  ParsedMXMessage,
} from './types';

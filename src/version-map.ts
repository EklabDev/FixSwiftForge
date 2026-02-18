/**
 * Maps version identifiers to bundled FIX XML file paths.
 */

import * as path from 'path';
import type { FIXVersion } from './types';

const DEFINITIONS_DIR = path.resolve(__dirname, '..', 'definitions');

/** Map of version identifier → XML file name */
const VERSION_FILES: Record<FIXVersion, string> = {
  '4.0': 'FIX40.xml',
  '4.1': 'FIX41.xml',
  '4.2': 'FIX42.xml',
  '4.3': 'FIX43.xml',
  '4.4': 'FIX44.xml',
  '5.0': 'FIX50.xml',
  '5.0sp1': 'FIX50SP1.xml',
  '5.0sp2': 'FIX50SP2.xml',
};

/** All supported version identifiers */
export const SUPPORTED_VERSIONS: FIXVersion[] = Object.keys(VERSION_FILES) as FIXVersion[];

/**
 * Get the absolute path to the bundled XML for a given version.
 * Throws if the version is not supported.
 */
export function getDefinitionPath(version: FIXVersion): string {
  const file = VERSION_FILES[version];
  if (!file) {
    throw new Error(
      `Unknown FIX version "${version}". Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`
    );
  }
  return path.join(DEFINITIONS_DIR, file);
}

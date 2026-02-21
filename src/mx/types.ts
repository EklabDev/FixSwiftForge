/**
 * Type definitions for ISO 20022 MX messages
 */

/** Application header for MX messages (sender, receiver, identifiers) */
export interface MXAppHeader {
  from: string;
  to: string;
  businessMessageIdentifier: string;
  messageDefinitionIdentifier: string;
  creationDate: string;
}

/** Element definition in the MX schema model */
export interface MXElementDef {
  name: string;
  type: string;
  minOccurs: number;
  maxOccurs: number | "unbounded";
  children?: MXElementDef[];
}

/** Complete MX message definition */
export interface MXMessageDef {
  type: string;
  name: string;
  namespace: string;
  rootElement: string;
  elements: MXElementDef[];
}

/** Parsed MX message with header and document content */
export interface ParsedMXMessage {
  type: string;
  namespace: string;
  header: MXAppHeader;
  document: Record<string, any>;
  raw: string;
}

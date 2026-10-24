export type CSPDirective =
  | 'defaultSrc'
  | 'scriptSrc'
  | 'styleSrc'
  | 'imgSrc'
  | 'fontSrc'
  | 'connectSrc'
  | 'frameSrc'
  | 'objectSrc'
  | 'mediaSrc'
  | 'workerSrc'
  | 'manifestSrc';

export enum CSPStrategy {
  STRICT = 'strict',
  BALANCED = 'balanced',
  PERMISSIVE = 'permissive',
}

export interface CSPPolicy {
  directives: Partial<Record<CSPDirective, string[]>>;
  reportOnly: boolean;
  nonce?: string;
  hashAlgorithms: ('sha256' | 'sha384' | 'sha512')[];
}

export interface CSPViolation {
  documentUri: string;
  violatedDirective: string;
  blockedUri: string;
  originalPolicy: string;
  disposition: 'enforce' | 'report';
}

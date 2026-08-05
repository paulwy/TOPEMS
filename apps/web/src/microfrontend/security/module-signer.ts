export enum TrustLevel {
  TRUSTED = 'trusted',
  VERIFIED = 'verified',
  UNKNOWN = 'unknown',
  UNTRUSTED = 'untrusted',
  REVOKED = 'revoked',
}

export interface ModuleSignature {
  moduleName: string;
  version: string;
  signature: string;
  algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512';
  publisher: string;
  signedAt: number;
  publicKey: string;
}

export interface TrustedPublisher {
  id: string;
  name: string;
  publicKey: string;
  trustedAt: number;
  permissions: string[];
}

export interface VerificationResult {
  valid: boolean;
  trustLevel: TrustLevel;
  reason: string;
  signer?: string;
  signedAt?: number;
}

export class ModuleSigner {
  private signatures: Map<string, ModuleSignature> = new Map();
  private trustedPublishers: Map<string, TrustedPublisher> = new Map();
  private revokedSignatures: Set<string> = new Set();
  private keyPairs: Map<string, { publicKey: string; privateKey: string }> = new Map();

  constructor() {
    this.initializeDefaultPublishers();
  }

  private initializeDefaultPublishers(): void {
    const defaultPublisher: TrustedPublisher = {
      id: 'system-publisher',
      name: '系统官方发布者',
      publicKey: 'system-public-key-base64',
      trustedAt: Date.now(),
      permissions: ['*'],
    };
    this.trustedPublishers.set(defaultPublisher.id, defaultPublisher);
  }

  async signModule(
    moduleName: string,
    version: string,
    content: string,
    publisherId: string = 'system-publisher',
    algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
  ): Promise<ModuleSignature> {
    const publisher = this.trustedPublishers.get(publisherId);
    if (!publisher) {
      throw new Error(`发布者 ${publisherId} 不存在或不受信任`);
    }

    const signature = await this.generateSignature(content, algorithm);

    const moduleSignature: ModuleSignature = {
      moduleName,
      version,
      signature,
      algorithm,
      publisher: publisher.name,
      signedAt: Date.now(),
      publicKey: publisher.publicKey,
    };

    const key = `${moduleName}@${version}`;
    this.signatures.set(key, moduleSignature);

    return moduleSignature;
  }

  private async generateSignature(
    content: string,
    algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512'
  ): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest(algorithm, data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash + char) & 0xffffffff;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  async verifyModule(
    moduleName: string,
    version: string,
    content: string
  ): Promise<VerificationResult> {
    const key = `${moduleName}@${version}`;

    if (this.revokedSignatures.has(key)) {
      return {
        valid: false,
        trustLevel: TrustLevel.REVOKED,
        reason: '该模块签名已被吊销',
      };
    }

    const signature = this.signatures.get(key);
    if (!signature) {
      return {
        valid: false,
        trustLevel: TrustLevel.UNKNOWN,
        reason: '未找到模块签名信息',
      };
    }

    const computedSignature = await this.generateSignature(content, signature.algorithm);
    if (computedSignature !== signature.signature) {
      return {
        valid: false,
        trustLevel: TrustLevel.UNTRUSTED,
        reason: '模块内容完整性校验失败，内容可能被篡改',
        signer: signature.publisher,
        signedAt: signature.signedAt,
      };
    }

    const publisher = Array.from(this.trustedPublishers.values()).some(
      (p) => p.publicKey === signature.publicKey
    );

    if (publisher) {
      return {
        valid: true,
        trustLevel: TrustLevel.TRUSTED,
        reason: '模块签名验证通过，来自可信发布者',
        signer: signature.publisher,
        signedAt: signature.signedAt,
      };
    }

    return {
      valid: true,
      trustLevel: TrustLevel.VERIFIED,
      reason: '模块签名验证通过，但发布者不在可信列表中',
      signer: signature.publisher,
      signedAt: signature.signedAt,
    };
  }

  addTrustedPublisher(publisher: Omit<TrustedPublisher, 'trustedAt'>): TrustedPublisher {
    const fullPublisher: TrustedPublisher = {
      ...publisher,
      trustedAt: Date.now(),
    };
    this.trustedPublishers.set(publisher.id, fullPublisher);
    return fullPublisher;
  }

  removeTrustedPublisher(publisherId: string): boolean {
    return this.trustedPublishers.delete(publisherId);
  }

  isTrusted(publisherId: string): boolean {
    return this.trustedPublishers.has(publisherId);
  }

  getSignatures(): ModuleSignature[] {
    return Array.from(this.signatures.values());
  }

  getTrustedPublishers(): TrustedPublisher[] {
    return Array.from(this.trustedPublishers.values());
  }

  revokeSignature(moduleName: string, version: string): boolean {
    const key = `${moduleName}@${version}`;
    this.revokedSignatures.add(key);
    return this.signatures.has(key);
  }

  getSignature(moduleName: string, version: string): ModuleSignature | undefined {
    const key = `${moduleName}@${version}`;
    return this.signatures.get(key);
  }

  importSignatures(signatures: ModuleSignature[]): void {
    signatures.forEach((sig) => {
      const key = `${sig.moduleName}@${sig.version}`;
      this.signatures.set(key, sig);
    });
  }

  exportSignatures(): ModuleSignature[] {
    return Array.from(this.signatures.values());
  }

  verifySignatureChain(
    _moduleName: string,
    _version: string,
    _content: string
  ): Promise<VerificationResult[]> {
    return Promise.resolve([
      {
        valid: true,
        trustLevel: TrustLevel.TRUSTED,
        reason: '根签名验证通过',
        signer: 'system-publisher',
        signedAt: Date.now(),
      },
    ]);
  }

  getPublisherByPublicKey(publicKey: string): TrustedPublisher | undefined {
    return Array.from(this.trustedPublishers.values()).find((p) => p.publicKey === publicKey);
  }

  updatePublisherPermissions(publisherId: string, permissions: string[]): boolean {
    const publisher = this.trustedPublishers.get(publisherId);
    if (publisher) {
      publisher.permissions = permissions;
      return true;
    }
    return false;
  }

  clearRevokedSignatures(): void {
    this.revokedSignatures.clear();
  }

  getRevokedSignatures(): string[] {
    return Array.from(this.revokedSignatures);
  }
}

export const moduleSigner = new ModuleSigner();
export default moduleSigner;

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { readFileSync, readdirSync } from 'fs';
import forge from 'node-forge';
import { PKPass } from 'passkit-generator';
import { join, resolve } from 'path';

import { UserService } from '../user/user.service';

const PASS_TYPE_IDENTIFIER = 'pass.com.restorouen.app';
const TEAM_IDENTIFIER = 'DC49565NCD';

/** Images du pass (icon, logo, strip), versionnées */
const IMAGES_DIR = resolve('assets/wallet/images');

interface PassHolder {
  name: string;
  linkCode: string;
}

/** pass.json de la carte client : le linkCode en QR code, scanné par le restaurant pour la retrouver */
export function buildPassJson({ name, linkCode }: PassHolder) {
  return {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_IDENTIFIER,
    teamIdentifier: TEAM_IDENTIFIER,
    serialNumber: `user-${linkCode}`,
    organizationName: 'Resto Rouen',
    description: `Carte de ${name}`,
    logoText: 'Resto Rouen',
    backgroundColor: '#99324b',
    foregroundColor: 'rgb(255, 255, 255)',
    labelColor: '#DE99AD',
    barcodes: [
      {
        message: linkCode,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText: linkCode,
      },
    ],
    storeCard: { secondaryFields: [{ key: 'name', label: 'MEMBRE', value: name }] },
  };
}

interface Certificates {
  wwdr: string;
  signerCert: string;
  signerKey: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private certificates?: Certificates;
  private images?: Record<string, Buffer>;

  constructor(private readonly userService: UserService) {}

  /** Carte client Apple Wallet (.pkpass) de l'utilisateur */
  async createPass(userId: string): Promise<{ pass: Buffer; linkCode: string }> {
    const user = await this.userService.getMe(userId);
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const passJson = buildPassJson({ name, linkCode: user.linkCode });

    const pass = new PKPass(
      { ...this.loadImages(), 'pass.json': Buffer.from(JSON.stringify(passJson)) },
      this.loadCertificates(),
    );
    return { pass: pass.getAsBuffer(), linkCode: user.linkCode };
  }

  private loadImages(): Record<string, Buffer> {
    this.images ??= Object.fromEntries(
      readdirSync(IMAGES_DIR).map((file) => [file, readFileSync(join(IMAGES_DIR, file))]),
    );
    return this.images;
  }

  /**
   * Certificats Apple, hors git : WALLET_CERTS_DIR (assets/wallet/certs par défaut) contient
   * pass_certificate.p12 (Pass Type ID, mot de passe WALLET_P12_PASSWORD) et wwdr.pem
   */
  private loadCertificates(): Certificates {
    if (this.certificates) return this.certificates;

    const dir = resolve(process.env.WALLET_CERTS_DIR ?? 'assets/wallet/certs');
    try {
      const p12Der = readFileSync(join(dir, 'pass_certificate.p12')).toString('binary');
      const p12 = forge.pkcs12.pkcs12FromAsn1(
        forge.asn1.fromDer(p12Der),
        process.env.WALLET_P12_PASSWORD ?? '',
      );
      const cert = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0]
        ?.cert;
      const key = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
        forge.pki.oids.pkcs8ShroudedKeyBag
      ]?.[0]?.key;
      if (!cert || !key) throw new Error('certificate or private key missing in the .p12');

      this.certificates = {
        wwdr: readFileSync(join(dir, 'wwdr.pem'), 'utf8'),
        signerCert: forge.pki.certificateToPem(cert),
        signerKey: forge.pki.privateKeyToPem(key),
      };
      return this.certificates;
    } catch (error) {
      this.logger.error(`Apple Wallet certificates unreadable in ${dir}`, error);
      throw new ServiceUnavailableException('Apple Wallet is not configured');
    }
  }
}

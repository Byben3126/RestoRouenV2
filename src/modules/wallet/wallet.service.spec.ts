import { ServiceUnavailableException } from '@nestjs/common';

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import forge from 'node-forge';
import { tmpdir } from 'os';
import { join } from 'path';

import { UserService } from '../user/user.service';
import { WalletService, buildPassJson } from './wallet.service';

/** Certificat auto-signé : Apple refuserait le pass, mais il se construit et se signe */
function writeSelfSignedCertificates(dir: string, password: string): void {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 24 * 3600 * 1000);
  const attrs = [{ name: 'commonName', value: 'Test Pass' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, { algorithm: '3des' });
  writeFileSync(
    join(dir, 'pass_certificate.p12'),
    Buffer.from(forge.asn1.toDer(p12).getBytes(), 'binary'),
  );
  writeFileSync(join(dir, 'wwdr.pem'), forge.pki.certificateToPem(cert));
}

describe('WalletService', () => {
  const user = { firstName: 'Jean', lastName: 'Dupont', linkCode: 'AB12CD34' };
  const userService = { getMe: jest.fn().mockResolvedValue(user) } as unknown as UserService;
  let certsDir: string;

  beforeAll(() => {
    certsDir = mkdtempSync(join(tmpdir(), 'wallet-certs-'));
    writeSelfSignedCertificates(certsDir, 'secret');
  });

  afterAll(() => rmSync(certsDir, { recursive: true, force: true }));

  beforeEach(() => {
    process.env.WALLET_CERTS_DIR = certsDir;
    process.env.WALLET_P12_PASSWORD = 'secret';
  });

  afterEach(() => {
    delete process.env.WALLET_CERTS_DIR;
    delete process.env.WALLET_P12_PASSWORD;
  });

  it('builds a store card whose QR code is the link code of the user', () => {
    expect(buildPassJson({ name: 'Jean Dupont', linkCode: 'AB12CD34' })).toMatchObject({
      passTypeIdentifier: 'pass.com.restorouen.app',
      teamIdentifier: 'DC49565NCD',
      serialNumber: 'user-AB12CD34',
      barcodes: [{ message: 'AB12CD34', format: 'PKBarcodeFormatQR', altText: 'AB12CD34' }],
      storeCard: { secondaryFields: [{ key: 'name', label: 'MEMBRE', value: 'Jean Dupont' }] },
    });
  });

  it('signs a .pkpass with the pass, its images, the manifest and the signature', async () => {
    const { pass, linkCode } = await new WalletService(userService).createPass('user-1');

    expect(linkCode).toBe('AB12CD34');
    expect(pass.subarray(0, 2).toString()).toBe('PK');
    for (const file of ['pass.json', 'icon.png', 'strip@2x.png', 'manifest.json', 'signature']) {
      expect(pass.includes(file)).toBe(true);
    }
  });

  it('answers 503 with a wrong certificate password', async () => {
    process.env.WALLET_P12_PASSWORD = 'wrong';

    await expect(new WalletService(userService).createPass('user-1')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('answers 503 without certificates', async () => {
    process.env.WALLET_CERTS_DIR = join(certsDir, 'missing');

    await expect(new WalletService(userService).createPass('user-1')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});

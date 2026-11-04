const { detectKind, matchesExtension } = require('../../src/utils/fileSignature');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PDF = Buffer.from('%PDF-1.7\n%âãÏÓ');
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42')]);

describe('fileSignature', () => {
  test('detects common formats from their leading bytes', () => {
    expect(detectKind(PNG)).toBe('png');
    expect(detectKind(JPG)).toBe('jpeg');
    expect(detectKind(PDF)).toBe('pdf');
    expect(detectKind(MP4)).toBe('mp4');
    expect(detectKind(Buffer.from('PK\x03\x04rest', 'latin1'))).toBe('zip');
  });

  test('plain text is recognised, binary garbage is not', () => {
    expect(detectKind(Buffer.from('Hello Ethiopia\nሰላም'))).toBe('text');
    expect(detectKind(Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]))).toBeNull();
    expect(detectKind(Buffer.alloc(0))).toBeNull();
  });

  test('an HTML/script payload renamed to .png is rejected', () => {
    const kind = detectKind(Buffer.from('<html><script>alert(1)</script></html>'));
    expect(matchesExtension('.png', kind)).toBe(false);
    expect(matchesExtension('.pdf', kind)).toBe(false);
  });

  test('extension must agree with detected content', () => {
    expect(matchesExtension('.png', 'png')).toBe(true);
    expect(matchesExtension('.PNG', 'png')).toBe(true);
    expect(matchesExtension('.mov', 'mp4')).toBe(true);
    expect(matchesExtension('.docx', 'zip')).toBe(true);
    expect(matchesExtension('.jpg', 'png')).toBe(false);
    expect(matchesExtension('.svg', 'text')).toBe(false);
    expect(matchesExtension('.exe', 'zip')).toBe(false);
  });
});

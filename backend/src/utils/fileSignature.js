/**
 * Magic-byte (file signature) detection for uploads.
 *
 * Extension checks alone are trivially bypassed (rename malware.html -> malware.png),
 * so every uploaded file is also verified against its real leading bytes.
 * No third-party dependency on purpose: file-type is ESM-only and this project is CommonJS.
 */

const startsWith = (buf, bytes, offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

const ascii = (buf, offset, text) =>
  buf.length >= offset + text.length && buf.toString('latin1', offset, offset + text.length) === text;

const looksLikeText = (buf) => {
  if (buf.length === 0) return false;
  for (let i = 0; i < buf.length; i += 1) {
    const b = buf[i];
    // NUL or most control chars => binary
    if (b === 0 || (b < 9) || (b > 13 && b < 32)) return false;
  }
  return true;
};

/** Returns a detected kind string, or null when the content is not recognised. */
const detectKind = (buf) => {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (ascii(buf, 0, 'GIF87a') || ascii(buf, 0, 'GIF89a')) return 'gif';
  if (ascii(buf, 0, 'RIFF') && ascii(buf, 8, 'WEBP')) return 'webp';
  if (ascii(buf, 0, 'RIFF') && ascii(buf, 8, 'AVI ')) return 'avi';
  if (ascii(buf, 0, '%PDF')) return 'pdf';
  if (ascii(buf, 4, 'ftyp')) return 'mp4'; // mp4 / mov family (ISO base media)
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return 'webm'; // EBML (webm/mkv)
  if (ascii(buf, 0, 'OggS')) return 'ogg';
  if (startsWith(buf, [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11])) return 'wmv';
  if (ascii(buf, 0, 'FLV') && buf[3] === 0x01) return 'flv';
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) return 'zip'; // docx container
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole'; // legacy .doc
  if (looksLikeText(buf)) return 'text';
  return null;
};

/** Which detected kinds are acceptable for each file extension. */
const EXTENSION_KINDS = {
  '.jpg': ['jpeg'],
  '.jpeg': ['jpeg'],
  '.png': ['png'],
  '.gif': ['gif'],
  '.webp': ['webp'],
  '.mp4': ['mp4'],
  '.mov': ['mp4'],
  '.webm': ['webm'],
  '.ogg': ['ogg'],
  '.avi': ['avi'],
  '.wmv': ['wmv'],
  '.flv': ['flv'],
  '.pdf': ['pdf'],
  '.doc': ['ole'],
  '.docx': ['zip'],
  '.txt': ['text'],
};

const matchesExtension = (extension, kind) => {
  const allowed = EXTENSION_KINDS[String(extension || '').toLowerCase()];
  return Boolean(allowed && kind && allowed.includes(kind));
};

module.exports = { detectKind, matchesExtension, EXTENSION_KINDS };

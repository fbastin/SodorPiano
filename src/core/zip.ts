// Minimal ZIP reader for compressed MusicXML (.mxl) and MuseScore (.mscz)
// files. Both are plain ZIP archives with stored or deflated entries, which
// the browser can inflate natively through DecompressionStream — no library
// needed. ZIP64 and encrypted archives are not supported: score files never
// use them.

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
}

export const isZip = (bytes: Uint8Array): boolean =>
  bytes.length >= 4 &&
  bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

export class ZipArchive {
  private entries = new Map<string, ZipEntry>();
  private view: DataView;

  constructor(private bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.readCentralDirectory();
  }

  get names(): string[] {
    return [...this.entries.keys()];
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  async readText(name: string): Promise<string> {
    return decodeText(await this.read(name));
  }

  async read(name: string): Promise<Uint8Array> {
    const entry = this.entries.get(name);
    if (!entry) throw new Error(`Missing file in archive: ${name}`);

    const at = entry.localOffset;
    if (this.view.getUint32(at, true) !== LOCAL_SIGNATURE) {
      throw new Error(`Corrupt archive entry: ${name}`);
    }
    // The local header repeats the name and may carry a different extra
    // field than the central directory, so its own lengths must be used.
    const start = at + 30 + this.view.getUint16(at + 26, true) + this.view.getUint16(at + 28, true);
    const data = this.bytes.subarray(start, start + entry.compressedSize);

    if (entry.method === 0) return data;
    if (entry.method === 8) return inflateRaw(data);
    throw new Error(`Unsupported compression method ${entry.method} for ${name}`);
  }

  private readCentralDirectory() {
    const eocd = this.findEndOfCentralDirectory();
    const count = this.view.getUint16(eocd + 10, true);
    let at = this.view.getUint32(eocd + 16, true);
    const utf8 = new TextDecoder('utf-8');

    for (let i = 0; i < count; i++) {
      if (this.view.getUint32(at, true) !== CENTRAL_SIGNATURE) {
        throw new Error('Corrupt archive: bad central directory');
      }
      const nameLength = this.view.getUint16(at + 28, true);
      const extraLength = this.view.getUint16(at + 30, true);
      const commentLength = this.view.getUint16(at + 32, true);
      const name = utf8.decode(this.bytes.subarray(at + 46, at + 46 + nameLength));
      this.entries.set(name, {
        name,
        method: this.view.getUint16(at + 10, true),
        compressedSize: this.view.getUint32(at + 20, true),
        localOffset: this.view.getUint32(at + 42, true),
      });
      at += 46 + nameLength + extraLength + commentLength;
    }
  }

  // The end-of-central-directory record sits at the very end, followed only
  // by an optional comment of at most 65535 bytes: scan backwards for it.
  private findEndOfCentralDirectory(): number {
    const last = this.bytes.length - 22;
    const first = Math.max(0, last - 65535);
    for (let at = last; at >= first; at--) {
      if (this.view.getUint32(at, true) === EOCD_SIGNATURE) return at;
    }
    throw new Error('Not a valid ZIP archive');
  }
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// MusicXML may be written in UTF-16 (the spec allows it); MuseScore writes
// UTF-8. The byte-order mark tells them apart.
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  return new TextDecoder('utf-8').decode(bytes);
}

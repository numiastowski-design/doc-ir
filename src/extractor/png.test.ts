import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { encodePng, encodePngDeflate } from "./png";

/** A PNG is checked on its BYTES, not on the absence of an exception. These tests
 *  reread the signature, the header and the checksums of each
 *  chunk — the same thing a decoder would do, without embedding one. */
const chunks = (png: Uint8Array): { type: string; data: Uint8Array; crcOk: boolean }[] => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  const crc = (b: Uint8Array): number => {
    let c = 0xffffffff;
    for (const x of b) c = table[(c ^ x) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const out: { type: string; data: Uint8Array; crcOk: boolean }[] = [];
  let at = 8;
  while (at < png.length) {
    const len = view.getUint32(at);
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    const body = png.subarray(at + 4, at + 8 + len);
    out.push({ type, data: png.subarray(at + 8, at + 8 + len), crcOk: crc(body) === view.getUint32(at + 8 + len) });
    at += 12 + len;
  }
  return out;
};

const rgb = (w: number, h: number): Uint8Array => {
  const d = new Uint8Array(w * h * 3);
  for (let i = 0; i < d.length; i++) d[i] = (i * 7) % 256;
  return d;
};

describe("encodePng — recopier des pixels, sans bibliothèque", () => {
  it("produit un PNG dont la signature, l'en-tête et TOUS les CRC sont justes", () => {
    const png = encodePng(16, 16, "rgb-24", rgb(16, 16))!;
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const parts = chunks(png);
    expect(parts.map((p) => p.type)).toEqual(["IHDR", "IDAT", "IEND"]);
    expect(parts.every((p) => p.crcOk)).toBe(true);
    const ihdr = parts[0]!.data;
    expect(new DataView(ihdr.buffer, ihdr.byteOffset).getUint32(0)).toBe(16); // largeur
    expect(new DataView(ihdr.buffer, ihdr.byteOffset).getUint32(4)).toBe(16); // hauteur
    expect([...ihdr.subarray(8)]).toEqual([8, 2, 0, 0, 0]); // 8 bits, RGB, no filter or interlacing
  });

  it("déterministe : mêmes pixels, mêmes octets — donc une seule pièce jointe", () => {
    expect(encodePng(4, 4, "rgb-24", rgb(4, 4))).toEqual(encodePng(4, 4, "rgb-24", rgb(4, 4)));
  });

  it("gris sur un bit : colour type 0, profondeur 1, une ligne = ceil(largeur / 8) octets, les bits recopiés", () => {
    // 10 pixels wide: two bytes per row.
    const png = encodePng(10, 2, "gray-1", Uint8Array.from([0b10101010, 0b11000000, 0b00000000, 0b00000000]))!;
    const ihdr = chunks(png)[0]!.data;
    expect([...ihdr.subarray(8)]).toEqual([1, 0, 0, 0, 0]); // 1 bit, gray, no filter or interlacing
    expect([...inflateSync(chunks(png)[1]!.data)]).toEqual([0, 0b10101010, 0b11000000, 0, 0b00000000, 0b00000000]);
  });

  it("gris sur un bit : des données trop courtes s'abstiennent", () => {
    expect(encodePng(10, 2, "gray-1", new Uint8Array(3))).toBeUndefined();
  });

  it("gère la couche alpha", () => {
    const png = encodePng(2, 2, "rgba-32", new Uint8Array(2 * 2 * 4).fill(9))!;
    expect([...chunks(png)[0]!.data.subarray(8)]).toEqual([8, 6, 0, 0, 0]); // type 6 = RVB + alpha
  });

  it("ne rend RIEN plutôt qu'une image tronquée", () => {
    // Fewer pixels than the announced dimensions: publishing that would give a
    // "plausible and wrong" image, the family of defects we refuse.
    expect(encodePng(16, 16, "rgb-24", new Uint8Array(10))).toBeUndefined();
    expect(encodePng(0, 4, "rgb-24", rgb(4, 4))).toBeUndefined();
    // One-bit gray is handled (test "gris sur un bit" further down): what would
    // make it wrong is data that is too short, tested there as well.
    expect(encodePng(4, 4, "gray-1", new Uint8Array(1))).toBeUndefined();
  });

  it("un bloc stocké par tranche de 65 535 octets, et le dernier est marqué final", () => {
    // 300×300 in RGB makes 270 300 bytes of raw data: five blocks.
    const png = encodePng(300, 300, "rgb-24", new Uint8Array(300 * 300 * 3))!;
    const idat = chunks(png).find((c) => c.type === "IDAT")!.data;
    expect(idat[0]).toBe(0x78);
    expect(idat[1]).toBe(0x01);
    expect(png.length).toBeGreaterThan(270_000);
  });
});

const idatOf = (png: Uint8Array): Uint8Array => {
  const view = Buffer.from(png);
  const parts: Buffer[] = [];
  for (let at = 8; at < view.length;) {
    const len = view.readUInt32BE(at);
    if (view.toString("latin1", at + 4, at + 8) === "IDAT") parts.push(view.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  return inflateSync(Buffer.concat(parts));
};

describe("encodePngDeflate", () => {
  it("rend les pixels exacts, ligne par ligne, avec un octet de filtre nul", () => {
    const pixels = Uint8Array.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 9, 9, 9]); // 2x2 RVB
    expect([...idatOf(encodePngDeflate(2, 2, 3, pixels)!)]).toEqual([0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 9, 9, 9]);
  });

  it("compresse : une image uniforme de 1000x400 RVB pèse moins de 1 % de ses pixels bruts", () => {
    const pixels = new Uint8Array(1000 * 400 * 3).fill(255);
    expect(encodePngDeflate(1000, 400, 3, pixels)!.length).toBeLessThan(pixels.length / 100);
  });

  // Audit 07/10, P2-F8 ("you handle the remaining points"). `encodePng` accepts a buffer LONGER than width × height × channels
  // (it reads the first bytes); this one refused it, so a longer pixel buffer (pdf.js's, then) gave a marker image but an unreadable block.
  it("accepte un tampon plus long que nécessaire (comme encodePng) et rend les mêmes octets que le tampon exact", () => {
    const exact = Uint8Array.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 9, 9, 9]); // 2x2 RVB
    const longer = Uint8Array.from([...exact, 1, 2, 3, 4]);
    expect(encodePngDeflate(2, 2, 3, longer)).toEqual(encodePngDeflate(2, 2, 3, exact));
  });

  it("refuse toujours un tampon trop court", () => {
    expect(encodePngDeflate(2, 2, 3, Uint8Array.from([1, 2, 3]))).toBeUndefined();
  });

  it("annonce le bon type de couleur pour chaque nombre de canaux", () => {
    const colorType = (png: Uint8Array) => png[25];
    expect(colorType(encodePngDeflate(1, 1, 1, Uint8Array.from([7]))!)).toBe(0);
    expect(colorType(encodePngDeflate(1, 1, 2, Uint8Array.from([7, 8]))!)).toBe(4);
    expect(colorType(encodePngDeflate(1, 1, 3, Uint8Array.from([7, 8, 9]))!)).toBe(2);
    expect(colorType(encodePngDeflate(1, 1, 4, Uint8Array.from([7, 8, 9, 10]))!)).toBe(6);
  });

  it("refuse des pixels qui ne correspondent pas aux dimensions", () => {
    expect(encodePngDeflate(2, 2, 3, new Uint8Array(11))).toBeUndefined();
  });
});

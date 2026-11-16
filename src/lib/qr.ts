/**
 * Générateur de QR Code autonome en pur TypeScript (sans dépendance externe).
 * Basé sur l'algorithme standard QR Code (ISO/IEC 18004) adapté du projet de référence Nayuki.
 * Fonctionne côté serveur (RSC, API) et côté client.
 */

export class QrEcc {
  public static readonly LOW = new QrEcc(0, 1);
  public static readonly MEDIUM = new QrEcc(1, 0);
  public static readonly QUARTILE = new QrEcc(2, 3);
  public static readonly HIGH = new QrEcc(3, 2);

  private constructor(
    public readonly ordinal: number,
    public readonly formatBits: number
  ) {}
}

export class QrCode {
  public static readonly Ecc = QrEcc;
  public static readonly MIN_VERSION: number = 1;
  public static readonly MAX_VERSION: number = 40;

  private static readonly PENALTY_N1: number = 3;
  private static readonly PENALTY_N2: number = 3;
  private static readonly PENALTY_N3: number = 40;
  private static readonly PENALTY_N4: number = 10;

  private static readonly ECC_CODEWORDS_PER_BLOCK: number[][] = [
    [-1],
    [7, 10, 13, 17],
    [10, 16, 22, 28],
    [15, 26, 36, 44],
    [20, 36, 52, 64],
    [26, 48, 72, 88],
    [36, 64, 96, 112],
    [40, 72, 108, 130],
    [48, 88, 132, 156],
    [60, 110, 160, 192],
    [72, 130, 192, 224],
    [80, 150, 224, 264],
    [96, 176, 260, 308],
    [104, 198, 288, 352],
    [120, 216, 320, 384],
    [132, 240, 360, 432],
    [144, 280, 408, 480],
    [168, 308, 448, 532],
    [180, 338, 504, 588],
    [196, 364, 546, 650],
    [224, 416, 600, 700],
    [224, 442, 644, 750],
    [252, 476, 690, 816],
    [270, 504, 750, 900],
    [300, 560, 810, 960],
    [312, 588, 870, 1050],
    [336, 644, 952, 1110],
    [360, 700, 1020, 1200],
    [390, 728, 1050, 1260],
    [420, 784, 1140, 1350],
    [450, 812, 1200, 1440],
    [480, 868, 1290, 1530],
    [510, 924, 1350, 1620],
    [540, 980, 1440, 1710],
    [570, 1036, 1530, 1800],
    [570, 1064, 1590, 1890],
    [600, 1120, 1680, 1980],
    [630, 1204, 1770, 2100],
    [660, 1260, 1860, 2220],
    [720, 1316, 1950, 2310],
    [750, 1372, 2040, 2430],
  ];

  private static readonly NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
    [-1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 2, 2],
    [1, 2, 2, 4],
    [1, 2, 4, 4],
    [2, 4, 4, 4],
    [2, 4, 6, 5],
    [2, 4, 6, 6],
    [2, 5, 8, 8],
    [4, 5, 8, 8],
    [4, 5, 8, 11],
    [4, 8, 10, 11],
    [4, 9, 12, 16],
    [4, 9, 16, 16],
    [6, 10, 12, 18],
    [6, 10, 17, 16],
    [6, 11, 16, 19],
    [6, 13, 18, 21],
    [7, 14, 21, 25],
    [8, 16, 20, 25],
    [8, 17, 23, 25],
    [9, 17, 23, 34],
    [9, 18, 25, 30],
    [10, 20, 27, 32],
    [12, 21, 29, 35],
    [12, 23, 34, 37],
    [12, 25, 34, 40],
    [13, 26, 35, 42],
    [14, 28, 38, 45],
    [15, 29, 40, 48],
    [16, 31, 43, 51],
    [17, 33, 45, 54],
    [18, 35, 48, 57],
    [19, 37, 51, 60],
    [19, 38, 53, 63],
    [20, 40, 56, 66],
    [21, 43, 59, 70],
    [22, 45, 62, 74],
    [24, 47, 65, 77],
    [25, 49, 68, 81],
  ];

  public readonly size: number;
  public readonly mask: number;
  private readonly modules: boolean[][] = [];
  private readonly isFunction: boolean[][] = [];

  public static encodeText(text: string, ecl: QrCode.Ecc = QrCode.Ecc.MEDIUM): QrCode {
    const data = new TextEncoder().encode(text);
    const seg = QrSegment.makeBytes(data);
    return QrCode.encodeSegments([seg], ecl);
  }

  public static encodeSegments(
    segs: ReadonlyArray<QrSegment>,
    ecl: QrCode.Ecc,
    minVersion: number = 1,
    maxVersion: number = 40,
    mask: number = -1,
    boostEcl: boolean = true
  ): QrCode {
    if (minVersion < 1 || minVersion > maxVersion || maxVersion > 40 || mask < -1 || mask > 7) {
      throw new RangeError("Paramètres hors limites");
    }

    let version: number;
    let dataUsedBits: number = -1;
    for (version = minVersion; ; version++) {
      const dataCapacityBits = QrCode.getNumDataCodewords(version, ecl) * 8;
      const usedBits = QrSegment.getTotalBits(segs, version);
      if (usedBits <= dataCapacityBits) {
        dataUsedBits = usedBits;
        break;
      }
      if (version >= maxVersion) {
        throw new RangeError("Données trop volumineuses pour le QR code");
      }
    }

    if (boostEcl) {
      for (const newEcl of [QrCode.Ecc.MEDIUM, QrCode.Ecc.QUARTILE, QrCode.Ecc.HIGH]) {
        if (dataUsedBits <= QrCode.getNumDataCodewords(version, newEcl) * 8) {
          ecl = newEcl;
        }
      }
    }

    const bb: number[] = [];
    for (const seg of segs) {
      appendBits(seg.mode.modeBits, 4, bb);
      appendBits(seg.numChars, seg.mode.numCharCountBits(version), bb);
      for (const b of seg.getData()) bb.push(b);
    }

    const dataCapacityBits = QrCode.getNumDataCodewords(version, ecl) * 8;
    appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
    appendBits(0, (8 - (bb.length % 8)) % 8, bb);

    for (let padByte = 0xec; bb.length < dataCapacityBits; padByte ^= 0xec ^ 0x11) {
      appendBits(padByte, 8, bb);
    }

    const dataCodewords: number[] = [];
    while (dataCodewords.length * 8 < bb.length) {
      dataCodewords.push(0);
    }
    bb.forEach((b, i) => (dataCodewords[i >>> 3]! |= b << (7 - (i & 7))));

    return new QrCode(version, ecl, dataCodewords, mask);
  }

  private constructor(
    public readonly version: number,
    public readonly errorCorrectionLevel: QrCode.Ecc,
    dataCodewords: ReadonlyArray<number>,
    mask: number
  ) {
    this.size = version * 4 + 17;
    for (let y = 0; y < this.size; y++) {
      this.modules.push(new Array(this.size).fill(false));
      this.isFunction.push(new Array(this.size).fill(false));
    }

    this.drawFunctionPatterns();
    const allCodewords = this.addEccAndInterleave(dataCodewords);
    this.drawCodewords(allCodewords);

    if (mask === -1) {
      let minPenalty = 1e9;
      for (let i = 0; i < 8; i++) {
        this.applyMask(i);
        this.drawFormatBits(i);
        const penalty = this.getPenaltyScore();
        if (penalty < minPenalty) {
          minPenalty = penalty;
          mask = i;
        }
        this.applyMask(i); // annule
      }
    }
    this.mask = mask;
    this.applyMask(mask);
    this.drawFormatBits(mask);
  }

  public getModule(x: number, y: number): boolean {
    return 0 <= x && x < this.size && 0 <= y && y < this.size && this.modules[y]![x]!;
  }

  public toSvgString(border: number = 4, fgColor: string = "#123f38", bgColor: string = "#ffffff"): string {
    if (border < 0) throw new RangeError("La bordure doit être >= 0");
    const parts: string[] = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.getModule(x, y)) {
          parts.push(`M${x + border},${y + border}h1v1h-1z`);
        }
      }
    }
    const fullSize = this.size + border * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${fullSize} ${fullSize}" stroke="none" fill="${fgColor}">` +
      `<rect width="${fullSize}" height="${fullSize}" fill="${bgColor}"/>` +
      `<path d="${parts.join(" ")}" fill="${fgColor}"/>` +
      `</svg>`;
  }

  private drawFunctionPatterns(): void {
    for (let i = 0; i < this.size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }

    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(this.size - 4, 3);
    this.drawFinderPattern(3, this.size - 4);

    const alignPatPos = this.getAlignmentPatternPositions();
    const numAlign = alignPatPos.length;
    for (let i = 0; i < numAlign; i++) {
      for (let j = 0; j < numAlign; j++) {
        if (
          !(i === 0 && j === 0) &&
          !(i === 0 && j === numAlign - 1) &&
          !(i === numAlign - 1 && j === 0)
        ) {
          this.drawAlignmentPattern(alignPatPos[i]!, alignPatPos[j]!);
        }
      }
    }

    this.drawFormatBits(0);
    this.drawVersion();
  }

  private drawFormatBits(mask: number): void {
    const data = (this.errorCorrectionLevel.formatBits << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, getBit(bits, i));
    this.setFunctionModule(8, 7, getBit(bits, 6));
    this.setFunctionModule(8, 8, getBit(bits, 7));
    this.setFunctionModule(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, getBit(bits, i));

    for (let i = 0; i < 8; i++) this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++) this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
    this.setFunctionModule(8, this.size - 8, true);
  }

  private drawVersion(): void {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunctionModule(a, b, bit);
      this.setFunctionModule(b, a, bit);
    }
  }

  private drawFinderPattern(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (0 <= xx && xx < this.size && 0 <= yy && yy < this.size) {
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  private drawAlignmentPattern(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  private setFunctionModule(x: number, y: number, isDark: boolean): void {
    this.modules[y]![x] = isDark;
    this.isFunction[y]![x] = true;
  }

  private addEccAndInterleave(data: ReadonlyArray<number>): number[] {
    const ver = this.version;
    const ecl = this.errorCorrectionLevel;
    const numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ver]![ecl.ordinal]!;
    const blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ver]![ecl.ordinal]!;
    const rawCodewords = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);

    const blocks: number[][] = [];
    const rsDiv = QrCode.reedSolomonComputeDivisor(blockEccLen);
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i >= numShortBlocks ? 1 : 0));
      k += dat.length;
      const ecc = QrCode.reedSolomonComputeRemainder(dat, rsDiv);
      blocks.push(dat.concat(ecc));
    }

    const result: number[] = [];
    for (let i = 0; i < blocks[0]!.length; i++) {
      blocks.forEach((block, j) => {
        if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
          result.push(block[i]!);
        }
      });
    }
    return result;
  }

  private drawCodewords(data: ReadonlyArray<number>): void {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.isFunction[y]![x] && i < data.length * 8) {
            this.modules[y]![x] = getBit(data[i >>> 3]!, 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  private applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let invert: boolean;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: throw new Error("Masque invalide");
        }
        if (!this.isFunction[y]![x] && invert) {
          this.modules[y]![x] = !this.modules[y]![x];
        }
      }
    }
  }

  private getPenaltyScore(): number {
    let result = 0;
    for (let y = 0; y < this.size; y++) {
      let runColor = false;
      let runX = 0;
      const runHistory = [0, 0, 0, 0, 0, 0, 0];
      for (let x = 0; x < this.size; x++) {
        if (this.modules[y]![x] === runColor) {
          runX++;
          if (runX === 5) result += QrCode.PENALTY_N1;
          else if (runX > 5) result++;
        } else {
          this.finderPenaltyAddHistory(runX, runHistory);
          if (!runColor && this.finderPenaltyCountPatterns(runHistory)) {
            result += QrCode.PENALTY_N3;
          }
          runColor = this.modules[y]![x]!;
          runX = 1;
        }
      }
      result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * QrCode.PENALTY_N3;
    }

    for (let x = 0; x < this.size; x++) {
      let runColor = false;
      let runY = 0;
      const runHistory = [0, 0, 0, 0, 0, 0, 0];
      for (let y = 0; y < this.size; y++) {
        if (this.modules[y]![x] === runColor) {
          runY++;
          if (runY === 5) result += QrCode.PENALTY_N1;
          else if (runY > 5) result++;
        } else {
          this.finderPenaltyAddHistory(runY, runHistory);
          if (!runColor && this.finderPenaltyCountPatterns(runHistory)) {
            result += QrCode.PENALTY_N3;
          }
          runColor = this.modules[y]![x]!;
          runY = 1;
        }
      }
      result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * QrCode.PENALTY_N3;
    }

    for (let y = 0; y < this.size - 1; y++) {
      for (let x = 0; x < this.size - 1; x++) {
        const color = this.modules[y]![x];
        if (
          color === this.modules[y]![x + 1] &&
          color === this.modules[y + 1]![x] &&
          color === this.modules[y + 1]![x + 1]
        ) {
          result += QrCode.PENALTY_N2;
        }
      }
    }

    let dark = 0;
    this.modules.forEach((row) => row.forEach((color) => { if (color) dark++; }));
    const total = this.size * this.size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * QrCode.PENALTY_N4;
    return result;
  }

  private getAlignmentPatternPositions(): number[] {
    if (this.version === 1) return [];
    const num = Math.floor(this.version / 7) + 2;
    const step = this.version === 32 ? 26 : Math.ceil((this.version * 4 + 4) / (num * 2 - 2)) * 2;
    const result: number[] = [6];
    for (let pos = this.size - 7; result.length < num; pos -= step) {
      result.splice(1, 0, pos);
    }
    return result;
  }

  private static getNumRawDataModules(ver: number): number {
    let result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }

  private static getNumDataCodewords(ver: number, ecl: QrCode.Ecc): number {
    return (
      Math.floor(QrCode.getNumRawDataModules(ver) / 8) -
      QrCode.ECC_CODEWORDS_PER_BLOCK[ver]![ecl.ordinal]! *
        QrCode.NUM_ERROR_CORRECTION_BLOCKS[ver]![ecl.ordinal]!
    );
  }

  private static reedSolomonComputeDivisor(degree: number): number[] {
    const result: number[] = new Array(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < result.length; j++) {
        result[j] = QrCode.reedSolomonMultiply(result[j] ?? 0, root);
        if (j + 1 < result.length) result[j] = (result[j] ?? 0) ^ (result[j + 1] ?? 0);
      }
      root = QrCode.reedSolomonMultiply(root, 0x02);
    }
    return result;
  }

  private static reedSolomonComputeRemainder(data: ReadonlyArray<number>, divisor: ReadonlyArray<number>): number[] {
    const result = divisor.map(() => 0);
    for (const b of data) {
      const factor = b ^ (result.shift() ?? 0);
      result.push(0);
      divisor.forEach((coef, i) => (result[i]! ^= QrCode.reedSolomonMultiply(coef, factor)));
    }
    return result;
  }

  private static reedSolomonMultiply(x: number, y: number): number {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  private finderPenaltyCountPatterns(runHistory: ReadonlyArray<number>): boolean {
    const n = runHistory[1]!;
    return (
      n > 0 &&
      runHistory[2] === n &&
      runHistory[3] === n * 3 &&
      runHistory[4] === n &&
      runHistory[5] === n
    );
  }

  private finderPenaltyTerminateAndCount(
    currentRunColor: boolean,
    currentRunLength: number,
    runHistory: number[]
  ): number {
    if (currentRunColor) {
      this.finderPenaltyAddHistory(currentRunLength, runHistory);
      currentRunLength = 0;
    }
    currentRunLength += this.size;
    this.finderPenaltyAddHistory(currentRunLength, runHistory);
    return this.finderPenaltyCountPatterns(runHistory) ? 1 : 0;
  }

  private finderPenaltyAddHistory(currentRunLength: number, runHistory: number[]): void {
    if (runHistory[0] === 0) currentRunLength += this.size;
    runHistory.pop();
    runHistory.unshift(currentRunLength);
  }
}

export class QrSegment {
  public static makeBytes(data: Readonly<Uint8Array>): QrSegment {
    const bb: number[] = [];
    for (const b of data) appendBits(b, 8, bb);
    return new QrSegment(Mode.BYTE, data.length, bb);
  }

  public static getTotalBits(segs: ReadonlyArray<QrSegment>, version: number): number {
    let result = 0;
    for (const seg of segs) {
      const cc = seg.mode.numCharCountBits(version);
      if (seg.numChars >= 1 << cc) return 1e9;
      result += 4 + cc + seg.bitLength;
    }
    return result;
  }

  public constructor(
    public readonly mode: Mode,
    public readonly numChars: number,
    private readonly bitData: number[]
  ) {}

  public getData(): number[] {
    return this.bitData.slice();
  }

  public get bitLength(): number {
    return this.bitData.length;
  }
}

export class Mode {
  public static readonly BYTE = new Mode(0x4, [8, 16, 16]);

  private constructor(
    public readonly modeBits: number,
    private readonly numBitsCharCount: [number, number, number]
  ) {}

  public numCharCountBits(ver: number): number {
    return this.numBitsCharCount[Math.floor((ver + 7) / 17)] ?? 16;
  }
}

export namespace QrCode {
  export type Ecc = QrEcc;
}

function appendBits(val: number, len: number, bb: number[]): void {
  for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
}

function getBit(x: number, i: number): boolean {
  return ((x >>> i) & 1) !== 0;
}

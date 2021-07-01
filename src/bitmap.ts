import { AlignmentPatternLocations, ErrorCorrectionLevels, FormatECBits, FormatMaskBits, VersionECBits } from "./constants";

const getSize = (version: string) => (parseInt(version) - 1) * 4 + 21;

const MaskFunctions: MaskFunction[] = [
  (x, y) => (x + y) % 2 === 0,
  (_, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

const mask_matrix = (
  matrix: Matrix,
  mask: MaskFunction,
  reserved: Matrix<boolean> = []
) => {
  const result: Matrix = [];
  for (const row in matrix) {
    const row_idx = parseInt(row);
    result.push([]);
    for (const col in matrix[row]) {
      const col_idx = parseInt(col);
      if (reserved[row][col] === true) {
        result[row].push(matrix[row][col]);
      } else {
        if (mask(col_idx, row_idx))
          result[row].push(matrix[row][col] === 0 ? 1 : 0);
        else result[row].push(matrix[row][col]);
      }
    }
  }
  return result;
};

const FinderMatrix: Matrix = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

const AlignmentMatrix: Matrix = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1],
];

const getDarkModuleLocation = (version: string) => [
  4 * parseInt(version) + 9,
  8,
];

const matchMatrixHorizontal = (matrix: Matrix, regex: RegExp) => {
  return matrix.reduce((acc: string[], val) => {
    const str = val.reduce((acc2, val2) => acc2 + val2.toString(), "");
    return [...acc, ...(str.match(regex) || [])];
  }, []);
};

const matchMatrixVertical = (matrix: Matrix, regex: RegExp) => {
  return matrix.reduce((acc: string[], val, idx) => {
    const str = matrix.reduce(
      (acc2, _, idx2) => acc2 + matrix[idx2][idx].toString(),
      ""
    );
    return [...acc, ...(str.match(regex) || [])];
  }, []);
};

const evaluateMatrix1 = (matrix: Matrix) => {
  const regex = /0{5,}|1{5,}/g;
  const score = (match: string[]) => {
    return match.reduce((acc2, val2) => {
      return acc2 + 3 + (val2.length > 5 ? val2.length - 5 : 0);
    }, 0);
  };
  return (
    score(matchMatrixHorizontal(matrix, regex)) +
    score(matchMatrixVertical(matrix, regex))
  );
};

const evaluateMatrix2 = (matrix: Matrix) => {
  return matrix.reduce((acc, val, idx) => {
    const next = matrix[idx + 1];
    if (!next) return acc;
    const mixed = val.reduce((acc2, val2, idx2) => {
      return acc2 + val2 + next[idx2];
    }, "");
    const mixed_abbr = val.reduce((acc2, val2, idx2) => {
      return acc2 + next[idx2] + val2;
    }, "");
    const matchRegex = (str: string) => {
      return (str.match(/0{4,}|1{4,}/g) || []).reduce((acc2, val2) => {
        return (
          acc2 +
          (val2.length > 5 ? 3 + Math.floor((val2.length - 4) / 2) * 3 : 3)
        );
      }, 0);
    };
    return acc + Math.min(matchRegex(mixed), matchRegex(mixed_abbr));
  }, 0);
};

const evaluateMatrix3 = (matrix: Matrix) => {
  const regex = /00001011101|10111010000/g;
  const score = (match: string[]) => match.length * 40;
  return (
    score(matchMatrixHorizontal(matrix, regex)) +
    score(matchMatrixVertical(matrix, regex))
  );
};

const evaluateMatrix4 = (matrix: Matrix) => {
  let dark = 0;
  const total = matrix.length * matrix.length;
  matrix.forEach((arr) =>
    arr.forEach((val) => {
      if (val === 1) dark++;
    })
  );

  const percentage = (dark / total) * 100;
  let next_multiple = Math.floor(percentage),
    prev_multiple = Math.floor(percentage);

  while (next_multiple % 5 !== 0) {
    next_multiple++;
  }
  while (prev_multiple % 5 !== 0) {
    prev_multiple--;
  }

  next_multiple -= 50;
  prev_multiple -= 50;

  if (next_multiple < 0) next_multiple *= -1;
  if (prev_multiple < 0) prev_multiple *= -1;

  next_multiple /= 5;
  prev_multiple /= 5;

  return Math.min(next_multiple, prev_multiple) * 10;
};

const evaluateMatrixPentalty = (matrix: Matrix) => {
  const p1 = evaluateMatrix1(matrix);
  const p2 = evaluateMatrix2(matrix);
  const p3 = evaluateMatrix3(matrix);
  const p4 = evaluateMatrix4(matrix);
  return p1 + p2 + p3 + p4;
};

const createMatrix = (width: number, height: number, value: number = 0) =>
  Array(height).fill(Array(width).fill(value));

const isFinderPattern = (version: string, x: number, y: number) => {
  const size = getSize(version);
  return (x < 8 && y < 8) || (x > size - 9 && y < 8) || (x < 8 && y > size - 9);
};

const getPairs = (arr: number[]) => {
  let result: number[][] = [];
  for (const idx in arr) {
    for (const val of arr) {
      result.push([val, arr[idx]]);
    }
  }
  return result;
};export const getECLBits = (ecl: ErrorCorrectionLevels) => {
  switch (ecl) {
    case ErrorCorrectionLevels.H:
      return "10";
    case ErrorCorrectionLevels.Q:
      return "11";
    case ErrorCorrectionLevels.M:
      return "00";
    case ErrorCorrectionLevels.L:
      return "01";
  }
};

const getFormatECBits = (format_bits: string) => {
  format_bits = format_bits.padEnd(15, "0").replace(/^0+/, "");
  while (format_bits.length > 10) {
    const generator_poly = FormatECBits.padEnd(format_bits.length, "0");
    const result = (
      parseInt(format_bits, 2) ^ parseInt(generator_poly, 2)
    ).toString(2);
    format_bits = result;
  }
  return format_bits.padStart(10, "0");
};

const getVersionECBits = (version_bits: string) => {
  version_bits = version_bits.padEnd(18, "0").replace(/^0+/, "");
  while (version_bits.length > 12) {
    const generator_poly = VersionECBits.padEnd(version_bits.length, "0");
    const result = (
      parseInt(version_bits, 2) ^ parseInt(generator_poly, 2)
    ).toString(2);
    version_bits = result;
  }
  return version_bits.padStart(12, "0");
};

const getVersionFromSize = (size: number) => (size - 21) / 4 + 1;
const getVersionBitsFromSize = (size: number) =>
  ((size - 21) / 4 + 1).toString(2).padStart(6, "0");

const writeFormatBits = (matrix: Matrix, format_bits: string) => {
  for (let i = 0; i < format_bits.length; i++) {
    const bit = parseInt(format_bits[i]);
    switch (i) {
      case 0:
        matrix[8][0] = bit;
        matrix[matrix.length - 1][8] = bit;
        break;
      case 1:
        matrix[8][1] = bit;
        matrix[matrix.length - 2][8] = bit;
        break;
      case 2:
        matrix[8][2] = bit;
        matrix[matrix.length - 3][8] = bit;
        break;
      case 3:
        matrix[8][3] = bit;
        matrix[matrix.length - 4][8] = bit;
        break;
      case 4:
        matrix[8][4] = bit;
        matrix[matrix.length - 5][8] = bit;
        break;
      case 5:
        matrix[8][5] = bit;
        matrix[matrix.length - 6][8] = bit;
        break;
      case 6:
        matrix[8][7] = bit;
        matrix[matrix.length - 7][8] = bit;
        break;
      case 7:
        matrix[8][8] = bit;
        matrix[8][matrix.length - 8] = bit;
        break;
      case 8:
        matrix[7][8] = bit;
        matrix[8][matrix.length - 7] = bit;
        break;
      case 9:
        matrix[5][8] = bit;
        matrix[8][matrix.length - 6] = bit;
        break;
      case 10:
        matrix[4][8] = bit;
        matrix[8][matrix.length - 5] = bit;
        break;
      case 11:
        matrix[3][8] = bit;
        matrix[8][matrix.length - 4] = bit;
        break;
      case 12:
        matrix[2][8] = bit;
        matrix[8][matrix.length - 3] = bit;
        break;
      case 13:
        matrix[1][8] = bit;
        matrix[8][matrix.length - 2] = bit;
        break;
      case 14:
        matrix[0][8] = bit;
        matrix[8][matrix.length - 1] = bit;
        break;
    }
  }
};

const writeVersionBits = (matrix: Matrix, version_bits: string) => {
  version_bits = version_bits.split("").reverse().join("");
  for (let i = 0; i < version_bits.length; i++) {
    const bot_offset = Math.floor(i / 3);
    matrix[bot_offset][matrix.length - 11 + (i % 3)] = parseInt(
      version_bits[i]
    );
    matrix[matrix.length - 11 + (i % 3)][bot_offset] = parseInt(
      version_bits[i]
    );
  }
};

const maskFormatBits = (format_bits: string) =>
  (parseInt(format_bits, 2) ^ parseInt(FormatMaskBits, 2))
    .toString(2)
    .padStart(15, "0");

export class QRBitmap {
  public matrix: Matrix = [];
  public size: number;

  private reserved: Matrix<boolean> = [];

  public constructor(private version: string) {
    this.size = getSize(version);
    for (let i = 0; i < this.size; i++) {
      this.matrix.push(Array(this.size).fill(0));
      this.reserved.push(Array(this.size).fill(false));
    }
    this.addFinderPatterns();
    this.addAlignmentPatterns();
    this.addTimingPatterns();
    this.addDarkModule();
    this.reserveAreas();
  }

  public mask = (mask: MaskFunction) =>
    mask_matrix(this.matrix, mask, this.reserved);

  public evaluatePentalty = () => evaluateMatrixPentalty(this.matrix);

  private addFinderPatterns = () => {
    return this.addMatrix(FinderMatrix, 0, 0, true)
      .reserveMatrix(0, 0, 8, 8)
      .addMatrix(FinderMatrix, 0, this.size - 7, true)
      .reserveMatrix(0, this.size - 8, 8, 8)
      .addMatrix(FinderMatrix, this.size - 7, 0, true)
      .reserveMatrix(this.size - 8, 0, 8, 8);
  };

  private addAlignmentPatterns = () => {
    const locations = AlignmentPatternLocations[this.version];
    if (!locations) return;
    const mutations = getPairs(locations);

    for (const [x, y] of mutations) {
      let valid = true;
      for (const idx in AlignmentMatrix) {
        for (const idx2 in AlignmentMatrix[idx]) {
          if (
            isFinderPattern(
              this.version,
              x - 2 + parseInt(idx2),
              y - 2 + parseInt(idx)
            )
          ) {
            valid = false;
            break;
          }
        }
        if (!valid) break;
      }
      if (valid) {
        this.addMatrix(AlignmentMatrix, x - 2, y - 2, true);
        this.reserveMatrix(x - 2, y - 2, 5, 5);
      }
    }
    return this;
  };

  private addDarkModule = () => {
    const [y, x] = getDarkModuleLocation(this.version);
    this.matrix[y][x] = 1;
    this.reserveMatrix(x, y, 1, 1);
    return this;
  };

  private reserveAreas = () => {
    // write 0s to reserved areas, only areas with -1 are unreserved;
    const horizontal_matrix = [Array(8).fill(0)];
    const vertical_matrix = horizontal_matrix[0].map((val) => [val]);

    this.matrix[8][8] = 0;

    if (parseInt(this.version) > 6) {
      const horizontal_version_matrix = createMatrix(6, 3);
      const vertical_version_matrix = createMatrix(3, 6);

      this.addMatrix(horizontal_version_matrix, 0, this.size - 11, true);
      this.reserveMatrix(0, this.size - 11, 6, 3);
      this.addMatrix(vertical_version_matrix, this.size - 11, 0, true);
      this.reserveMatrix(this.size - 11, 0, 3, 6);
    }

    return this.addMatrix(horizontal_matrix, 0, 8)
      .reserveMatrix(0, 8, horizontal_matrix[0].length, 1)
      .addMatrix(horizontal_matrix, this.size - 8, 8)
      .reserveMatrix(this.size - 8, 8, horizontal_matrix[0].length, 1)
      .addMatrix(vertical_matrix, 8)
      .reserveMatrix(8, 0, 1, vertical_matrix.length)
      .addMatrix(vertical_matrix, 8, this.size - 8)
      .reserveMatrix(8, this.size - 8, 1, vertical_matrix.length);
  };

  private addTimingPatterns = () => {
    const HorizontalPattern = [
      Array(this.size - 16)
        .fill(true)
        .map((_, idx) => (idx % 2 === 0 ? 1 : 0)),
    ];
    const VerticalPattern = HorizontalPattern[0].map((val) => [val]);
    return this.addMatrix(HorizontalPattern, 8, 6, true)
      .reserveMatrix(8, 6, HorizontalPattern[0].length, 1)
      .addMatrix(VerticalPattern, 6, 8, true)
      .reserveMatrix(6, 8, 1, VerticalPattern.length);
  };

  private addMatrix = (
    matrix: Matrix,
    x: number = 0,
    y: number = 0,
    override: boolean = false
  ) => {
    for (const idx in matrix) {
      const idx_int = parseInt(idx);
      for (const idx2 in matrix[idx]) {
        const idx2_int = parseInt(idx2);
        if (!this.reserved[idx_int + y][idx2_int + x] || override) {
          this.matrix[idx_int + y][idx2_int + x] = matrix[idx_int][idx2_int];
        }
      }
    }
    return this;
  };

  private reserveMatrix = (
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    for (let idx = 0; idx < height; idx++) {
      for (let idx2 = 0; idx2 < width; idx2++) {
        this.reserved[idx + y][idx2 + x] = true;
      }
    }
    return this;
  };

  public toString = () => {
    return this.matrix.reduce((acc, val) => {
      return (
        acc +
        val.reduce((acc2, val2) => {
          return acc2 + (val2 > 0 ? 1 : 0).toString();
        }, "")
      );
    }, "");
  };

  public writeData = (binary_string: string) => {
    enum DIRECTIONS {
      UP,
      DOWN,
      LEFT,
    }
    let primary_direction = DIRECTIONS.UP,
      secondary_direction = DIRECTIONS.LEFT,
      right_col = this.size - 1,
      x = this.size - 1,
      y = this.size - 1;

    const next = () => {
      if (secondary_direction === DIRECTIONS.LEFT) {
        x--;
        secondary_direction = DIRECTIONS.UP;
      } else if (secondary_direction === DIRECTIONS.UP) {
        x++;
        if (primary_direction === DIRECTIONS.UP) {
          y--;
        } else if (primary_direction === DIRECTIONS.DOWN) {
          y++;
        }
        secondary_direction = DIRECTIONS.LEFT;
        if (y < 0 || y >= this.size) {
          right_col -= 2;
          if (right_col === 6) right_col = 5;
          x = right_col;
          if (primary_direction === DIRECTIONS.UP)
            primary_direction = DIRECTIONS.DOWN;
          else primary_direction = DIRECTIONS.UP;
          if (y < 0) y = 0;
          else y = this.size - 1;
        }
      }
    };

    for (const bit of binary_string.split("")) {
      while (this.reserved[y][x]) {
        next();
      }
      this.matrix[y][x] = parseInt(bit);
      next();
    }
  };

  public getFinal = (ecl: ErrorCorrectionLevels) => {
    const ecl_bits = getECLBits(ecl);
    const masked_bitfields = MaskFunctions.map((fn) => this.mask(fn));
    const best = masked_bitfields.reduce(
      (acc: { penalty?: number; matrix?: Matrix }, val, idx) => {
        const mask_bits = idx.toString(2).padStart(3, "0");
        const format_bits = ecl_bits + mask_bits;
        const format_ec_bits = getFormatECBits(format_bits);
        const raw_format_bits = format_bits + format_ec_bits;
        const masked_format_bits = maskFormatBits(raw_format_bits);
        writeFormatBits(val, masked_format_bits);
        if (getVersionFromSize(val.length) > 6) {
          const version_bits = getVersionBitsFromSize(this.size);
          const version_ec_bits = getVersionECBits(version_bits);
          const final_version_bits = version_bits + version_ec_bits;
          writeVersionBits(val, final_version_bits);
        }
        const penalty = evaluateMatrixPentalty(val);
        if (!acc.matrix || !acc.penalty || acc.penalty > penalty) {
          return {
            penalty,
            matrix: val,
          };
        }
        return acc;
      },
      {}
    );
    return best.matrix;
  };
}

export default QRBitmap;

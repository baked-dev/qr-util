import { ErrorCorrectionSettings } from "./constants";

class ECUtil {
  static logs: number[][] = (() => {
    const antiLogs = [];
    let prev = 1;
    const result: number[] = [1];
    for (let i = 1; i < 256; i++) {
      let val = prev * 2;
      if (val >= 256) val = val ^ 285;
      result.push(val);
      antiLogs[val] = i;
      prev = val;
    }
    antiLogs[1] = 0;
    return [result, antiLogs];
  })();

  static basePolynomal = [0, 25, 1];

  static getGeneratorPolynomal(ec_codewords: number): number[] {
    if (ec_codewords < 2) throw new Error("Requires at least 2 ec polynomals.");
    if (ec_codewords === 2) return this.basePolynomal;

    let current = this.basePolynomal;

    for (let i = 1; i < ec_codewords - 1; i++) {
      current = this.multiplyMatrixes(current, [0, i + 1]);
    }

    return current;
  }

  static multiplyMatrixes(m1: number[], m2: number[]) {
    const result = m1.reduce(
      (
        acc: {
          [x_exp: string]: number;
        },
        val,
        idx
      ) => {
        const x_exp = m1.length - idx - 1;
        m2.forEach((val2, idx2) => {
          const x_exp2 = m2.length - idx2 - 1;
          const new_x_exp = x_exp + x_exp2;
          let new_val = val + val2;
          if (new_val > 255)
            new_val = (new_val % 256) + Math.floor(new_val / 256);
          if (!acc[new_x_exp]) acc[new_x_exp] = new_val;
          else {
            let new_alpha =
              this.logs[0][acc[new_x_exp]] ^ this.logs[0][new_val];
            acc[new_x_exp] = this.logs[1][new_alpha];
          }
        });
        return acc;
      },
      {}
    );

    return Object.keys(result).map(
      (_key, idx, arr) => result[arr.length - idx - 1]
    );
  }

  static divideMatrixes(m1: number[], m2: number[]) {
    // m1 is the generator in alpha notation, m2 is the message in integer
    // returns result matrix in integer notation
    const alpha_divisor = this.logs[1][m2[0]];
    const new_generator = m1.map((value) => (value + alpha_divisor) % 255);
    const new_generator_integer = new_generator.map(
      (value) => this.logs[0][value]
    );
    const result = Array(Math.max(m2.length, new_generator_integer.length))
      .fill(true)
      .map((_, idx) => {
        return (m2[idx] || 0) ^ (new_generator_integer[idx] || 0);
      });
    return result.slice(1);
  }
}

export class ReedSolomonProvider {
  public constructor(
    private message: string,
    private options: ErrorCorrectionSettings
  ) {}

  public generateCorrectionCodewords = () => {
    const match = this.message.match(/[01]{1,8}/g);
    if (!match) throw new Error("Couldnt match message into codewords.");

    const result: {
      data: number[][];
      correction: number[][];
    } = {
      data: [],
      correction: [],
    };

    const group1: string[][] = [];
    const group2: string[][] = [];
    for (let i = 0; i < this.options.blocks_g1; i++) {
      group1.push(
        match.slice(i * this.options.cws_g1, (i + 1) * this.options.cws_g1)
      );
    }

    if (this.options.blocks_g2 && this.options.cws_g2) {
      const group2_offset = this.options.blocks_g1 * this.options.cws_g1;
      for (let i = 0; i < this.options.blocks_g2; i++) {
        group2.push(
          match.slice(
            i * this.options.cws_g2 + group2_offset,
            (i + 1) * this.options.cws_g2 + group2_offset
          )
        );
      }
    }

    const gen_polynomal = ECUtil.getGeneratorPolynomal(this.options.cw_block);

    for (const block of group1) {
      let message_polynomal = block.map((value) => parseInt(value, 2));
      result.data.push([...message_polynomal]);
      for (let i = 0; i < this.options.cws_g1; i++) {
        message_polynomal = ECUtil.divideMatrixes(
          gen_polynomal,
          message_polynomal
        );
      }
      result.correction.push([...message_polynomal]);
    }

    if (group2.length > 0 && this.options.cws_g2) {
      for (const block of group2) {
        let message_polynomal = block.map((value) => parseInt(value, 2));
        result.data.push([...message_polynomal]);
        for (let i = 0; i < this.options.cws_g2; i++) {
          message_polynomal = ECUtil.divideMatrixes(
            gen_polynomal,
            message_polynomal
          );
        }
        result.correction.push([...message_polynomal]);
      }
    }

    return result;
  };
}

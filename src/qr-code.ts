import QRBitmap from "./bitmap";
import { 
  character_capacities,
  EncodingModeIndicator,
  EncodingModes,
  ErrorCorrectionLevels,
  error_correction_table,
  PaddingBytes,
} from "./constants";
import { encode } from "./encoding";
import { ReedSolomonProvider } from "./error-correction";

export const getSmallestVersion = (
  size: number,
  ecl: ErrorCorrectionLevels,
  mode: EncodingModes
) => {
  for (const version of Object.keys(character_capacities)) {
    if (character_capacities[version][ecl][mode] > size) return version;
  }
};

export const getCharCountBinary = (
  count: number,
  version: string,
  mode: EncodingModes
) => {
  const version_int = parseInt(version);
  if (version_int < 10) {
    if (mode === EncodingModes.NUMERIC) {
      return count.toString(2).padStart(10, "0");
    } else if (mode === EncodingModes.ALPHANUMERIC) {
      return count.toString(2).padStart(9, "0");
    } else if (mode === EncodingModes.BYTE || mode === EncodingModes.KANJI) {
      return count.toString(2).padStart(8, "0");
    }
  } else if (version_int < 27) {
    if (mode === EncodingModes.NUMERIC) {
      return count.toString(2).padStart(12, "0");
    } else if (mode === EncodingModes.ALPHANUMERIC) {
      return count.toString(2).padStart(11, "0");
    } else if (mode === EncodingModes.BYTE) {
      return count.toString(2).padStart(16, "0");
    } else if (mode === EncodingModes.KANJI) {
      return count.toString(2).padStart(10, "0");
    }
  } else if (version_int < 41) {
    if (mode === EncodingModes.NUMERIC) {
      return count.toString(2).padStart(14, "0");
    } else if (mode === EncodingModes.ALPHANUMERIC) {
      return count.toString(2).padStart(13, "0");
    } else if (mode === EncodingModes.BYTE) {
      return count.toString(2).padStart(16, "0");
    } else if (mode === EncodingModes.KANJI) {
      return count.toString(2).padStart(12, "0");
    }
  }
};

export const getEncodingMode = (data: string) => {
  const numeric_match = data.match(/\d+/g);
  if (numeric_match?.length === 1 && numeric_match[0] === data)
    return EncodingModes.NUMERIC;
  const alphanumeric_match = data.match(/[\dA-Z\ $%*+-.\/:]+/);
  if (alphanumeric_match?.length === 1 && alphanumeric_match[0] === data)
    return EncodingModes.ALPHANUMERIC;
  else return EncodingModes.BYTE;
};

export interface IQRCodeOptions {
  encoding?: EncodingModes;
  ecl?: ErrorCorrectionLevels;
}

const ZeroString = (length: number) => Array(length).fill("0").join("");

const getRemainderBits = (version: string) => {
  const version_int = parseInt(version);
  if (
    version_int === 1 ||
    (version_int > 6 && version_int < 14) ||
    (version_int > 34 && version_int < 42)
  )
    return "";
  else if (version_int > 1 && version_int < 7) return ZeroString(7);
  else if (
    (version_int < 13 && version_int < 21) ||
    (version_int < 27 && version_int < 35)
  )
    return ZeroString(3);
  else if (version_int > 20 && version_int < 28) return ZeroString(7);
  throw new Error("Unknown version");
};

const interleave = (data: number[][]) => {
  const result: number[] = [];
  for (let i = 0; i < Math.max(...data.map((arr) => arr.length)); i++) {
    for (const val of data) {
      if (val[i] !== undefined) result.push(val[i]);
    }
  }
  return result;
};

export const DEFAULTQRECL = ErrorCorrectionLevels.H;

class QRCode {
  public constructor(
    private data: string,
    private options: IQRCodeOptions = {}
  ) {}

  public encode = () => {
    const ecl = this.options.ecl || DEFAULTQRECL;
    const encoding = this.options.encoding || getEncodingMode(this.data);

    const version = getSmallestVersion(this.data.length, ecl, encoding);

    if (!version) throw new Error("Data is too long to encode");

    let encoded = "";

    const mode_indicator = EncodingModeIndicator[encoding];
    encoded += mode_indicator;

    const char_count = getCharCountBinary(this.data.length, version, encoding);
    encoded += char_count;

    const encoded_data = encode(encoding, this.data);
    encoded += encoded_data;

    const ec_data = error_correction_table[`${version}-${ecl}`];
    const required_data_bits = ec_data.cw_total * 8;

    // first terminator
    if (required_data_bits - encoded.length > 4) encoded += "0000";
    else encoded += ZeroString(required_data_bits - encoded.length);

    // pad to make length multiple of 8
    encoded += ZeroString(8 - (encoded.length % 8));

    const padding_rounds = (required_data_bits - encoded.length) / 8;

    for (let i = 0; i < padding_rounds; i++) {
      encoded += PaddingBytes[i % 2];
    }

    const ec_codewords = new ReedSolomonProvider(encoded, ec_data);

    const { data, correction } = ec_codewords.generateCorrectionCodewords();

    const final_corrected_integer = [
      ...interleave(data),
      ...interleave(correction),
    ];

    const final_corrected_binary = final_corrected_integer
      .map((num) => num.toString(2).padStart(8, "0"))
      .join("");
    const final_binary = final_corrected_binary + getRemainderBits(version);

    const bitmap = new QRBitmap(version);
    bitmap.writeData(final_binary);

    return bitmap.getFinal(ecl);
  };
}

export default QRCode;

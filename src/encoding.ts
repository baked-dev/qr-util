import {
  alphanumeric_values,
  EncodingModes,
  ISO_8859_1_charset,
  ISO_8859_1_values,
} from "./constants";

export const encode_numeric = (data: string) => {
  const groups = data.match(/.{1,3}/g);
  return groups?.map((group) => parseInt(group).toString(2)).join("");
};

export const encode_alphanumeric = (data: string) => {
  const pairs = data.match(/.{1,2}/g);
  return pairs
    ?.map((pair) => {
      if (pair.length === 1) {
        return alphanumeric_values[pair].toString(2).padStart(6, "0");
      } else {
        const [first, second] = pair.split("");
        return (45 * alphanumeric_values[first] + alphanumeric_values[second])
          .toString(2)
          .padStart(11, "0");
      }
    })
    .join("");
};

const toUTF8Array = (str: string) => {
  const utf8 = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(
        0xe0 | (charcode >> 12),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    } else {
      i++;
      charcode =
        0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }
  return utf8;
};

export const encode_byte = (data: string) => {
  try {
    return data
      .split("")
      .map((value) => {
        if (ISO_8859_1_charset.includes(value))
          return ISO_8859_1_values[value].toString(2).padStart(8, "0");
        else throw new Error("String cant be parsed as ISO_8859_1");
      })
      .join("");
  } catch {
    return toUTF8Array(data)
      .map((val) => val.toString(2).padStart(8, "0"))
      .join("");
  }
};

export const encode = (mode: EncodingModes, data: string) => {
  if (mode === EncodingModes.ALPHANUMERIC) return encode_alphanumeric(data);
  else if (mode === EncodingModes.NUMERIC) return encode_numeric(data);
  else if (mode === EncodingModes.BYTE) return encode_byte(data);
};

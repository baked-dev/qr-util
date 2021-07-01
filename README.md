# @baked/qr-util

used by @baked/qr-react

## Usage

```js
import QRCode, { ErrorCorrectionLevels } from '@baked/qr-util';

const qr_matrix = new QRCode('https://google.com', {
  ecl: ErrorCorrectionLevels.M,
}).encode();      // => number[][]

```

## Notes

- the generated codes are not 100% right yet. Anything but the lowest ecl can be scanned fine on iOS and android
- No kanji encoding mode support (yet)
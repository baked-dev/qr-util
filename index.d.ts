import QRCode from './src/qr-code';
import { EncodingModes, ErrorCorrectionLevels } from './src/constants';

declare module '@baked/qr-util' {

  export default QRCode;

  export { EncodingModes, ErrorCorrectionLevels }

}
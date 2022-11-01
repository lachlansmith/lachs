import { Buffer } from 'buffer';

export const format = (
  mimeType:
    | 'application/json'
    | 'application/pdf'
    | 'image/webp'
    | 'image/svg+xml'
    | 'image/png'
    | 'image/jpeg',
  buffer: Buffer,
  type?: 'string' | 'base64' | 'binary' | 'arrayBuffer' | 'dataUri',
) => {
  switch (type) {
    case 'string':
      return buffer.toString();
    case 'base64':
      return buffer.toString('base64');
    case 'binary':
      return buffer.toString('binary');
    case 'arrayBuffer':
      return buffer.buffer;
    case 'dataUri':
    default:
      return 'data:' + mimeType + ';base64,' + buffer.toString('base64');
  }
};

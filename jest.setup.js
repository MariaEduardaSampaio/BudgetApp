// O jsdom não implementa TextEncoder/TextDecoder (todo navegador real tem); o jsPDF precisa deles.
const { TextEncoder, TextDecoder } = require('util');

Object.assign(global, { TextEncoder, TextDecoder });

import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill'
// Le lecteur de QR code (WebAssembly) est inclus dans l'appli
// au lieu d'être téléchargé depuis internet : le scan marche hors ligne.
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

let prepared = false

export function createQrDetector(): BarcodeDetector {
  if (!prepared) {
    prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
      },
    })
    prepared = true
  }
  return new BarcodeDetector({ formats: ['qr_code'] })
}

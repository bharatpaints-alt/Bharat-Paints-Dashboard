// Generates the PWA/favicon icon set from the locally-downloaded official
// Bharat Paints logo (public/logo-source.jpg). Re-run this after replacing
// that source file. Requires the `sharp` devDependency.
import sharp from 'sharp'

const SOURCE = 'public/logo-source.jpg'
const BRAND_BLUE = { r: 0x12, g: 0x3a, b: 0x8c, alpha: 1 } // matches --blue in styles.css

async function standardIcon(size, outPath) {
  await sharp(SOURCE).resize(size, size, { fit: 'cover' }).png().toFile(outPath)
}

// Maskable icons need generous safe-zone padding since the OS may crop to a
// circle/rounded-square — the logo is scaled down onto a brand-blue square.
async function maskableIcon(size, outPath) {
  const inner = Math.round(size * 0.7)
  const logo = await sharp(SOURCE).resize(inner, inner, { fit: 'cover' }).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BRAND_BLUE } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(outPath)
}

await standardIcon(192, 'public/icon-192.png')
await standardIcon(512, 'public/icon-512.png')
await maskableIcon(512, 'public/icon-512-maskable.png')
await standardIcon(180, 'public/apple-touch-icon.png')
await standardIcon(32, 'public/favicon.png')

console.log('Icons generated in public/.')

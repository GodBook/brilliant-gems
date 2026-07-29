import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const publicDir = join(process.cwd(), 'src', 'renderer', 'public', 'assets')
const sourceAssetsDir = join(process.cwd(), 'src', 'renderer', 'src', 'assets')
const resourcesDir = join(process.cwd(), 'resources')
await mkdir(publicDir, { recursive: true })
await mkdir(sourceAssetsDir, { recursive: true })
await mkdir(resourcesDir, { recursive: true })

const colors = {
  diamond: ['#fffdf4', '#c8d5db', '#f5e9ca'],
  sapphire: ['#80b8ff', '#225ab4', '#142b73'],
  emerald: ['#72d9a8', '#178558', '#0a3e2c'],
  ruby: ['#ff7d8a', '#b8233b', '#57101f'],
  onyx: ['#8b8b96', '#303038', '#09090c'],
  gold: ['#ffe3a0', '#c99832', '#6e4715']
}

const gemSvg = (name, [light, middle, dark]) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="${name}">
  <defs><filter id="s"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000" flood-opacity=".45"/></filter></defs>
  <g filter="url(#s)">
    <path d="M128 20 222 82 188 210 68 210 34 82Z" fill="${dark}" stroke="${light}" stroke-opacity=".56" stroke-width="5"/>
    <path d="m128 20 40 67-40 96-40-96Z" fill="${middle}"/>
    <path d="m34 82 54 5 40 96-60 27Z" fill="${dark}"/>
    <path d="m222 82-54 5-40 96 60 27Z" fill="${middle}"/>
    <path d="m34 82 54 5 40-67Z" fill="${light}" opacity=".88"/>
    <path d="m222 82-54 5-40-67Z" fill="${middle}" opacity=".9"/>
    <path d="m68 210 60-27 60 27Z" fill="${light}" opacity=".58"/>
    <path d="M91 71 120 34" stroke="#fff" stroke-linecap="round" stroke-width="9" opacity=".7"/>
  </g>
</svg>`

for (const [name, palette] of Object.entries(colors)) {
  await writeFile(join(publicDir, `gem-${name}.svg`), gemSvg(name, palette), 'utf8')
}

const tableTexture = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="23"/><feColorMatrix values=".2 0 0 0 0 .2 0 0 0 0 .2 0 0 0 0 0 0 0 .16 0"/></filter>
  <rect width="240" height="240" fill="#111315"/><rect width="240" height="240" filter="url(#n)" opacity=".34"/>
  <path d="M0 40h240M0 160h240" stroke="#d3a84c" stroke-opacity=".025"/>
</svg>`
await writeFile(join(publicDir, 'table-texture.svg'), tableTexture, 'utf8')
await writeFile(join(sourceAssetsDir, 'table-texture.svg'), tableTexture, 'utf8')

const crest = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
  <path d="M240 34 412 145 350 382 130 382 68 145Z" fill="#17191c" stroke="#d3a84c" stroke-width="10"/>
  <path d="m240 34 73 121-73 174-73-174Z" fill="#9b2335"/>
  <path d="m68 145 99 10 73 174-110 53Z" fill="#315ea8"/>
  <path d="m412 145-99 10-73 174 110 53Z" fill="#1b7f5d"/>
  <path d="m130 382 110-53 110 53Z" fill="#d3a84c"/>
  <path d="M171 128 225 61" stroke="#fff" stroke-linecap="round" stroke-width="18" opacity=".72"/>
</svg>`
await writeFile(join(publicDir, 'crest.svg'), crest, 'utf8')
await writeFile(join(resourcesDir, 'icon.svg'), crest, 'utf8')

const png = await sharp(Buffer.from(crest)).resize(256, 256).png().toBuffer()
await writeFile(join(resourcesDir, 'icon.png'), png)
await writeFile(join(resourcesDir, 'icon.ico'), await pngToIco(png))

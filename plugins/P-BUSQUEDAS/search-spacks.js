import axios from 'axios'
import sharp from 'sharp'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ CONFIGURACIÓN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const API_URL = 'https://www.sylphyy.xyz/search/stickerly'
const API_KEY = 'sylph-d7ed7664'

const MAX_RESULTS = 7
const API_TIMEOUT = 30000
const IMAGE_TIMEOUT = 20000
const MAX_IMAGE_SIZE = 8 * 1024 * 1024

const HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  ...(API_KEY && API_KEY !== 'PON_AQUI_TU_NUEVA_API_KEY'
    ? { 'X-API-Key': API_KEY }
    : {})
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ REACCIONES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function react(conn, m, emoji) {
  try {
    await conn.sendMessage(m.chat, {
      react: { text: emoji, key: m.key }
    })
  } catch {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ NORMALIZAR RESULTADOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalizeSticker(item) {
  return {
    name: String(item.name || 'Paquete sin nombre'),
    author: String(item.author || 'No disponible'),
    stickerCount: Number(item.stickerCount || 0),
    views: Number(item.viewCount || 0),
    exports: Number(item.exportCount || 0),
    animated: Boolean(item.isAnimated),
    paid: Boolean(item.isPaid),
    image: item.thumbnailUrl || '',
    url: item.url || ''
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ BUSCAR STICKERLY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function searchStickerly(query) {
  const { data } = await axios.get(API_URL, {
    params: { q: query },
    headers: HEADERS,
    timeout: API_TIMEOUT
  })

  if (!data?.status || !Array.isArray(data.result)) {
    throw new Error('Respuesta inválida de Sticker.ly')
  }

  const results = data.result
    .map(normalizeSticker)
    .filter(item =>
      /^https:\/\/sticker\.ly\/s\/[a-zA-Z0-9]+/.test(item.url) &&
      /^https:\/\//.test(item.image)
    )
    .slice(0, MAX_RESULTS)

  if (!results.length) {
    throw new Error('No se encontraron paquetes válidos')
  }

  return results
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ DESCARGAR Y CONVERTIR IMAGEN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function prepareImage(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: IMAGE_TIMEOUT,
    maxContentLength: MAX_IMAGE_SIZE,
    maxBodyLength: MAX_IMAGE_SIZE,
    validateStatus: status => status === 200,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  })

  const input = Buffer.from(response.data)

  if (!input.length || input.length > MAX_IMAGE_SIZE) {
    throw new Error('Miniatura vacía o demasiado grande')
  }

  return await sharp(input, {
    failOn: 'error',
    limitInputPixels: 40000000
  })
    .rotate()
    .resize({
      width: 900,
      height: 900,
      fit: 'inside',
      withoutEnlargement: true
    })
    .flatten({ background: '#FFFFFF' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ PREPARAR TARJETAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function createCards(results) {
  const cards = []

  for (let index = 0; index < results.length; index++) {
    const sticker = results[index]

    try {
      const imageBuffer = await prepareImage(sticker.image)

      cards.push({
        image: imageBuffer,
        mimetype: 'image/jpeg',
        title: `#${index + 1}`,

        caption: `∆ *${sticker.name}* ∆
✰ Autor: ${sticker.author}
✰ Stickers: ${sticker.stickerCount}
✰ Vistas: ${sticker.views.toLocaleString('es-PE')}
✰ Exportaciones: ${sticker.exports.toLocaleString('es-PE')}
✰ Animados: ${sticker.animated ? 'Sí' : 'No'}
✰ De pago: ${sticker.paid ? 'Sí' : 'No'}`,

        footer: 'SaitamaBot',

        nativeFlow: [
          {
            text: 'DESCARGAR STICKERS',
            copy: `.spacksdl ${sticker.url}`
          }
        ]
      })
    } catch (error) {
      console.error(
        `[SPACKSSEARCH] Imagen ${index + 1}:`,
        error.message
      )
    }
  }

  if (!cards.length) {
    throw new Error('No se pudo preparar ninguna miniatura')
  }

  return cards
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text?.trim()) {
    return conn.sendMessage(m.chat, {
      text: `✰ *𝚂𝚃𝙸𝙲𝙺𝙴𝚁𝙻𝚈 𝚂𝙴𝙰𝚁𝙲𝙷*

• Escribe el nombre del paquete.
• Ejemplo: ${usedPrefix + command} Emma Myers

SaitamaBot`
    }, { quoted: m })
  }

  const query = text.trim()

  await react(conn, m, '🔎')

  try {
    const results = await searchStickerly(query)
    const cards = await createCards(results)

    await conn.sendMessage(m.chat, {
      text: `✰ *𝚂𝚃𝙸𝙲𝙺𝙴𝚁𝙻𝚈 𝚂𝙴𝙰𝚁𝙲𝙷*

• Búsqueda: ${query}
• Resultados: ${cards.length}
• API: Sticker.ly

༺═────── ✰ ──────═༻`,
      footer: 'SaitamaBot',
      cards
    }, { quoted: m })

    await react(conn, m, '✅')

  } catch (error) {
    console.error(
      '[SPACKSSEARCH] Error:',
      error?.stack || error
    )

    await react(conn, m, '❌')

    await conn.sendMessage(m.chat, {
      text: `༺ ✰ 𝙴𝚁𝚁𝙾𝚁 𝚂𝙿𝙰𝙲𝙺𝚂 ✰ ༻

• No se pudo enviar la búsqueda.
• Error: ${error.message}

SaitamaBot`
    }, { quoted: m })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ COMANDOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

handler.help = ['spacks <texto>']
handler.tags = ['busqueda']
handler.command = ['spacks', 'spackssearch']
handler.register = false

export default handler

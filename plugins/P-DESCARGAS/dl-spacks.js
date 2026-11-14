import axios from 'axios'

const API_KEY = 'sylph-d7ed7664'

const API_URL = 'https://www.sylphyy.xyz/download/stickerly'
const PACK_NAME = '𝑺𝑨𝑰𝑻𝑨𝑴𝑨𝑩𝑶𝑻'
const PACK_PUBLISHER = '𝑺𝑨𝑰𝑻𝑨𝑴𝑨𝑩𝑶𝑻'
const PACK_DESCRIPTION = 'Sticker Pack • SaitamaBot'
const MAX_STICKERS = 60

const HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  ...(API_KEY ? { 'X-API-Key': API_KEY } : {})
}

async function reaction(conn, m, emoji) {
  try {
    await conn.sendMessage(m.chat, {
      react: { text: emoji, key: m.key }
    })
  } catch {}
}

async function downloadBuffer(url) {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error('URL de sticker no válida.')
  }

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    headers: HEADERS,
    maxContentLength: 15 * 1024 * 1024
  })

  const buffer = Buffer.from(response.data)

  if (!buffer.length) {
    throw new Error('Archivo vacío.')
  }

  return buffer
}

let handler = async (m, { conn, text }) => {
  if (!text) {
    return m.reply(
      '༺═────── ✰ ──────═༻\n' +
      '✰ Ingresa el enlace de Sticker.ly.\n\n' +
      '✰ Ejemplo:\n' +
      '.spacksdl https://sticker.ly/s/FAHDL5\n' +
      '༺═────── ✰ ──────═༻'
    )
  }

  const match = text.match(
    /https?:\/\/(?:www\.)?sticker\.ly\/s\/[a-zA-Z0-9]+/i
  )

  if (!match) {
    return m.reply('✰ Enlace de Sticker.ly no válido.')
  }

  await reaction(conn, m, '⏳')

  try {
    const { data } = await axios.get(API_URL, {
      params: { url: match[0] },
      headers: HEADERS,
      timeout: 120000
    })

    if (!data?.status || !Array.isArray(data?.result?.stickers)) {
      throw new Error('La API no devolvió un paquete válido.')
    }

    const pack = data.result
    const sourceStickers = pack.stickers

    if (!sourceStickers.length) {
      throw new Error('El paquete no contiene stickers.')
    }

    if (sourceStickers.length > MAX_STICKERS) {
      throw new Error(`El paquete supera el límite de ${MAX_STICKERS} stickers.`)
    }

    const coverUrl =
      pack.thumbnailUrl ||
      sourceStickers[0]?.imageUrl

    const cover = await downloadBuffer(coverUrl)

    const stickers = []

    for (const sticker of sourceStickers) {
      if (!sticker?.imageUrl) continue

      const buffer = await downloadBuffer(sticker.imageUrl)

      stickers.push({
        data: buffer,
        emojis: ['✨'],
        isLottie: false
      })
    }

    if (!stickers.length) {
      throw new Error('No se pudieron descargar los stickers.')
    }

    // UN SOLO PAQUETE NATIVO CON TODOS LOS STICKERS
    await conn.sendMessage(m.chat, {
      stickers,
      cover,
      name: PACK_NAME,
      publisher: PACK_PUBLISHER,
      description: PACK_DESCRIPTION
    }, { quoted: m })

    await reaction(conn, m, '✅')

    await conn.sendMessage(m.chat, {
      text:
        '༺═────── ✰ ──────═༻\n' +
        `✰ Paquete: ${PACK_NAME}\n` +
        `✰ Autor original: ${pack.author?.username || pack.author?.name || 'Desconocido'}\n` +
        `✰ Stickers: ${stickers.length}\n` +
        '✰ Paquetes enviados: 1\n' +
        '✰ Formato: Paquete nativo de WhatsApp\n' +
        '✰ SaitamaBot\n' +
        '༺═────── ✰ ──────═༻'
    }, { quoted: m })

  } catch (error) {
    console.error('[SPACKSDL]', error)

    await reaction(conn, m, '❌')

    await m.reply(
      '༺═────── ✰ ──────═༻\n' +
      '✰ No se pudo crear el paquete.\n' +
      `✰ Error: ${error.message}\n` +
      '༺═────── ✰ ──────═༻'
    )
  }
}

handler.help = ['spacksdl <enlace>']
handler.tags = ['descargas']
handler.command = ['spacksdl', 'stickerpackdl', 'stickerlydl']
handler.register = false

export default handler

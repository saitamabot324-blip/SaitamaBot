
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { rm, mkdir } from 'fs/promises'

// ═══════════════════════════════════════
// ✰ SAITAMABOT • INSTAGRAM DOWNLOADER
// ═══════════════════════════════════════

const API_URL = 'https://api-faa.my.id/faa/igdl'
const TMP_DIR = './tmp/saitamabot-instagram'

// ═══════════════════════════════════════
// ✰ OBTENER INSTAGRAM
// ═══════════════════════════════════════

async function obtenerInstagram(url) {
  const { data } = await axios.get(API_URL, {
    params: { url },
    headers: {
      Accept: 'application/json'
    },
    timeout: 60000
  })

  if (!data?.status || !Array.isArray(data?.result?.url)) {
    throw new Error('Faa no devolvió archivos multimedia.')
  }

  const urls = data.result.url.filter(
    item => typeof item === 'string' && item.startsWith('https://')
  )

  if (!urls.length) {
    throw new Error('No se encontraron archivos de Instagram.')
  }

  return {
    urls,
    metadata: data.result.metadata || {}
  }
}

// ═══════════════════════════════════════
// ✰ DETECTAR TIPO DE ARCHIVO
// ═══════════════════════════════════════

function detectarTipo(url, metadata) {
  const limpio = url.split('?')[0].toLowerCase()

  if (
    metadata?.isVideo === true ||
    limpio.endsWith('.mp4') ||
    limpio.endsWith('.mov')
  ) {
    return 'video'
  }

  if (
    limpio.endsWith('.mp3') ||
    limpio.endsWith('.m4a') ||
    limpio.endsWith('.aac')
  ) {
    return 'audio'
  }

  return 'image'
}

function obtenerExtension(url, tipo) {
  const limpio = url.split('?')[0].toLowerCase()
  const extension = path.extname(limpio)

  if (['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.mp3', '.m4a', '.aac'].includes(extension)) {
    return extension
  }

  if (tipo === 'video') return '.mp4'
  if (tipo === 'audio') return '.mp3'

  return '.jpg'
}

// ═══════════════════════════════════════
// ✰ DESCARGAR ARCHIVO
// ═══════════════════════════════════════

async function descargarArchivo(url, tipo) {
  const extension = obtenerExtension(url, tipo)

  const nombre =
    `instagram_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}${extension}`

  const archivo = path.join(TMP_DIR, nombre)

  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 180000,
    maxRedirects: 10,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36',
      Referer: 'https://www.instagram.com/'
    }
  })

  const contentType = String(
    response.headers['content-type'] || ''
  ).toLowerCase()

  if (contentType.includes('text/html')) {
    throw new Error('Instagram devolvió una página HTML, no un archivo multimedia.')
  }

  await pipeline(
    response.data,
    fs.createWriteStream(archivo)
  )

  const stats = fs.statSync(archivo)

  const minimo = tipo === 'video' ? 50000 : 3000

  if (stats.size < minimo) {
    await rm(archivo, { force: true })
    throw new Error('El archivo descargado está incompleto.')
  }

  return {
    archivo,
    contentType,
    tipo
  }
}

// ═══════════════════════════════════════
// ✰ PROCESAR INSTAGRAM
// ═══════════════════════════════════════

async function procesarInstagram(url) {
  const data = await obtenerInstagram(url)

  const descargados = []

  for (const mediaUrl of data.urls) {
    let archivo

    try {
      const tipo = detectarTipo(
        mediaUrl,
        data.metadata
      )

      archivo = await descargarArchivo(
        mediaUrl,
        tipo
      )

      descargados.push({
        ...archivo,
        url: mediaUrl
      })

    } catch (error) {
      console.error(
        '[INSTAGRAM] Error descargando archivo:',
        error.message
      )

      if (archivo?.archivo) {
        await rm(archivo.archivo, { force: true }).catch(() => {})
      }
    }
  }

  if (!descargados.length) {
    throw new Error('No se pudo descargar ningún archivo.')
  }

  return {
    items: descargados,
    metadata: data.metadata
  }
}

// ═══════════════════════════════════════
// ✰ LIMPIAR ARCHIVOS
// ═══════════════════════════════════════

async function limpiarArchivos(items) {
  for (const item of items || []) {
    if (item?.archivo) {
      await rm(item.archivo, { force: true }).catch(() => {})
    }
  }
}

// ═══════════════════════════════════════
// ✰ HANDLER
// ═══════════════════════════════════════

const handler = async (m, { conn, args }) => {
  const url = args?.[0]

  if (!url) {
    return m.reply(
      `*༺═────── ✰ ──────═༻*\n` +
      `*༻ 𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼 ✰*\n\n` +
      `*༻ 𝚄𝚜𝚘:* .instagram <url>\n\n` +
      `*༻ 𝙴𝚓𝚎𝚖𝚙𝚕𝚘:*\n` +
      `.instagram https://www.instagram.com/reel/ID/\n` +
      `*༺═────── ✰ ──────═༻*`
    )
  }

  if (
    !/^https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\//i.test(url)
  ) {
    return m.reply(
      `*༺═────── ✰ ──────═༻*\n` +
      `*༻ 𝙴𝚁𝚁𝙾𝚁 𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼 ✰*\n\n` +
      `*༻ Enlace no válido.*\n` +
      `*༺═────── ✰ ──────═༻*`
    )
  }

  let resultado = null

  try {
    await mkdir(TMP_DIR, { recursive: true })

    await conn.sendMessage(m.chat, {
      react: {
        text: '⏳',
        key: m.key
      }
    })

    await m.reply('*Descargando contenido de Instagram...*')

    resultado = await procesarInstagram(url)

    const items = resultado.items

    // ═══════════════════════════════════
    // ✰ ENVIAR MULTIMEDIA
    // ═══════════════════════════════════

    for (const item of items) {
      if (item.tipo === 'video') {
        await conn.sendMessage(
          m.chat,
          {
            video: {
              url: item.archivo
            },
            mimetype: 'video/mp4',
            fileName: `Instagram_${Date.now()}.mp4`,
            caption: '*༺ 𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼 ✰*'
          },
          { quoted: m }
        )

      } else if (item.tipo === 'audio') {
        await conn.sendMessage(
          m.chat,
          {
            audio: {
              url: item.archivo
            },
            mimetype: item.contentType.includes('mp4')
              ? 'audio/mp4'
              : 'audio/mpeg',
            fileName: `Instagram_Audio_${Date.now()}`,
            ptt: false
          },
          { quoted: m }
        )

      } else {
        const mimetype = item.contentType.startsWith('image/')
          ? item.contentType.split(';')[0]
          : 'image/jpeg'

        await conn.sendMessage(
          m.chat,
          {
            image: {
              url: item.archivo
            },
            mimetype,
            caption: '*༺ 𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼 ✰*'
          },
          { quoted: m }
        )
      }
    }

    await conn.sendMessage(m.chat, {
      react: {
        text: '✅',
        key: m.key
      }
    })

  } catch (error) {
    console.error('[INSTAGRAM ERROR]', error)

    await conn.sendMessage(m.chat, {
      react: {
        text: '❌',
        key: m.key
      }
    })

    await m.reply(
      `*༺═────── ✰ ──────═༻*\n` +
      `*༻ 𝙴𝚁𝚁𝙾𝚁 𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼 ✰*\n\n` +
      `*༻ ${error.message}*\n` +
      `*༺═────── ✰ ──────═༻*`
    )

  } finally {
    if (resultado?.items) {
      await limpiarArchivos(resultado.items)
    }
  }
}

// ═══════════════════════════════════════
// ✰ COMANDOS
// ═══════════════════════════════════════

handler.help = [
  'instagram <url>',
  'ig <url>',
  'igdl <url>'
]

handler.tags = ['descargas']

handler.command = [
  'instagram',
  'ig',
  'igdl'
]

handler.register = false

export default handler


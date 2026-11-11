
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { rm } from 'fs/promises'

// ═══════════════════════════════════════
// ✰ SAITAMABOT • YOUTUBE MP4 • FAA API
// ═══════════════════════════════════════

const API_URL = 'https://api-faa.my.id/faa/ytmp4'

const TMP_DIR = './tmp/saitamabot-ytmp4'

const MAX_ATTEMPTS = 3

// ═══════════════════════════════════════
// ✰ UTILIDADES
// ═══════════════════════════════════════

const esperar = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

function limpiarTitulo(titulo = 'Video de YouTube') {
  return String(titulo)
    .replace(/\s*\(\s*\d{3,4}p[^)]*\)\s*/gi, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'Video de YouTube'
}

// ═══════════════════════════════════════
// ✰ COMPROBAR MP4
// ═══════════════════════════════════════

function comprobarMP4(archivo) {
  if (!fs.existsSync(archivo)) {
    return false
  }

  const informacion = fs.statSync(archivo)

  if (informacion.size < 100000) {
    return false
  }

  const descriptor = fs.openSync(archivo, 'r')
  const buffer = Buffer.alloc(32)

  try {
    fs.readSync(descriptor, buffer, 0, 32, 0)
  } finally {
    fs.closeSync(descriptor)
  }

  const firma = buffer.toString('ascii', 4, 8)

  return firma === 'ftyp'
}

// ═══════════════════════════════════════
// ✰ OBTENER INFORMACIÓN FAA
// ═══════════════════════════════════════

async function obtenerVideo(youtubeUrl) {
  const response = await axios.get(API_URL, {
    params: {
      url: youtubeUrl
    },

    timeout: 60000,

    headers: {
      Accept: 'application/json',
      'User-Agent': 'SaitamaBot'
    },

    validateStatus: () => true
  })

  const json = response.data

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Faa API respondió HTTP ${response.status}`
    )
  }

  if (json?.status !== true) {
    throw new Error(
      json?.message || 'Faa API no pudo procesar el video.'
    )
  }

  const info = json?.result

  if (!info?.download_url) {
    throw new Error(
      'Faa API no devolvió download_url.'
    )
  }

  return {
    title: limpiarTitulo(
      info.title || info.filename || 'Video de YouTube'
    ),
    download: info.download_url,
    format: info.format || 'mp4'
  }
}

// ═══════════════════════════════════════
// ✰ DESCARGAR MP4
// ═══════════════════════════════════════

async function descargarArchivo(url, destino) {
  const response = await axios.get(url, {
    responseType: 'stream',

    timeout: 180000,

    maxRedirects: 10,

    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36',

      Accept: 'video/mp4,video/*,*/*'
    },

    validateStatus: status =>
      status >= 200 && status < 300
  })

  const escritor = fs.createWriteStream(destino)

  try {
    await new Promise((resolve, reject) => {
      response.data.pipe(escritor)

      response.data.on('error', reject)
      escritor.on('error', reject)
      escritor.on('finish', resolve)
    })
  } catch (error) {
    response.data.destroy()

    try {
      await rm(destino, { force: true })
    } catch {}

    throw error
  }

  if (!comprobarMP4(destino)) {
    await rm(destino, { force: true })

    throw new Error(
      'El enlace de Faa no devolvió un MP4 válido.'
    )
  }

  return {
    size: fs.statSync(destino).size
  }
}

// ═══════════════════════════════════════
// ✰ PROCESAR YOUTUBE
// ═══════════════════════════════════════

async function procesarVideo(youtubeUrl) {
  const info = await obtenerVideo(youtubeUrl)

  const nombreArchivo =
    `${Date.now()}-${info.title}.mp4`

  const archivo = path.join(
    TMP_DIR,
    nombreArchivo
  )

  let ultimoError = null

  for (
    let intento = 1;
    intento <= MAX_ATTEMPTS;
    intento++
  ) {
    try {
      const resultado = await descargarArchivo(
        info.download,
        archivo
      )

      return {
        archivo,
        titulo: info.title,
        size: resultado.size
      }

    } catch (error) {
      ultimoError = error

      try {
        await rm(archivo, { force: true })
      } catch {}

      if (intento < MAX_ATTEMPTS) {
        await esperar(2000)
      }
    }
  }

  throw (
    ultimoError ||
    new Error('No se pudo descargar el MP4.')
  )
}

// ═══════════════════════════════════════
// ✰ REACCIÓN
// ═══════════════════════════════════════

async function reaccionar(m, emoji) {
  try {
    await m.react(emoji)
  } catch {}
}

// ═══════════════════════════════════════
// ✰ HANDLER
// ═══════════════════════════════════════

const handler = async (
  m,
  {
    conn,
    text
  }
) => {
  if (!text?.trim()) {
    return m.reply(
      `*༺═────── ✰ ──────═༻*\n` +
      `*༻ 𝚄𝚂𝙾 ✰*\n\n` +
      `*༻ .ytmp4 <URL de YouTube>*\n` +
      `*༺═────── ✰ ──────═༻*`
    )
  }

  const entrada = text.trim()

  // ═══════════════════════════════════
  // ✰ VALIDAR YOUTUBE
  // ═══════════════════════════════════

  const esUrlYouTube =
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(entrada)

  if (!esUrlYouTube) {
    await reaccionar(m, '❌')

    return m.reply(
      `*༺═────── ✰ ──────═༻*\n` +
      `*༻ 𝙴𝚁𝚁𝙾𝚁 ✰*\n\n` +
      `*༻ La URL no parece ser de YouTube.*\n` +
      `*༺═────── ✰ ──────═༻*`
    )
  }

  let archivo = null

  try {
    await reaccionar(m, '⏳')

    await fs.promises.mkdir(TMP_DIR, {
      recursive: true
    })

    const resultado = await procesarVideo(entrada)

    archivo = resultado.archivo

    // ═════════════════════════════════
    // ✰ ENVIAR VIDEO
    // ═════════════════════════════════

    await conn.sendMessage(
      m.chat,
      {
        video: {
          url: archivo
        },

        mimetype: 'video/mp4',

        fileName: `${resultado.titulo}.mp4`,

        caption: `*${resultado.titulo}*`
      },
      {
        quoted: m
      }
    )

    await reaccionar(m, '✅')

  } catch (error) {
    console.error(
      '[SAITAMABOT YTMP4 FAA]',
      error
    )

    await reaccionar(m, '❌')

    await m.reply(
      `*༺═────── ✰ ──────═༻*\n` +
      `*༻ 𝙴𝚁𝚁𝙾𝚁 𝚈𝚃𝙼𝙿𝟺 ✰*\n\n` +
      `*༻ No se pudo descargar el video.*\n` +
      `*༻ Intenta nuevamente en unos segundos.*\n` +
      `*༺═────── ✰ ──────═༻*`
    )

  } finally {
    if (archivo) {
      try {
        await rm(archivo, {
          force: true
        })
      } catch {}
    }
  }
}

// ═══════════════════════════════════════
// ✰ COMANDOS
// ═══════════════════════════════════════

handler.help = [
  'ytmp4 <url>'
]

handler.tags = [
  'descargas'
]

handler.command = [
  'ytmp4',
  'ytv',
  'ytvideo'
]

handler.register = false

export default handler


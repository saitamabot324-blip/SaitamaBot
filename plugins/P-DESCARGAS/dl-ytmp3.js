
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { rm } from 'fs/promises'

// ═══════════════════════════════════════
// ✰ SAITAMABOT • YOUTUBE MP3 • FAA API
// ═══════════════════════════════════════

const API_URL = 'https://api-faa.my.id/faa/ytmp3'

const TMP_DIR = './tmp/saitamabot-ytmp3'

const MAX_ATTEMPTS = 3

// ═══════════════════════════════════════
// ✰ UTILIDADES
// ═══════════════════════════════════════

const esperar = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

function limpiarNombre(nombre = 'audio') {
  return nombre
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'audio'
}

function esMP3(buffer) {
  if (!buffer || buffer.length < 5000) {
    return false
  }

  // ID3
  if (
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33
  ) {
    return true
  }

  // MPEG Audio
  if (
    buffer[0] === 0xff &&
    (buffer[1] & 0xe0) === 0xe0
  ) {
    return true
  }

  return false
}

// ═══════════════════════════════════════
// ✰ FAA API
// ═══════════════════════════════════════

async function obtenerAudio(youtubeUrl) {
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

  if (
    response.status < 200 ||
    response.status >= 300
  ) {
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

  if (!info?.mp3) {
    throw new Error(
      'Faa API no devolvió el enlace MP3.'
    )
  }

  return {
    title: info.title || 'audio',
    thumbnail: info.thumbnail || null,
    duration: info.duration || null,
    download: info.mp3
  }
}

// ═══════════════════════════════════════
// ✰ DESCARGAR MP3
// ═══════════════════════════════════════

async function descargarArchivo(url, destino) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,

    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36',
      Accept: 'audio/mpeg, audio/*, */*'
    },

    maxRedirects: 5,
    validateStatus: () => true
  })

  if (
    response.status < 200 ||
    response.status >= 300
  ) {
    throw new Error(
      `Error descargando MP3: HTTP ${response.status}`
    )
  }

  const buffer = Buffer.from(response.data)

  if (!esMP3(buffer)) {
    throw new Error(
      'El enlace de Faa no devolvió un MP3 válido.'
    )
  }

  await fs.promises.writeFile(destino, buffer)

  return {
    ready: true,
    size: buffer.length
  }
}

// ═══════════════════════════════════════
// ✰ PROCESAR YOUTUBE
// ═══════════════════════════════════════

async function procesarYouTube(youtubeUrl) {
  const info = await obtenerAudio(youtubeUrl)

  const filenameBase = limpiarNombre(info.title)

  const filename = `${filenameBase}.mp3`

  const destino = path.join(
    TMP_DIR,
    `${Date.now()}-${filename}`
  )

  let ultimoError = null

  for (let intento = 1; intento <= MAX_ATTEMPTS; intento++) {
    try {
      const resultado = await descargarArchivo(
        info.download,
        destino
      )

      if (resultado.ready) {
        return {
          path: destino,
          filename,
          title: info.title,
          thumbnail: info.thumbnail,
          duration: info.duration,
          size: resultado.size
        }
      }
    } catch (error) {
      ultimoError = error

      try {
        await rm(destino, { force: true })
      } catch {}

      if (intento < MAX_ATTEMPTS) {
        await esperar(2000)
      }
    }
  }

  throw (
    ultimoError ||
    new Error('No se pudo descargar el MP3.')
  )
}

// ═══════════════════════════════════════
// ✰ HANDLER
// ═══════════════════════════════════════

const handler = async (
  m,
  {
    conn,
    args,
    usedPrefix,
    command
  }
) => {
  let entrada = args?.[0]

  if (!entrada) {
    return m.reply(
      `*༺═────── ✰ ──────═༻*\n` +
      `*༻ 𝚄𝚂𝙾 ✰*\n\n` +
      `*༻ ${usedPrefix + command} <URL o ID de YouTube>*\n` +
      `*༺═────── ✰ ──────═༻*`
    )
  }

  entrada = entrada.trim()

  // ═══════════════════════════════════
  // ✰ DETECTAR URL O VIDEO ID
  // ═══════════════════════════════════

  const esVideoId =
    /^[a-zA-Z0-9_-]{11}$/.test(entrada)

  const esUrlYouTube =
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(entrada)

  if (!esVideoId && !esUrlYouTube) {
    return m.reply(
      `*༺═────── ✰ ──────═༻*\n` +
      `*༻ 𝙴𝚁𝚁𝙾𝚁 ✰*\n\n` +
      `*༻ La URL o ID no parece ser de YouTube.*\n` +
      `*༺═────── ✰ ──────═༻*`
    )
  }

  // ═══════════════════════════════════
  // ✰ CONVERTIR ID → URL
  // ═══════════════════════════════════

  const youtubeUrl = esVideoId
    ? `https://www.youtube.com/watch?v=${entrada}`
    : entrada

  const reaccion = async emoji => {
    try {
      await m.react(emoji)
    } catch {}
  }

  let archivo = null

  try {
    await reaccion('⏳')

    await fs.promises.mkdir(TMP_DIR, {
      recursive: true
    })

    const resultado = await procesarYouTube(youtubeUrl)

    archivo = resultado.path

    // ═════════════════════════════════
    // ✰ ENVIAR AUDIO
    // ═════════════════════════════════

    await conn.sendMessage(
      m.chat,
      {
        audio: {
          url: archivo
        },

        mimetype: 'audio/mpeg',

        fileName: resultado.filename,

        ptt: false
      },
      {
        quoted: m
      }
    )

    await reaccion('✅')

  } catch (error) {
    console.error('[SAITAMABOT YTMP3 FAA]', error)

    await reaccion('❌')

    await m.reply(
      `*༺═────── ✰ ──────═༻*\n` +
      `*༻ 𝙴𝚁𝚁𝙾𝚁 𝚈𝚃𝙼𝙿𝟹 ✰*\n\n` +
      `*༻ No se pudo descargar el audio.*\n` +
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
  'ytmp3 <url o ID>'
]

handler.tags = [
  'descargas'
]

handler.command = [
  'ytmp3',
  'ytaudio',
  'yta'
]

handler.register = false

export default handler


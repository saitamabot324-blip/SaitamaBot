import 'dotenv/config'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { rm } from 'fs/promises'
import { writeAudioTags } from '../../lib/audioTags.js'

// ═══════════════════════════════════════
// ✰ SAITAMABOT • YOUTUBE MP3 DOC • HIKARI
// ═══════════════════════════════════════

const API_KEY = process.env.HIKARI_API_KEY

const API_URL =
  'https://hikariapi.skyultraweb.com/api/scrapers/youtube/audio'

const TMP_DIR =
  './tmp/saitamabot-ytmp3doc'

const QUALITIES = [
  '320k',
  '128k'
]

const MAX_ATTEMPTS = 8

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
// ✰ DESCARGAR MP3
// ═══════════════════════════════════════

async function descargarArchivo(
  url,
  destino
) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,

    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36',

      Accept: '*/*'
    },

    validateStatus: () => true
  })

  const contentType =
    response.headers?.['content-type'] || ''

  const buffer =
    Buffer.from(response.data)

  // Hikari todavía está preparando
  if (
    contentType.includes(
      'application/json'
    ) ||
    contentType.includes(
      'text/json'
    )
  ) {
    let json

    try {
      json = JSON.parse(
        buffer.toString()
      )
    } catch {
      return {
        ready: false,
        retryAfterSeconds: 2
      }
    }

    if (
      json?.status === 'preparing' ||
      json?.success === false
    ) {
      return {
        ready: false,

        retryAfterSeconds:
          Number(
            json?.retryAfterSeconds
          ) || 2
      }
    }

    return {
      ready: false,
      retryAfterSeconds: 2
    }
  }

  // Validar que sea MP3
  if (!esMP3(buffer)) {
    return {
      ready: false,
      retryAfterSeconds: 2
    }
  }

  await fs.promises.writeFile(
    destino,
    buffer
  )

  return {
    ready: true,
    size: buffer.length
  }
}

// ═══════════════════════════════════════
// ✰ HIKARI API
// ═══════════════════════════════════════

async function obtenerAudio(
  youtubeUrl,
  quality
) {
  if (!API_KEY) {
    throw new Error(
      'HIKARI_API_KEY no está configurada.'
    )
  }

  const endpoint =
    `${API_URL}?url=${encodeURIComponent(youtubeUrl)}` +
    `&quality=${quality}`

  const response = await axios.get(
    endpoint,
    {
      timeout: 60000,

      headers: {
        'X-API-Key': API_KEY,
        Accept: 'application/json',
        'User-Agent': 'SaitamaBot'
      },

      validateStatus: () => true
    }
  )

  const json = response.data

  const data =
    json?.response || json

  if (
    response.status < 200 ||
    response.status >= 300 ||
    data?.success !== true
  ) {
    throw new Error(
      data?.message ||
      json?.message ||
      `Hikari respondió HTTP ${response.status}`
    )
  }

  const info = data?.data

  if (!info) {
    throw new Error(
      'Hikari no devolvió los datos del audio.'
    )
  }

  if (!info.downloadUrl) {
    throw new Error(
      'Hikari no devolvió downloadUrl.'
    )
  }

  return info
}

// ═══════════════════════════════════════
// ✰ PROCESAR YOUTUBE
// ═══════════════════════════════════════

async function procesarYouTube(
  youtubeUrl
) {
  let ultimoError = null

  for (const quality of QUALITIES) {
    try {
      const info =
        await obtenerAudio(
          youtubeUrl,
          quality
        )

      const filename =
        limpiarNombre(
          info.filename ||
          'audio.mp3'
        )

      const nombreFinal =
        filename
          .toLowerCase()
          .endsWith('.mp3')
          ? filename
          : `${filename}.mp3`

      const destino =
        path.join(
          TMP_DIR,
          `${Date.now()}-${nombreFinal}`
        )

      const fuentes = []

      // Intentar proveedor primero
      if (info.providerUrl) {
        fuentes.push(
          info.providerUrl
        )
      }

      // Fallback Hikari
      if (
        info.downloadUrl &&
        !fuentes.includes(
          info.downloadUrl
        )
      ) {
        fuentes.push(
          info.downloadUrl
        )
      }

      for (const fuente of fuentes) {
        for (
          let intento = 1;
          intento <= MAX_ATTEMPTS;
          intento++
        ) {
          const resultado =
            await descargarArchivo(
              fuente,
              destino
            )

          if (resultado.ready) {
            return {
              path: destino,
              filename: nombreFinal,
              quality,
              size: resultado.size
            }
          }

          await esperar(
            (
              resultado.retryAfterSeconds ||
              2
            ) * 1000
          )
        }
      }

      throw new Error(
        'Hikari no terminó de preparar el audio.'
      )

    } catch (error) {
      ultimoError = error
    }
  }

  throw (
    ultimoError ||
    new Error(
      'No se pudo obtener el audio.'
    )
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
  // ✰ URL O VIDEO ID
  // ═══════════════════════════════════

  const esVideoId =
    /^[a-zA-Z0-9_-]{11}$/.test(
      entrada
    )

  const esUrlYouTube =
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i
      .test(entrada)

  if (
    !esVideoId &&
    !esUrlYouTube
  ) {
    return m.reply(
      `*༺═────── ✰ ──────═༻*\n` +
      `*༻ 𝙴𝚁𝚁𝙾𝚁 ✰*\n\n` +
      `*༻ La URL o ID no parece ser de YouTube.*\n` +
      `*༺═────── ✰ ──────═༻*`
    )
  }

  const youtubeUrl =
    esVideoId
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

    await fs.promises.mkdir(
      TMP_DIR,
      {
        recursive: true
      }
    )

    const resultado =
      await procesarYouTube(
        youtubeUrl
      )

    archivo =
      resultado.path

    // ═════════════════════════════════
    // ✰ TAGS
    // ═════════════════════════════════

    try {
      if (
        typeof writeAudioTags ===
        'function'
      ) {
        await writeAudioTags(
          archivo,
          {
            title:
              resultado.filename
                .replace(
                  /\.mp3$/i,
                  ''
                )
          }
        )
      }
    } catch {}

    // ═════════════════════════════════
    // ✰ ENVIAR COMO DOCUMENTO
    // ═════════════════════════════════

    await conn.sendMessage(
      m.chat,
      {
        document: {
          url: archivo
        },

        mimetype:
          'audio/mpeg',

        fileName:
          resultado.filename,

        caption:
          `*${resultado.filename}*`
      },
      {
        quoted: m
      }
    )

    await reaccion('✅')

  } catch (error) {

    await reaccion('❌')

    await m.reply(
      `*༺═────── ✰ ──────═༻*\n` +
      `*༻ 𝙴𝚁𝚁𝙾𝚁 𝚈𝚃𝙼𝙿𝟹 𝙳𝙾𝙲 ✰*\n\n` +
      `*༻ No se pudo descargar el audio.*\n` +
      `*༻ Intenta nuevamente en unos segundos.*\n` +
      `*༺═────── ✰ ──────═༻*`
    )

  } finally {

    if (archivo) {
      try {
        await rm(
          archivo,
          {
            force: true
          }
        )
      } catch {}
    }
  }
}

// ═══════════════════════════════════════
// ✰ COMANDOS
// ═══════════════════════════════════════

handler.help = [
  'ytmp3doc <url o ID>'
]

handler.tags = [
  'descargas'
]

handler.command = [
  'ytmp3doc',
  'ytadoc'
]

handler.register = false

export default handler

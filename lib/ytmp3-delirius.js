import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { rm } from 'fs/promises'
import { writeAudioTags } from './audioTags.js'

const API_URL = 'https://api.delirius.online/download/ytmp3'
const TMP_DIR = path.resolve('./tmp/saitamabot-ytmp3')

function limpiarNombre(nombre = 'audio') {
  return String(nombre)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150) || 'audio'
}

function obtenerURL(entrada = '') {
  const valor = entrada.trim()

  if (/^[a-zA-Z0-9_-]{11}$/.test(valor)) {
    return `https://www.youtube.com/watch?v=${valor}`
  }

  try {
    const url = new URL(
      valor.startsWith('http') ? valor : `https://${valor}`
    )

    const host = url.hostname.toLowerCase()

    if (
      host !== 'youtube.com' &&
      host !== 'www.youtube.com' &&
      host !== 'm.youtube.com' &&
      host !== 'youtu.be' &&
      host !== 'www.youtu.be'
    ) return null

    return url.toString()
  } catch {
    return null
  }
}

function esMP3(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5000) {
    return false
  }

  if (buffer.subarray(0, 3).toString() === 'ID3') {
    return true
  }

  // Algunos MP3 no comienzan con una etiqueta ID3.
  const limite = Math.min(buffer.length - 1, 4096)

  for (let i = 0; i < limite; i++) {
    if (
      buffer[i] === 0xff &&
      (buffer[i + 1] & 0xe0) === 0xe0
    ) {
      return true
    }
  }

  return false
}

async function obtenerAudio(url) {
  const response = await axios.get(API_URL, {
    params: { url },
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SaitamaBot'
    },
    timeout: 60000
  })

  const json = response.data

  if (json?.status !== true || !json?.data?.download) {
    throw new Error(
      json?.message || 'Delirius no devolvió un enlace de descarga.'
    )
  }

  return json.data
}

async function descargarMP3(url, destino) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,
    maxRedirects: 10,
    maxContentLength: 150 * 1024 * 1024,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36',
      Accept: 'audio/mpeg,audio/*,*/*',
      Referer: 'https://ytshortdown.com/'
    }
  })

  const buffer = Buffer.from(response.data)
  const contentType = String(
    response.headers['content-type'] || ''
  ).toLowerCase()

  if (
    contentType.includes('text/html') ||
    buffer.subarray(0, 100).toString('utf8').toLowerCase().includes('<!doctype html')
  ) {
    throw new Error(
      'El servidor CDN devolvió una página HTML en lugar del MP3.'
    )
  }

  if (!esMP3(buffer)) {
    throw new Error(
      `El archivo recibido no parece MP3. Tipo: ${contentType || 'desconocido'}`
    )
  }

  await fs.promises.writeFile(destino, buffer)

  return buffer.length
}

export function crearHandler(tipo = 'audio') {
  const esDocumento = tipo === 'document'

  return async (m, { conn, args, usedPrefix, command }) => {
    let archivo = null

    try {
      const entrada = args?.[0]?.trim()

      if (!entrada) {
        return m.reply(
          `*༺═────── ✰ ──────═༻*\n` +
          `*༻ USO ✰*\n\n` +
          `*༻ ${usedPrefix + command} <URL o ID de YouTube>*\n` +
          `*༺═────── ✰ ──────═༻*`
        )
      }

      const youtubeUrl = obtenerURL(entrada)

      if (!youtubeUrl) {
        return m.reply('*La URL o ID no parece ser de YouTube.*')
      }

      await m.react?.('⏳')?.catch?.(() => {})

      await fs.promises.mkdir(TMP_DIR, { recursive: true })

      const info = await obtenerAudio(youtubeUrl)
      const titulo = limpiarNombre(info.title || 'audio')
      const filename = `${titulo}.mp3`

      archivo = path.join(
        TMP_DIR,
        `${Date.now()}-${filename}`
      )

      console.log('[SAITAMA YTMP3] Título:', titulo)
      console.log('[SAITAMA YTMP3] CDN:', info.download)

      const size = await descargarMP3(info.download, archivo)

      try {
        if (typeof writeAudioTags === 'function') {
          await writeAudioTags(archivo, {
            title: titulo,
            artist: info.author || ''
          })
        }
      } catch (error) {
        console.error('[SAITAMA YTMP3 TAGS]', error.message)
      }

      if (esDocumento) {
        await conn.sendMessage(
          m.chat,
          {
            document: { url: archivo },
            mimetype: 'audio/mpeg',
            fileName: filename,
            caption:
              `*${titulo}*\n` +
              `✰ Autor: ${info.author || 'No disponible'}`
          },
          { quoted: m }
        )
      } else {
        await conn.sendMessage(
          m.chat,
          {
            audio: { url: archivo },
            mimetype: 'audio/mpeg',
            fileName: filename,
            ptt: false
          },
          { quoted: m }
        )
      }

      console.log('[SAITAMA YTMP3] Tamaño:', size, 'bytes')
      await m.react?.('✅')?.catch?.(() => {})

    } catch (error) {
      console.error('[SAITAMA YTMP3]', error.message)

      await m.react?.('❌')?.catch?.(() => {})

      const mensaje = error.message.includes('CDN devolvió')
        ? 'El servidor de descarga está entregando HTML en vez de audio. Inténtalo más tarde.'
        : 'No se pudo descargar el audio. Inténtalo nuevamente.'

      await m.reply(
        `*༺═────── ✰ ──────═༻*\n` +
        `*༻ ERROR YTMP3 ✰*\n\n` +
        `*༻ ${mensaje}*\n` +
        `*༺═────── ✰ ──────═༻*`
      )

    } finally {
      if (archivo) {
        await rm(archivo, { force: true }).catch(() => {})
      }
    }
  }
}

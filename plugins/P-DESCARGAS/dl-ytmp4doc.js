
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { rm } from 'fs/promises'

const API_URL = 'https://api-faa.my.id/faa/ytmp4'
const TMP_DIR = './tmp/saitamabot-ytmp4doc'
const MAX_ATTEMPTS = 3

async function obtenerVideo(url) {
  const { data } = await axios.get(API_URL, {
    params: { url },
    timeout: 60000
  })

  if (!data?.status || !data?.result?.download_url) {
    throw new Error('La API Faa no devolvió un enlace de descarga válido.')
  }

  return {
    url: data.result.download_url,
    formato: data.result.format || 'mp4'
  }
}

async function descargarArchivo(url, destino) {
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'stream',
    timeout: 180000,
    maxRedirects: 10,
    validateStatus: status => status >= 200 && status < 300
  })

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(destino)

    response.data.pipe(writer)
    writer.on('finish', resolve)
    writer.on('error', reject)
    response.data.on('error', reject)
  })

  comprobarMP4(destino)
}

function comprobarMP4(archivo) {
  if (!fs.existsSync(archivo)) {
    throw new Error('No se encontró el archivo descargado.')
  }

  const stats = fs.statSync(archivo)

  if (stats.size < 100000) {
    throw new Error('El archivo descargado es demasiado pequeño.')
  }

  const buffer = Buffer.alloc(8)
  const fd = fs.openSync(archivo, 'r')

  try {
    fs.readSync(fd, buffer, 0, 8, 0)
  } finally {
    fs.closeSync(fd)
  }

  if (buffer.toString('ascii', 4, 8) !== 'ftyp') {
    throw new Error('El archivo descargado no parece ser un MP4 válido.')
  }
}

async function procesarVideo(url) {
  let ultimoError

  for (let intento = 1; intento <= MAX_ATTEMPTS; intento++) {
    const archivo = path.join(
      TMP_DIR,
      `video_${Date.now()}_${intento}.mp4`
    )

    try {
      const info = await obtenerVideo(url)

      await descargarArchivo(info.url, archivo)

      return {
        archivo,
        nombre: `SaitamaBot_${Date.now()}.mp4`
      }
    } catch (error) {
      ultimoError = error

      await rm(archivo, { force: true }).catch(() => {})

      console.error(
        `[YTMP4DOC] Intento ${intento}/${MAX_ATTEMPTS}:`,
        error.message
      )
    }
  }

  throw ultimoError || new Error('No se pudo descargar el video.')
}

let handler = async (m, { conn, text }) => {
  if (!text) {
    return m.reply(
      '༺═────── ✰ ──────═༻\n' +
      '*DESCARGADOR YTMP4 DOCUMENTO*\n\n' +
      'Ingresa un enlace de YouTube.\n\n' +
      'Ejemplo:\n' +
      '.ytmp4doc https://youtu.be/ID\n' +
      '༺═────── ✰ ──────═༻'
    )
  }

  const youtubeUrl = text.trim()

  if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(youtubeUrl)) {
    return m.reply('✘ Ingresa un enlace válido de YouTube.')
  }

  const reaccionar = async (emoji) => {
    if (typeof m.react === 'function') {
      await m.react(emoji).catch(() => {})
    }
  }

  let archivo

  try {
    await reaccionar('⏳')

    await fs.promises.mkdir(TMP_DIR, { recursive: true })

    await m.reply('*Descargando video...*')

    const resultado = await procesarVideo(youtubeUrl)
    archivo = resultado.archivo

    await conn.sendMessage(
      m.chat,
      {
        document: { url: archivo },
        mimetype: 'video/mp4',
        fileName: resultado.nombre,
        caption:
          `*VIDEO DE YOUTUBE*\n\n` +
          `*Archivo:* ${resultado.nombre}\n\n` +
          `༺═────── ✰ ──────═༻\n` +
          `*SaitamaBot*`
      },
      { quoted: m }
    )

    await reaccionar('✔️')

  } catch (error) {
    console.error('[YTMP4DOC ERROR]', error)

    await reaccionar('✖️')

    await m.reply(
      `No se pudo descargar el video.\n\n` +
      `Motivo: ${error.message}`
    )

  } finally {
    if (archivo) {
      await rm(archivo, { force: true }).catch(() => {})
    }
  }
}

handler.command = [
  'ytmp4doc',
  'ytvdoc',
  'mp4ytdoc'
]

handler.register = false

export default handler


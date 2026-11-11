import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'

const API_URL = 'https://api.delirius.online/download/tiktok'
const TMP_DIR = './tmp/saitamabot-tiktok'

fs.mkdirSync(TMP_DIR, { recursive: true })

const getTikTokUrl = (text = '') => {
  const match = text.match(/https?:\/\/(?:www\.|vt\.|vm\.)?tiktok\.com\/[^\s]+/i)
  return match ? match[0].replace(/[)\]}>.,]+$/, '') : null
}

const deliriusTikTok = async (url) => {
  const response = await axios.get(API_URL, {
    params: { url },
    headers: { Accept: 'application/json' },
    timeout: 60000
  })

  const result = response.data

  if (result?.status !== true || !result?.data) {
    throw new Error('Delirius no pudo procesar el TikTok')
  }

  const data = result.data
  const media = data.meta?.media?.find(item => item.type === 'video')

  if (!media) {
    throw new Error('No se encontró un vídeo disponible')
  }

  const downloadUrl = media.hd || media.org || media.wm

  if (!downloadUrl) {
    throw new Error('No se encontró el enlace del vídeo')
  }

  return {
    data,
    downloadUrl,
    quality: media.hd ? 'HD' : media.org ? 'Sin marca de agua' : 'Con marca de agua'
  }
}

const downloadVideo = async (url) => {
  const filename = `tiktok_${Date.now()}.mp4`
  const filePath = path.join(TMP_DIR, filename)

  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 120000,
    maxRedirects: 10,
    maxContentLength: 150 * 1024 * 1024,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36',
      Referer: 'https://www.tiktok.com/'
    }
  })

  await pipeline(response.data, fs.createWriteStream(filePath))

  const stat = fs.statSync(filePath)

  if (stat.size < 10000) {
    fs.rmSync(filePath, { force: true })
    throw new Error('El vídeo descargado no es válido')
  }

  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(32)

  fs.readSync(fd, buffer, 0, 32, 0)
  fs.closeSync(fd)

  if (!buffer.includes(Buffer.from('ftyp'))) {
    fs.rmSync(filePath, { force: true })
    throw new Error('El archivo no es un MP4 válido')
  }

  return filePath
}

const clean = (value, fallback = 'No disponible') => {
  return value ? String(value).replace(/[\r\n]+/g, ' ').trim() : fallback
}

const createCaption = (data, quality) => {
  const author = data.author || {}
  const music = data.music || {}

  return `*༺═────── ✰ ──────═༻*

*༻ 𝚃𝙸𝙺𝚃𝙾𝙺 ✰*

✰ Título: ${clean(data.title, 'TikTok')}
✰ Autor: ${clean(author.nickname)}
✰ Usuario: ${clean(author.username)}
✰ Reproducciones: ${clean(data.repro)}
✰ Me gusta: ${clean(data.like)}
✰ Compartidos: ${clean(data.share)}
✰ Comentarios: ${clean(data.comment)}
✰ Duración: ${clean(data.duration, '0')} segundos
✰ Música: ${clean(music.title)}
✰ Calidad: ${quality}
✰ Descargas: ${clean(data.download)}

*༻ 𝙰𝙿𝙸: Luxifyniti*

*༺═────── ✰ ──────═༻*`
}

const handler = async (m, { conn, args, text }) => {
  let filePath = null

  try {
    const input = args?.[0] || text?.trim()
    const url = getTikTokUrl(input || '')

    if (!url) {
      return m.reply(
`*༺═────── ✰ ──────═༻*

*༻ 𝚃𝙸𝙺𝚃𝙾𝙺 ✰*

*༻ 𝚄𝚜𝚘:* .tiktok <url>

*༻ 𝙴𝚓𝚎𝚖𝚙𝚕𝚘:*
.tiktok https://vt.tiktok.com/ZS43DntHW/

*༺═────── ✰ ──────═༻*`
      )
    }

    await conn.sendMessage(m.chat, {
      react: { text: '⏳', key: m.key }
    })

    const result = await deliriusTikTok(url)

    console.log('[DELIRIUS TIKTOK]', result.quality)

    filePath = await downloadVideo(result.downloadUrl)

    const caption = createCaption(result.data, result.quality)

    await conn.sendMessage(
      m.chat,
      {
        video: fs.readFileSync(filePath),
        mimetype: 'video/mp4',
        fileName: 'TikTok.mp4',
        caption
      },
      { quoted: m }
    )

    await conn.sendMessage(m.chat, {
      react: { text: '✅', key: m.key }
    })

  } catch (error) {
    console.error(
      '[DELIRIUS TIKTOK]',
      error?.response?.data || error.message
    )

    await conn.sendMessage(m.chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await m.reply(
`*༺═────── ✰ ──────═༻*

*༻ 𝙴𝚁𝚁𝙾𝚁 𝚃𝙸𝙺𝚃𝙾𝙺 ✰*

✰ No se pudo descargar el vídeo.
✰ Comprueba que el enlace sea público.

*༺═────── ✰ ──────═༻*`
    )

  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.rmSync(filePath, { force: true })
      } catch (error) {
        console.error('[TIKTOK CLEANUP]', error.message)
      }
    }
  }
}

handler.help = [
  'tiktok <url>',
  'tt <url>',
  'tiktokdl <url>'
]

handler.tags = ['descargas']

handler.command = [
  'tiktok',
  'tt',
  'tiktokdl'
]

export default handler

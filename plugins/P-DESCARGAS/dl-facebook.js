import axios from 'axios'
import fs from 'fs'
import path from 'path'

const API_URL = 'https://api.delirius.online/download/facebook'
const TMP_DIR = './tmp'

const isFacebookUrl = (url = '') => {
  return /^https?:\/\/(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\//i.test(url)
}

const getFacebookUrl = (text = '') => {
  const match = text.match(
    /https?:\/\/(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/[^\s]+/i
  )

  return match ? match[0].replace(/[)\]}>.,]+$/, '') : null
}

// Obtener vídeo mediante Delirius API
const deliriusFacebook = async (url) => {
  const response = await axios.get(API_URL, {
    params: { url },
    headers: {
      Accept: 'application/json'
    },
    timeout: 60000,
    validateStatus: () => true
  })

  if (response.status !== 200) {
    throw new Error(`Delirius respondió HTTP ${response.status}`)
  }

  const data = response.data

  if (data?.status !== true) {
    throw new Error('Delirius no pudo procesar el vídeo')
  }

  if (!Array.isArray(data?.list) || !data.list.length) {
    throw new Error('Delirius no devolvió vídeos disponibles')
  }

  // Seleccionar la calidad más alta disponible
  const videos = data.list
    .filter(item => item?.url)
    .sort((a, b) => {
      const qualityA = parseInt(a.quality?.match(/\d+/)?.[0] || 0)
      const qualityB = parseInt(b.quality?.match(/\d+/)?.[0] || 0)

      return qualityB - qualityA
    })

  if (!videos.length) {
    throw new Error('No se encontró ningún enlace de descarga')
  }

  return {
    downloadUrl: videos[0].url,
    quality: videos[0].quality || 'Desconocida',
    thumbnail: data.thumb || null,
    creator: data.creator || 'Delirius'
  }
}

// Descargar archivo MP4
const downloadVideo = async (url) => {
  fs.mkdirSync(TMP_DIR, { recursive: true })

  const filename = `facebook_${Date.now()}.mp4`
  const filePath = path.join(TMP_DIR, filename)

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,
    maxContentLength: 150 * 1024 * 1024,
    maxBodyLength: 150 * 1024 * 1024
  })

  const buffer = Buffer.from(response.data)

  if (!buffer.length) {
    throw new Error('El vídeo descargado está vacío')
  }

  fs.writeFileSync(filePath, buffer)

  return filePath
}

let handler = async (m, { conn, text }) => {
  let filePath = null

  try {
    const input = text?.trim()

    if (!input) {
      return m.reply(
`*༺═────── ✰ ──────═༻*

*༻ 𝙵𝙰𝙲𝙴𝙱𝙾𝙾𝙺 ✰*

*༻ 𝚄𝚜𝚘:* .fb <𝚞𝚛𝚕>

*༻ 𝙴𝚓𝚎𝚖𝚙𝚕𝚘:*
.fb https://www.facebook.com/share/r/...

*༺═────── ✰ ──────═༻*`
      )
    }

    const url = getFacebookUrl(input)

    if (!url || !isFacebookUrl(url)) {
      return m.reply(
`*༺═────── ✰ ──────═༻*

*༻ 𝙴𝚁𝚁𝙾𝚁 𝙵𝙰𝙲𝙴𝙱𝙾𝙾𝙺 ✰*

✰ La URL no parece ser válida.

✰ Utiliza un enlace público de Facebook.

*༺═────── ✰ ──────═༻*`
      )
    }

    await conn.sendMessage(m.chat, {
      react: { text: '⏳', key: m.key }
    })

    // Consultar Delirius
    const result = await deliriusFacebook(url)

    console.log('[DELIRIUS FACEBOOK]', result.quality)

    // Descargar vídeo
    filePath = await downloadVideo(result.downloadUrl)

    // Enviar vídeo
    await conn.sendMessage(
      m.chat,
      {
        video: fs.readFileSync(filePath),
        mimetype: 'video/mp4',
        fileName: 'Facebook.mp4',
        caption:
`*༺═────── ✰ ──────═༻*

*༻ 𝙵𝙰𝙲𝙴𝙱𝙾𝙾𝙺 ✰*

✰ Calidad: ${result.quality}
✰ API: Delirius

*༺═────── ✰ ──────═༻*`
      },
      { quoted: m }
    )

    await conn.sendMessage(m.chat, {
      react: { text: '✅', key: m.key }
    })

  } catch (error) {
    console.error(
      '[DELIRIUS FACEBOOK]',
      error?.response?.data || error.message
    )

    await conn.sendMessage(m.chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    return m.reply(
`*༺═────── ✰ ──────═༻*

*༻ 𝙴𝚁𝚁𝙾𝚁 𝙵𝙰𝙲𝙴𝙱𝙾𝙾𝙺 ✰*

✰ No se pudo descargar el vídeo.

✰ Comprueba que el enlace sea público o que Delirius esté disponible.

*༺═────── ✰ ──────═༻*`
    )

  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
      } catch (error) {
        console.error('[FACEBOOK CLEANUP]', error.message)
      }
    }
  }
}

handler.help = [
  'fb <url>',
  'facebook <url>'
]

handler.tags = [
  'download'
]

handler.command = [
  'fb',
  'facebook',
  'fbdl'
]

handler.register = false

export default handler

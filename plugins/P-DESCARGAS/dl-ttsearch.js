
import fetch from 'node-fetch'
import config from '../../config.js'

// ═══════════════════════════════════════
// ༺ ✰ SAITAMABOT • TIKTOK SEARCH ✰ ༻
// FAA API • VIDEO • MÚSICA • SIGUIENTE
// ═══════════════════════════════════════

const API_URL = 'https://api-faa.my.id/faa/tiktok-search'
const MAX_RESULTS = 10
const MAX_VIDEO_BYTES = 80 * 1024 * 1024
const MAX_AUDIO_BYTES = 25 * 1024 * 1024

const BOT_NAME =
  config.botName || '𝑺𝒂𝒊𝒕𝒂𝒎𝒂𝑩𝒐𝒕'

global.tiktokSearchCache ??= Object.create(null)

// ═══════════════════════════════════════
// ✰ UTILIDADES
// ═══════════════════════════════════════

async function getJSON(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 30000
  })

  if (!response.ok) {
    throw new Error(`FAA HTTP ${response.status}`)
  }

  return response.json()
}

async function getBuffer(url, maxBytes) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    throw new Error('Enlace multimedia no válido')
  }

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 45000
  })

  if (!response.ok) {
    throw new Error(`Descarga HTTP ${response.status}`)
  }

  const length = Number(
    response.headers.get('content-length') || 0
  )

  if (length > maxBytes) {
    throw new Error('El archivo supera el tamaño permitido')
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  if (!buffer.length || buffer.length > maxBytes) {
    throw new Error('Archivo vacío o demasiado grande')
  }

  return buffer
}

function safeText(value, fallback = 'N/D') {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  return String(value).slice(0, 1000)
}

// ═══════════════════════════════════════
// ✰ TARJETA DE RESULTADO
// ═══════════════════════════════════════

async function sendTikTokCard(
  conn,
  m,
  data,
  usedPrefix
) {
  const video = data.results[data.index]

  if (!video) {
    return m.reply('༺ ✰ Resultado no disponible ✰ ༻')
  }

  const author = video.author || {}
  const stats = video.stats || {}
  const music = video.music || {}

  const username = author.username
    ? `@${author.username}`
    : author.nickname || 'Desconocido'

  const caption =
`*༺═────── ✰ ──────═༻*
*༺ 𝚃𝙸𝙺𝚃𝙾𝙺 𝚂𝙴𝙰𝚁𝙲𝙷 ✰*

✦ *Título:* ${safeText(video.title, 'Sin título')}
✦ *Autor:* ${safeText(username)}
✦ *Duración:* ${safeText(video.duration)}
✦ *Vistas:* ${safeText(stats.views)}
✦ *Likes:* ${safeText(stats.likes)}
✦ *Comentarios:* ${safeText(stats.comments)}
✦ *Compartidos:* ${safeText(stats.shares)}
✦ *Descargas:* ${safeText(stats.downloads)}
✦ *Música:* ${safeText(music.title)}
✦ *Artista:* ${safeText(music.author)}
✦ *Resultado:* ${data.index + 1}/${data.results.length}

*༺═────── ✰ ──────═༻*
*✦ 𝟮𝟬𝟮𝟲 • ֆǟɨ ✦*`

  const buttons = [
    {
      text: '༺ ✰ FORMATO ✰ ༻',
      sections: [
        {
          title: '╭─〔 VIDEO 〕─╮',
          rows: [
            {
              title: '🎬 ❯ VIDEO MP4',
              description: 'Descargar el video seleccionado',
              id: `${usedPrefix}ttvideo ${data.index + 1}`
            }
          ]
        },
        {
          title: '╭─〔 MÚSICA 〕─╮',
          rows: [
            {
              title: '🎵 ❯ MÚSICA MP3',
              description: 'Descargar el audio de TikTok',
              id: `${usedPrefix}ttmusic ${data.index + 1}`
            }
          ]
        },
        {
          title: '╭─〔 BÚSQUEDA 〕─╮',
          rows: [
            {
              title: '➡️ ❯ SIGUIENTE RESULTADO',
              description: `${data.index + 1}/${data.results.length}`,
              id: `${usedPrefix}ttnext`
            }
          ]
        }
      ]
    }
  ]

  const message = {
    caption,
    footer: BOT_NAME,
    buttons
  }

  if (video.cover) {
    message.image = { url: video.cover }
  }

  return conn.sendMessage(
    m.chat,
    message,
    { quoted: m }
  )
}

// ═══════════════════════════════════════
// ✰ HANDLER
// ═══════════════════════════════════════

const handler = async (
  m,
  { conn, text, usedPrefix, command }
) => {
  const sender = m.sender
  const cmd = command.toLowerCase()
  const data = global.tiktokSearchCache[sender]

  try {
    // ═════════════════════════════════
    // ✰ VIDEO MP4
    // ═════════════════════════════════

    if (cmd === 'ttvideo') {
      if (!data?.results?.length) {
        return m.reply(
          `Primero realiza una búsqueda:\n${usedPrefix}ttsearch <texto>`
        )
      }

      const number = Number(text?.trim())
      const index = Number.isInteger(number) && number > 0
        ? number - 1
        : data.index

      const video = data.results[index]

      if (!video) {
        return m.reply('❌ Resultado no válido.')
      }

      const url = video.url_nowm || video.url_wm

      if (!url) {
        return m.reply('❌ Este resultado no tiene enlace de video.')
      }

      await conn.sendMessage(m.chat, {
        react: { text: '⏳', key: m.key }
      }).catch(() => {})

      const buffer = await getBuffer(url, MAX_VIDEO_BYTES)

      await conn.sendMessage(
        m.chat,
        {
          video: buffer,
          mimetype: 'video/mp4',
          caption:
`༺═──── ✰ ────═༻
✦ 𝚃𝙸𝙺𝚃𝙾𝙺 • 𝚅𝙸𝙳𝙴𝙾 ✦

✦ ${safeText(video.title, 'TikTok')}
✦ Autor: @${safeText(video.author?.username, 'Desconocido')}

༺ ✰ ${BOT_NAME} ✰ ༻`
        },
        { quoted: m }
      )

      await conn.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      }).catch(() => {})

      return
    }

    // ═════════════════════════════════
    // ✰ MÚSICA MP3
    // ═════════════════════════════════

    if (cmd === 'ttmusic') {
      if (!data?.results?.length) {
        return m.reply(
          `Primero realiza una búsqueda:\n${usedPrefix}ttsearch <texto>`
        )
      }

      const number = Number(text?.trim())
      const index = Number.isInteger(number) && number > 0
        ? number - 1
        : data.index

      const video = data.results[index]
      const music = video?.music

      if (!music?.url) {
        return m.reply('❌ Este resultado no proporciona un enlace de música.')
      }

      await conn.sendMessage(m.chat, {
        react: { text: '⏳', key: m.key }
      }).catch(() => {})

      const buffer = await getBuffer(
        music.url,
        MAX_AUDIO_BYTES
      )

      await conn.sendMessage(
        m.chat,
        {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${String(music.title || 'TikTok').replace(/[\\/:*?"<>|]/g, '_')}.mp3`,
          ptt: false
        },
        { quoted: m }
      )

      await conn.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      }).catch(() => {})

      return
    }

    // ═════════════════════════════════
    // ✰ SIGUIENTE RESULTADO
    // ═════════════════════════════════

    if (cmd === 'ttnext') {
      if (!data?.results?.length) {
        return m.reply(
          `No tienes resultados guardados.\nUsa ${usedPrefix}ttsearch <texto>`
        )
      }

      data.index++

      if (data.index >= data.results.length) {
        data.index = 0
      }

      return sendTikTokCard(conn, m, data, usedPrefix)
    }

    // ═════════════════════════════════
    // ✰ BÚSQUEDA
    // ═════════════════════════════════

    const query = text?.trim() || ''

    if (!query) {
      return m.reply(
`༺ ✰ 𝚃𝙸𝙺𝚃𝙾𝙺 𝚂𝙴𝙰𝚁𝙲𝙷 ✰ ༻

✦ Uso:
${usedPrefix}${command} <texto>

✦ Ejemplo:
${usedPrefix}${command} Edits emmayers

✦ ${BOT_NAME}`
      )
    }

    await conn.sendMessage(m.chat, {
      react: { text: '⏳', key: m.key }
    }).catch(() => {})

    const searchMsg = await m.reply(
`༺ ✰ 𝙱𝚄𝚂𝙲𝙰𝙽𝙳𝙾 ✰ ༻

✦ ${query}
✦ Fuente: Saiiita.com`
    )

    const json = await getJSON(
      `${API_URL}?q=${encodeURIComponent(query)}`
    )

    if (json?.status !== true || !Array.isArray(json.result)) {
      throw new Error('Respuesta inesperada de FAA')
    }

    const results = json.result
      .filter(v => v && (v.cover || v.url_nowm || v.url_wm))
      .slice(0, MAX_RESULTS)

    if (!results.length) {
      await conn.sendMessage(m.chat, {
        edit: searchMsg.key,
        text: `༺ ✰ SIN RESULTADOS ✰ ༻\n\n✦ ${query}`
      }).catch(() => {})

      return
    }

    global.tiktokSearchCache[sender] = {
      query,
      index: 0,
      results,
      createdAt: Date.now()
    }

    await conn.sendMessage(m.chat, {
      edit: searchMsg.key,
      text:
`༺ ✰ 𝚁𝙴𝚂𝚄𝙻𝚃𝙰𝙳𝙾𝚂 ✰ ༻

✦ Encontrados: ${results.length}
✦ Mostrando resultado 1/${results.length}

✦ ${BOT_NAME}`
    }).catch(() => {})

    await sendTikTokCard(
      conn,
      m,
      global.tiktokSearchCache[sender],
      usedPrefix
    )

    await conn.sendMessage(m.chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})
  } catch (error) {
    console.error('[SAITAMA TTSEARCH]', error)

    await conn.sendMessage(m.chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})

    await m.reply(
`༺ ✰ 𝙴𝚁𝚁𝙾𝚁 ✰ ༻

No se pudo completar la operación.
Comprueba que los enlaces de FAA sigan disponibles.

✦ ${BOT_NAME}`
    )
  }
}

// ═══════════════════════════════════════
// ✰ COMANDOS
// ═══════════════════════════════════════

handler.help = [
  'ttsearch <texto>',
  'ttvideo <número>',
  'ttmusic <número>',
  'ttnext'
]

handler.tags = ['buscador', 'descargas']

handler.command = [
  'ttsearch',
  'tiktoksearch',
  'tts',
  'ttvideo',
  'ttmusic',
  'ttnext'
]

export default handler


import axios from 'axios'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ CONFIGURACIÓN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const API_PRIMARY = 'https://api.delirius.online/search/ytsearch'
const API_BACKUP = 'https://api-faa.my.id/faa/youtube'

const MAX_RESULTS = 10
const API_TIMEOUT = 30000

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ REACCIONES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function react(conn, m, emoji) {
  try {
    await conn.sendMessage(m.chat, {
      react: {
        text: emoji,
        key: m.key
      }
    })
  } catch {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ NORMALIZAR DELIRIUS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalizeDelirius(item) {
  const videoId = item.videoId || ''

  return {
    title: item.title || 'Sin título',
    channel: item.author?.name || 'No disponible',
    duration: item.duration || 'No disponible',
    views: item.views != null
      ? Number(item.views).toLocaleString('es-PE')
      : 'No disponible',
    image: item.image || item.thumbnail || '',
    url: item.url || (videoId ? `https://youtu.be/${videoId}` : '')
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ NORMALIZAR FAA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalizeFaa(item) {
  return {
    title: item.title || 'Sin título',
    channel: item.channel || 'No disponible',
    duration: item.duration || 'No disponible',
    views: item.views != null
      ? Number(item.views).toLocaleString('es-PE')
      : 'No disponible',
    image: item.imageUrl || item.thumbnail || '',
    url: item.link || item.url || ''
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ DELIRIUS: API PRINCIPAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function searchDelirius(query) {
  const { data } = await axios.get(API_PRIMARY, {
    params: { q: query },
    timeout: API_TIMEOUT
  })

  if (!data?.status || !Array.isArray(data.data)) {
    throw new Error('Respuesta inválida de Delirius')
  }

  const results = data.data
    .filter(item => item.type === 'video' || item.videoId || item.url)
    .map(normalizeDelirius)
    .filter(item => item.title && item.url && item.image)

  if (!results.length) {
    throw new Error('Sin resultados válidos de Delirius')
  }

  return results.slice(0, MAX_RESULTS)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ FAA: API DE RESPALDO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function searchFaa(query) {
  const { data } = await axios.get(API_BACKUP, {
    params: { q: query },
    timeout: API_TIMEOUT
  })

  if (!data?.status || !Array.isArray(data.result)) {
    throw new Error('Respuesta inválida de Faa')
  }

  const results = data.result
    .map(normalizeFaa)
    .filter(item => item.title && item.url && item.image)

  if (!results.length) {
    throw new Error('Sin resultados válidos de Faa')
  }

  return results.slice(0, MAX_RESULTS)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text?.trim()) {
    return conn.sendMessage(m.chat, {
      text: `✰ *𝚈𝙾𝚄𝚃𝚄𝙱𝙴 𝚂𝙴𝙰𝚁𝙲𝙷*

• 𝙴𝚜𝚌𝚛𝚒𝚋𝚎 𝚕𝚘 𝚚𝚞𝚎 𝚍𝚎𝚜𝚎𝚊𝚜 𝚋𝚞𝚜𝚌𝚊𝚛.
• 𝙴𝚓𝚎𝚖𝚙𝚕𝚘: ${usedPrefix + command} Bad Bunny

SaitamaBot`
    }, { quoted: m })
  }

  const query = text.trim()

  // ✰ REACCIÓN DE BÚSQUEDA
  await react(conn, m, '🔎')

  let results
  let source = 'Delirius'

  // ✰ INTENTAR API PRINCIPAL
  try {
    results = await searchDelirius(query)
  } catch (error) {
    console.error('[YTSEARCH] Delirius:', error.message)

    // ✰ UTILIZAR API DE RESPALDO
    source = 'Faa'

    try {
      results = await searchFaa(query)
    } catch (backupError) {
      console.error('[YTSEARCH] Faa:', backupError.message)

      await react(conn, m, '❌')

      return conn.sendMessage(m.chat, {
        text: `༺ ✰ 𝙴𝚁𝚁𝙾𝚁 𝚈𝚃𝚂𝙴𝙰𝚁𝙲𝙷 ✰ ༻

• 𝙽𝚘 𝚜𝚎 𝚎𝚗𝚌𝚘𝚗𝚝𝚛𝚊𝚛𝚘𝚗 𝚛𝚎𝚜𝚞𝚕𝚝𝚊𝚍𝚘𝚜.
• 𝙻𝚊𝚜 𝚍𝚘𝚜 𝙰𝙿𝙸 𝚏𝚊𝚕𝚕𝚊𝚛𝚘𝚗.

SaitamaBot`
      }, { quoted: m })
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✰ CREAR TARJETAS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const cards = results.map((video, index) => ({
    image: {
      url: video.image
    },

    title: `#${index + 1}`,

    caption: `∆ *${video.title}* ∆
𝙲𝚊𝚗𝚊𝚕: ${video.channel}
𝙳𝚞𝚛𝚊𝚌𝚒𝚘́𝚗: ${video.duration} • 𝚅𝚒𝚜𝚝𝚊𝚜: ${video.views}`,

    footer: 'SaitamaBot',

    nativeFlow: [
      {
        text: 'MP3',
        copy: `.ytmp3 ${video.url}`
      },
      {
        text: 'MP4',
        copy: `.ytmp4 ${video.url}`
      }
    ]
  }))

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✰ ENVIAR CARRUSEL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  try {
    await conn.sendMessage(m.chat, {
      text: `✰ *𝚈𝙾𝚄𝚃𝚄𝙱𝙴 𝚂𝙴𝙰𝚁𝙲𝙷*

• 𝙱𝚞́𝚜𝚚𝚞𝚎𝚍𝚊: ${query}
• 𝚁𝚎𝚜𝚞𝚕𝚝𝚊𝚍𝚘𝚜: ${cards.length}
• 𝙰𝙿𝙸: ${source}`,

      footer: 'SaitamaBot',
      cards
    }, { quoted: m })

    await react(conn, m, '✅')

  } catch (error) {
    console.error('[YTSEARCH] Carrusel:', error?.stack || error)

    await react(conn, m, '❌')

    await conn.sendMessage(m.chat, {
      text: `༺ ✰ 𝙴𝚁𝚁𝙾𝚁 𝙲𝙰𝚁𝚁𝚄𝚂𝙴𝙻 ✰ ༻

• 𝙽𝚘 𝚜𝚎 𝚙𝚞𝚍𝚘 𝚎𝚗𝚟𝚒𝚊𝚛 𝚎𝚕 𝚌𝚊𝚛𝚛𝚞𝚜𝚎𝚕.
• ${error.message}

SaitamaBot`
    }, { quoted: m })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✰ COMANDOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

handler.help = ['ytsearch <texto>']
handler.tags = ['busqueda']
handler.command = ['ytsearch', 'yts']
handler.register = false

export default handler

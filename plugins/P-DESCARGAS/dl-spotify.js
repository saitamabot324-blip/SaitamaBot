
import axios from 'axios'
import config from '../../config.js'

// ═══════════════════════════════════════
// ✰ SAITAMABOT • SPOTIFY SEARCH
// ═══════════════════════════════════════

global.spotifyCache =
  global.spotifyCache || {}

const CACHE_TIME =
  10 * 60 * 1000

const API_URL =
  'https://api.delirius.online/search/spotify'

const BOT_NAME =
  config.botName ||
  '𝚂𝙰𝙸𝚃𝙰𝙼𝙰𝙱𝙾𝚃'


// ═══════════════════════════════════════
// ✰ SPOTIFY SEARCH • DELIRIUS
// ═══════════════════════════════════════

async function searchSpotify(query, limit = 10) {
  if (!query?.trim()) {
    throw new Error(
      '𝙻𝚊 𝚋ú𝚜𝚚𝚞𝚎𝚍𝚊 𝚎𝚜𝚝á 𝚟𝚊𝚌í𝚊.'
    )
  }

  limit = Math.min(
    Math.max(Number(limit) || 10, 1),
    10
  )

  const response = await axios.get(API_URL, {
    params: {
      q: query.trim(),
      limit
    },
    timeout: 20000
  })

  const data = response?.data

  if (!data) {
    throw new Error(
      '𝙻𝚊 𝙰𝙿𝙸 𝚗𝚘 𝚍𝚎𝚟𝚘𝚕𝚟𝚒ó 𝚞𝚗𝚊 𝚛𝚎𝚜𝚙𝚞𝚎𝚜𝚝𝚊.'
    )
  }

  if (data.status !== true) {
    throw new Error(
      data.message ||
      '𝙳𝚎𝚕𝚒𝚛𝚒𝚞𝚜 𝚗𝚘 𝚙𝚞𝚍𝚘 𝚛𝚎𝚊𝚕𝚒𝚣𝚊𝚛 𝚕𝚊 𝚋ú𝚜𝚚𝚞𝚎𝚍𝚊.'
    )
  }

  const tracks = data.data

  if (!Array.isArray(tracks)) {
    throw new Error(
      '𝙻𝚊 𝙰𝙿𝙸 𝚍𝚎𝚟𝚘𝚕𝚟𝚒ó 𝚞𝚗 𝚏𝚘𝚛𝚖𝚊𝚝𝚘 𝚒𝚗𝚟á𝚕𝚒𝚍𝚘.'
    )
  }

  return tracks.slice(0, limit).map(track => {
    const id =
      String(track?.id || '')

    const title =
      track?.title ||
      '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘'

    const artist =
      track?.artist ||
      '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘'

    const album =
      track?.album ||
      '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘'

    const duration =
      track?.duration ||
      '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚊'

    const image =
      track?.image ||
      null

    const publish =
      track?.publish ||
      '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘'

    const durationParts =
      String(duration).match(/^(\d+):([0-5]\d)$/)

    const durationMs =
      durationParts
        ? (
            Number(durationParts[1]) * 60 +
            Number(durationParts[2])
          ) * 1000
        : 0

    const spotifyUrl =
      track?.url ||
      (
        id
          ? `https://open.spotify.com/track/${id}`
          : `https://open.spotify.com/search/${encodeURIComponent(
              `${title} ${artist}`
            )}`
      )

    return {
      id,
      title,
      name: title,
      artist,

      artists: artist
        .split(', ')
        .map(name => ({ name })),

      album,

      albumData: {
        name: album,
        image
      },

      image,
      cover: image,
      duration,
      durationMs,
      url: spotifyUrl,
      spotifyUrl,

      explicit: false,
      publish,

      year: /^\d{4}/.test(publish)
        ? publish.slice(0, 4)
        : '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘',

      popularity:
        track?.popularity ||
        '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘'
    }
  })
}


// ═══════════════════════════════════════
// ✰ OBTENER USUARIO
// ═══════════════════════════════════════

function getSender(m) {
  return (
    m.sender ||
    m.key?.participant ||
    m.participant ||
    m.chat
  )
}


// ═══════════════════════════════════════
// ✰ LIMPIAR CACHE
// ═══════════════════════════════════════

function cleanSpotifyCache(sender) {
  const cache =
    global.spotifyCache?.[sender]

  if (!cache) {
    return null
  }

  if (
    Date.now() - cache.time >
    CACHE_TIME
  ) {
    delete global.spotifyCache[sender]
    return null
  }

  return cache
}


// ═══════════════════════════════════════
// ✰ HANDLER
// ═══════════════════════════════════════

const handler = async (
  m,
  {
    conn,
    text,
    usedPrefix,
    command
  }
) => {
  try {
    const sender =
      getSender(m)

    // ═════════════════════════════════
    // ✰ SIGUIENTE RESULTADO
    // ═════════════════════════════════

    if (
      [
        'spnext',
        'spotify-next',
        'spotify_next'
      ].includes(command)
    ) {
      const cache =
        cleanSpotifyCache(sender)

      if (
        !cache ||
        !Array.isArray(cache.results) ||
        !cache.results.length
      ) {
        return m.reply(
`༺ 𝚂𝙸𝙽 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 ༻

✰ 𝙽𝚘 𝚑𝚊𝚢 𝚞𝚗𝚊 𝚋ú𝚜𝚚𝚞𝚎𝚍𝚊 𝚊𝚗𝚝𝚎𝚛𝚒𝚘𝚛.

✰ 𝚄𝚜𝚊:
${usedPrefix}spotify <texto>

✰ 𝙴𝚓𝚎𝚖𝚙𝚕𝚘:
${usedPrefix}spotify The Weeknd

✰ ${BOT_NAME}`
        )
      }

      cache.index++

      if (cache.index >= cache.results.length) {
        cache.index = 0
      }

      cache.time = Date.now()

      await conn.sendMessage(m.chat, {
        react: {
          text: '🔎',
          key: m.key
        }
      }).catch(() => {})

      await sendSpotifyCard(
        conn,
        m,
        cache.results,
        cache.index,
        usedPrefix
      )

      await conn.sendMessage(m.chat, {
        react: {
          text: '✅',
          key: m.key
        }
      }).catch(() => {})

      return
    }

    // ═════════════════════════════════
    // ✰ CONSULTA
    // ═════════════════════════════════

    const query =
      String(text || '').trim()

    if (!query) {
      return m.reply(
`༺ 𝚂𝙿𝙾𝚃𝙸𝙵𝚈 ༻

✰ 𝙸𝚗𝚐𝚛𝚎𝚜𝚊 𝚎𝚕 𝚗𝚘𝚖𝚋𝚛𝚎 𝚍𝚎 𝚞𝚗𝚊 𝚌𝚊𝚗𝚌𝚒ó𝚗.

✰ 𝚄𝚜𝚊:
${usedPrefix}${command} <texto>

✰ 𝙴𝚓𝚎𝚖𝚙𝚕𝚘:
${usedPrefix}${command} Twice

✰ ${BOT_NAME}`
      )
    }

    // ═════════════════════════════════
    // ✰ REACCIÓN
    // ═════════════════════════════════

    await conn.sendMessage(m.chat, {
      react: {
        text: '⏳',
        key: m.key
      }
    }).catch(() => {})

    // ═════════════════════════════════
    // ✰ MENSAJE DE BÚSQUEDA
    // ═════════════════════════════════

    const searchMsg = await m.reply(
`༺ 𝙱𝚄𝚂𝙲𝙰𝙽𝙳𝙾 𝚂𝙿𝙾𝚃𝙸𝙵𝚈 ༻

✰ 𝙱𝚞𝚜𝚌𝚊𝚗𝚍𝚘:
${query}

✰ 𝙴𝚜𝚙𝚎𝚛𝚊 𝚞𝚗 𝚖𝚘𝚖𝚎𝚗𝚝𝚘...

✰ ${BOT_NAME}`
    )

    // ═════════════════════════════════
    // ✰ BUSCAR EN DELIRIUS
    // ═════════════════════════════════

    const results =
      await searchSpotify(query, 10)

    // ═════════════════════════════════
    // ✰ SIN RESULTADOS
    // ═════════════════════════════════

    if (!results.length) {
      await conn.sendMessage(m.chat, {
        edit: searchMsg.key,
        text:
`༺ 𝚂𝙸𝙽 𝚁𝙴𝚂𝚄𝙻𝚃𝙰𝙳𝙾𝚂 ༻

✰ 𝙽𝚘 𝚎𝚗𝚌𝚘𝚗𝚝𝚛é:
${query}

✰ ${BOT_NAME}`
      }).catch(() => {})

      await conn.sendMessage(m.chat, {
        react: {
          text: '❌',
          key: m.key
        }
      }).catch(() => {})

      return
    }

    // ═════════════════════════════════
    // ✰ GUARDAR CACHE
    // ═════════════════════════════════

    global.spotifyCache[sender] = {
      query,
      index: 0,
      results,
      time: Date.now()
    }

    // ═════════════════════════════════
    // ✰ EDITAR MENSAJE
    // ═════════════════════════════════

    await conn.sendMessage(m.chat, {
      edit: searchMsg.key,
      text:
`༺ 𝚁𝙴𝚂𝚄𝙻𝚃𝙰𝙳𝙾𝚂 𝚂𝙿𝙾𝚃𝙸𝙵𝚈 ༻

✰ 𝙴𝚗𝚌𝚘𝚗𝚝𝚛𝚊𝚍𝚘𝚜:
${results.length}

✰ ${BOT_NAME}`
    }).catch(() => {})

    // ═════════════════════════════════
    // ✰ MOSTRAR RESULTADO
    // ═════════════════════════════════

    await sendSpotifyCard(
      conn,
      m,
      results,
      0,
      usedPrefix
    )

    await conn.sendMessage(m.chat, {
      react: {
        text: '✅',
        key: m.key
      }
    }).catch(() => {})

  } catch (error) {
    console.error(
      '[SPOTIFY SEARCH]',
      error?.response?.data ||
      error?.message ||
      error
    )

    await conn.sendMessage(m.chat, {
      react: {
        text: '❌',
        key: m.key
      }
    }).catch(() => {})

    return m.reply(
`༺ 𝙴𝚁𝚁𝙾𝚁 𝚂𝙿𝙾𝚃𝙸𝙵𝚈 ༻

✰ 𝙽𝚘 𝚜𝚎 𝚙𝚞𝚍𝚘 𝚛𝚎𝚊𝚕𝚒𝚣𝚊𝚛 𝚕𝚊 𝚋ú𝚜𝚚𝚞𝚎𝚍𝚊.

✰ 𝙸𝚗𝚝𝚎𝚗𝚝𝚊 𝚍𝚎 𝚗𝚞𝚎𝚟𝚘.

✰ ${BOT_NAME}`
    )
  }
}


// ═══════════════════════════════════════
// ✰ TARJETA SPOTIFY
// ═══════════════════════════════════════

async function sendSpotifyCard(
  conn,
  m,
  results,
  index,
  usedPrefix
) {
  const song = results[index]

  if (!song) {
    return m.reply(
`༺ 𝚁𝙴𝚂𝚄𝙻𝚃𝙰𝙳𝙾 𝙸𝙽𝚅Á𝙻𝙸𝙳𝙾 ༻

✰ 𝙽𝚘 𝚎𝚡𝚒𝚜𝚝𝚎 𝚎𝚜𝚎 𝚛𝚎𝚜𝚞𝚕𝚝𝚊𝚍𝚘.

✰ ${BOT_NAME}`
    )
  }

  // ═════════════════════════════════
  // ✰ DATOS
  // ═════════════════════════════════

  const title =
    song.title ||
    song.name ||
    '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘'

  const artist =
    song.artist ||
    '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘'

  const album =
    song.album ||
    '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘'

  const duration =
    song.duration ||
    '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚊'

  const image =
    song.image ||
    song.cover ||
    null

  const spotifyUrl =
    song.spotifyUrl ||
    song.url ||
    ''


const infoText =
`*༺═──── ✦ ────═༻*
*༻ 𝚂𝙿𝙾𝚃𝙸𝙵𝚈 ✦*
*✦ 𝚃í𝚝𝚞𝚕𝚘:* *${title}*
*✦ 𝙰𝚛𝚝𝚒𝚜𝚝𝚊:* *${artist}*
*✦ Á𝚕𝚋𝚞𝚖:* *${album}*
*✦ 𝙳𝚞𝚛𝚊𝚌𝚒ó𝚗:* *${duration}*  •  *𝚁𝚎𝚜𝚞𝚕𝚝𝚊𝚍𝚘:* *${index + 1}/${results.length}*
*༺═──── ✦ ────═༻*
*✦ 𝟮𝟬𝟮𝟲 • ֆǟɨ ✦*`
  // ═════════════════════════════════
  // ✰ OPCIONES
  // ═════════════════════════════════

  const buttons = [
    {
      text: '✦ 𝙵𝙾𝚁𝙼𝙰𝚃𝙾 ✦',

      sections: [
        {
          title: '╭─〔 𝙰𝚄𝙳𝙸𝙾 〕─╮',

          rows: [
            {
              title: '🎵 ❯ 𝙼𝙿𝟹',
              description: '✰ 𝙳𝚎𝚜𝚌𝚊𝚛𝚐𝚊𝚛 𝚊𝚞𝚍𝚒𝚘',
              id: `${usedPrefix}spotifymp3 ${spotifyUrl}`
            },
            {
              title: '📄 ❯ 𝙼𝙿𝟹 𝙳𝙾𝙲',
              description: '✰ 𝙰𝚞𝚍𝚒𝚘 𝚌𝚘𝚖𝚘 𝚍𝚘𝚌𝚞𝚖𝚎𝚗𝚝𝚘',
              id: `${usedPrefix}spotifymp3doc ${spotifyUrl}`
            }
          ]
        },

        {
          title: '╭─〔 𝚂𝙿𝙾𝚃𝙸𝙵𝚈 〕─╮',

          rows: [
            {
              title: '🎵 ❯ 𝙰𝙱𝚁𝙸𝚁 𝚂𝙿𝙾𝚃𝙸𝙵𝚈',
              description: '✰ 𝙰𝚋𝚛𝚒𝚛 𝚕𝚊 𝚌𝚊𝚗𝚌𝚒ó𝚗 𝚎𝚗 𝚂𝚙𝚘𝚝𝚒𝚏𝚢',
              id: spotifyUrl
            }
          ]
        },

        {
          title: '╭─〔 𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰 〕─╮',

          rows: [
            {
              title: '➡️ ❯ 𝚂𝙸𝙶𝚄𝙸𝙴𝙽𝚃𝙴',

              description:
                `✰ 𝚅𝚎𝚛 𝚛𝚎𝚜𝚞𝚕𝚝𝚊𝚍𝚘 ${
                  index + 2 > results.length
                    ? 1
                    : index + 2
                }/${results.length}`,

              id: `${usedPrefix}spnext`
            }
          ]
        }
      ]
    }
  ]

  // ═════════════════════════════════
  // ✰ CONTENIDO
  // ═════════════════════════════════

  const content = {
    caption: infoText,
    footer: BOT_NAME,
    buttons
  }

  if (image) {
    content.image = {
      url: image
    }
  }

  await conn.sendMessage(
    m.chat,
    content,
    {
      quoted: m
    }
  )
}


// ═══════════════════════════════════════
// ✰ CONFIGURACIÓN DEL PLUGIN
// ═══════════════════════════════════════

handler.help = [
  'spotify <texto>',
  'sp <texto>',
  'spsearch <texto>',
  'spnext'
]

handler.tags = [
  'buscador'
]

handler.command = [
  'spotify',
  'sp',
  'spotifysearch',
  'spsearch',
  'spnext',
  'spotify-next',
  'spotify_next'
]

handler.register = false

export default handler


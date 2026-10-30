import * as baileysMod from '@whiskeysockets/baileys'
import config from '../../config.js'
import { plugins } from '../../handler.js'

const pkg =
  baileysMod.default && Object.keys(baileysMod).length === 1
    ? baileysMod.default
    : baileysMod

const { prepareWAMessageMedia, generateWAMessageFromContent } = pkg

const START_TIME = Date.now()
const API_URL = 'https://hikariapi.skyultraweb.com'

const IMAGENES = [
  'https://files.catbox.moe/dkxngv.png',
  'https://files.catbox.moe/a8id3b.png',
  'https://files.catbox.moe/7ess2z.png',
  'https://files.catbox.moe/eb7zb2.png',
  'https://files.catbox.moe/wj6sad.png'
]

// CATEGORÍAS
const ETIQUETAS = {
  info: '『 ✦ 』𝙸𝙽𝙵𝙾𝚁𝙼𝙰𝙲𝙸Ó𝙽',
  owner: '『 ♛ 』𝙾𝚆𝙽𝙴𝚁 / 𝙳𝚄𝙴Ñ𝙾',
  rpg: '『 ⚔ 』𝚁𝙾𝙻 𝚈 𝙰𝚅𝙴𝙽𝚃𝚄𝚁𝙰',
  eco: '『 ◈ 』𝙴𝙲𝙾𝙽𝙾𝙼Í𝙰',
  registro: '『 ✎ 』𝚁𝙴𝙶𝙸𝚂𝚃𝚁𝙾',
  juegos: '『 🎮 』𝙼𝙸𝙽𝙸𝙹𝚄𝙴𝙶𝙾𝚂',
  fun: '『 ✧ 』𝙳𝙸𝚅𝙴𝚁𝚂𝙸Ó𝙽',
  group: '『 ♟ 』𝙶𝙴𝚂𝚃𝙸Ó𝙽 𝙳𝙴 𝙶𝚁𝚄𝙿𝙾𝚂',
  tools: '『 ⚙ 』𝙷𝙴𝚁𝚁𝙰𝙼𝙸𝙴𝙽𝚃𝙰𝚂',
  descargas: '『 ⇩ 』𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝚂',
  busquedas: '『 ⌕ 』𝙱Ú𝚂𝚀𝚄𝙴𝙳𝙰𝚂',
  convertidores: '『 ↻ 』𝙲𝙾𝙽𝚅𝙴𝚁𝚃𝙸𝙳𝙾𝚁𝙴𝚂',
  anime: '『 ✺ 』𝙰𝙽𝙸𝙼𝙴 / 𝙾𝚃𝙰𝙺𝚄',
  nsfw: '『 +18 』𝙲𝙾𝙽𝚃𝙴𝙽𝙸𝙳𝙾',
  jadibot: '『 ◉ 』𝚂𝚄𝙱-𝙱𝙾𝚃𝚂',
  ia: '『 ▣ 』𝙸𝙽𝚃𝙴𝙻𝙸𝙶𝙴𝙽𝙲𝙸𝙰 𝙰𝚁𝚃𝙸𝙵𝙸𝙲𝙸𝙰𝙻',
  otros: '『 • 』𝙾𝚃𝚁𝙾𝚂'
}

function getTime() {
  const t = Math.floor((Date.now() - START_TIME) / 1000)
  const d = Math.floor(t / 86400)
  const h = Math.floor((t % 86400) / 3600)
  const min = Math.floor((t % 3600) / 60)
  const s = t % 60

  return `${d ? `${d}d ` : ''}${h ? `${h}h ` : ''}${min ? `${min}m ` : ''}${s}s`
}

function getPrefix(usedPrefix) {
  if (usedPrefix) return usedPrefix

  const source = config.prefix?.source
  if (typeof source === 'string') {
    const prefix = source.replace(/[\^$.*+?()[\]{}|\\]/g, '')
    if (prefix) return prefix[0]
  }

  return '.'
}

function getImage(conn) {
  return conn.menuImage ||
    IMAGENES[Math.floor(Math.random() * IMAGENES.length)]
}

function getContextInfo(conn, m) {
  return {
    mentionedJid: [m.sender],
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid:
        global.newsletterJid ||
        '120363408885875268@newsletter',
      newsletterName:
        `${conn.botname || config.botName || 'SaitamaBot'} • ${config.ownerName || 'SAI'}`,
      serverMessageId: Math.floor(Math.random() * 999) + 1
    }
  }
}

// CARGAR COMANDOS ACTIVOS
function getCategorias(isOwner, groupDb) {
  const categorias = {}
  let total = 0

  for (const p of Object.values(plugins)) {
    if (!p?.help) continue
    if ((p.owner || p.ownerOnly) && !isOwner) continue

    const tagRaw = Array.isArray(p.tags) ? p.tags[0] : p.tags || 'otros'
    const tag = String(tagRaw).toLowerCase()

    if (groupDb?.disabledCategories?.includes(tag)) continue

    const comandosReales = Array.isArray(p.command)
      ? p.command
      : [p.command]

    if (
      groupDb &&
      comandosReales.length &&
      comandosReales.every(c => groupDb.disabledCmds?.includes(c))
    ) continue

    if (!categorias[tag]) categorias[tag] = []

    const comandos = Array.isArray(p.help) ? p.help : [p.help]

    for (const cmd of comandos) {
      if (!cmd) continue
      if (comandosReales.includes(cmd) && groupDb?.disabledCmds?.includes(cmd)) continue

      categorias[tag].push(cmd)
      total++
    }
  }

  return { categorias, total }
}

function getOrdenActivo(isOwner, groupDb) {
  const { categorias, total } = getCategorias(isOwner, groupDb)

  return {
    categorias,
    total,
    ordenFinal: Object.keys(categorias)
  }
}

// ENVIAR MENSAJE CON IMAGEN
async function enviarTexto(conn, m, caption, imageUrl) {
  return conn.sendMessage(
    m.chat,
    { image: { url: imageUrl }, caption },
    { quoted: m }
  )
}

// ENVIAR MENSAJE INTERACTIVO
async function enviarInteractivo(conn, m, caption, imageUrl, buttons, footer) {
  const media = await prepareWAMessageMedia(
    { image: { url: imageUrl } },
    { upload: conn.waUploadToServer }
  )

  const msg = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: {
            body: { text: caption },
            footer: { text: footer },
            header: {
              hasMediaAttachment: true,
              imageMessage: media.imageMessage
            },
            nativeFlowMessage: { buttons },
            contextInfo: getContextInfo(conn, m)
          }
        }
      }
    },
    { quoted: m }
  )

  return conn.relayMessage(m.chat, msg.message, {
    messageId: msg.key.id
  })
}

// SUBMENÚ DE CATEGORÍA
async function enviarSubmenu(
  conn,
  m,
  tag,
  isOwner,
  usedPrefix,
  groupDb,
  userDb
) {
  const { categorias } = getOrdenActivo(isOwner, groupDb)
  const comandos = categorias[tag]

  if (!comandos?.length) {
    return m.reply(
`┌─〔 ✦ 𝚂𝙰𝙸𝚃𝙰𝙼𝙰𝙱𝙾𝚃 〕
│
│  No hay comandos activos.
│
└────────────────`
    )
  }

  const prefix = getPrefix(usedPrefix)
  const nombreCat = ETIQUETAS[tag] || ETIQUETAS.otros
  const botName = conn.botname || config.botName || 'SaitamaBot'
  const imageUrl = getImage(conn)
  const linkCanal = config.groupLink || 'https://whatsapp.com'

  let caption =
`╭─〔 ✦ 𝚂𝙰𝙸𝚃𝙰𝙼𝙰𝙱𝙾𝚃 〕
│
│  ${nombreCat}
│  ◈ 𝙲𝙾𝙼𝙰𝙽𝙳𝙾𝚂: ${comandos.length}
│
├─〔 𝙻𝙸𝚂𝚃𝙰 〕
`

  for (const cmd of comandos) {
    caption += `│  › ${prefix}${cmd}\n`
  }

  caption +=
`│
├─〔 𝙰𝙿𝙸 〕
│  ${API_URL}
╰─〔 ${new Date().getFullYear()} 〕`

  if (conn.noButtons || userDb?.noButtons) {
    return enviarTexto(conn, m, caption, imageUrl)
  }

  return enviarInteractivo(
    conn,
    m,
    caption,
    imageUrl,
    [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '↩ 𝚅𝙾𝙻𝚅𝙴𝚁 𝙰𝙻 𝙼𝙴𝙽Ú',
          id: `${prefix}menu`
        })
      },
      {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: '➜ 𝙲𝙰𝙽𝙰𝙻',
          url: linkCanal,
          merchant_url: linkCanal
        })
      }
    ],
    `${botName} • ${new Date().getFullYear()}`
  )
}

// MENÚ PRINCIPAL
const handler = async (
  m,
  { conn, usedPrefix, isOwner, command, groupDb, userDb }
) => {
  const { categorias, total, ordenFinal } = getOrdenActivo(isOwner, groupDb)

  const prefix = getPrefix(usedPrefix)
  const botName = conn.botname || config.botName || 'SaitamaBot'
  const ownerName = config.ownerName || 'SAI'
  const usuario = m.pushName || 'Usuario'
  const imageUrl = getImage(conn)
  const linkCanal = config.groupLink || 'https://whatsapp.com'

  // COMANDOS .menu1, .menu2, ETC.
  const numMatch = String(command || '').match(/^menu(\d+)$/i)

  if (numMatch) {
    const idx = Number.parseInt(numMatch[1], 10) - 1
    const tag = ordenFinal[idx]

    if (!tag) {
      return m.reply(
`┌─〔 ✦ 𝚂𝙰𝙸𝚃𝙰𝙼𝙰𝙱𝙾𝚃 〕
│  Categoría no encontrada.
│  Usa ${prefix}menu
└────────────────`
      )
    }

    return enviarSubmenu(conn, m, tag, isOwner, prefix, groupDb, userDb)
  }

  const rows = ordenFinal.map((tag, i) => ({
    header: ETIQUETAS[tag] || tag.toUpperCase(),
    title: '『 ✦ 𝚂𝙰𝙸𝚃𝙰𝙼𝙰𝙱𝙾𝚃 』',
    description: `› ${categorias[tag]?.length || 0} comandos • ${prefix}menu${i + 1}`,
    id: `menu_cat_${tag}`
  }))

  const listaCategorias = ordenFinal.map((tag, i) =>
    `│  ${String(i + 1).padStart(2, '0')} › ${ETIQUETAS[tag] || tag.toUpperCase()}\n` +
    `│     ${categorias[tag]?.length || 0} comandos • ${prefix}menu${i + 1}`
  ).join('\n')

  const textoMenu =
`╭─〔 ✦ 𝚂𝙰𝙸𝚃𝙰𝙼𝙰𝙱𝙾𝚃 〕
│
│  𝙷𝚘𝚕𝚊, ${usuario}
│  𝙱𝚒𝚎𝚗𝚟𝚎𝚗𝚒𝚍𝚘 𝚊𝚕 𝚖𝚎𝚗ú.
│
├─〔 𝙴𝚂𝚃𝙰𝙳𝙾 〕
│  ♙ 𝙾𝚆𝙽𝙴𝚁: ${ownerName}
│  ⌁ 𝙿𝚁𝙴𝙵𝙸𝙹𝙾: ${prefix}
│  ◷ 𝙰𝙲𝚃𝙸𝚅𝙾: ${getTime()}
│  ◈ 𝙲𝙾𝙼𝙰𝙽𝙳𝙾𝚂: ${total}
│
├─〔 𝙲𝙰𝚃𝙴𝙶𝙾𝚁Í𝙰𝚂 〕
${listaCategorias}
│
├─〔 𝙰𝙿𝙸 〕
│  ${API_URL}
╰─〔 ✦ ${new Date().getFullYear()} 〕`

  if (conn.noButtons || userDb?.noButtons) {
    return enviarTexto(conn, m, textoMenu, imageUrl)
  }

  return enviarInteractivo(
    conn,
    m,
    textoMenu,
    imageUrl,
    [
      {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: '✦ 𝚂𝙴𝙻𝙴𝙲𝙲𝙸𝙾𝙽𝙰𝚁',
          sections: [
            {
              title: '𝚂𝙰𝙸𝚃𝙰𝙼𝙰𝙱𝙾𝚃 • 𝙼𝙴𝙽Ú',
              rows
            }
          ]
        })
      },
      {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: '➜ 𝙰𝙱𝚁𝙸𝚁 𝙲𝙰𝙽𝙰𝙻',
          url: linkCanal,
          merchant_url: linkCanal
        })
      }
    ],
    `${botName} • ${new Date().getFullYear()}`
  )
}

// DETECTAR SELECCIÓN DE CATEGORÍA
handler.all = async (
  m,
  { conn, isOwner, usedPrefix, groupDb, userDb }
) => {
  if (
    typeof m.responseId !== 'string' ||
    !m.responseId.startsWith('menu_cat_')
  ) return

  const tag = m.responseId.slice('menu_cat_'.length)

  return enviarSubmenu(
    conn,
    m,
    tag,
    isOwner,
    usedPrefix,
    groupDb,
    userDb
  )
}

handler.help = ['menu']
handler.tags = ['info']
handler.command = [
  'menu',
  'help',
  'ayuda',
  'menú',
  ...Array.from({ length: 20 }, (_, i) => `menu${i + 1}`)
]

export default handler

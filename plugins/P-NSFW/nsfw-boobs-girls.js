
import axios from 'axios'
import config from '../../config.js'

// ═══════════════════════════════════════
// ✰ SAITAMABOT • RANDOM IMAGE
// ═══════════════════════════════════════

const API_URL =
  'https://api.waifu.pics/sfw/waifu'

async function obtenerImagen() {
  const { data } = await axios.get(API_URL, {
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  })

  const url = data?.url

  if (
    typeof url !== 'string' ||
    !/^https?:\/\//i.test(url)
  ) {
    throw new Error('URL de imagen inválida')
  }

  return url
}

// ═══════════════════════════════════════
// ✰ HANDLER
// ═══════════════════════════════════════

const handler = async (
  m,
  { conn, command, usedPrefix }
) => {
  if (!m.isGroup) {
    return m.reply(
      '༺═──── ✰ ────═༻\n' +
      '✰ 𝚄𝚜𝚊 𝚎𝚜𝚝𝚎 𝚌𝚘𝚖𝚊𝚗𝚍𝚘 𝚎𝚗 𝚞𝚗 𝚐𝚛𝚞𝚙𝚘.\n' +
      '༺═──── ✰ ────═༻'
    )
  }

  try {
    const url = await obtenerImagen()

    await conn.sendMessage(
      m.chat,
      {
        image: { url },
        caption:
          '*༺═──── ✰ ────═༻*\n' +
          '*༻ 𝙰𝙽𝙸𝙼𝙴 ✰*\n' +
          '*✰ 𝙸𝚖𝚊𝚐𝚎𝚗 𝚊𝚕𝚎𝚊𝚝𝚘𝚛𝚒𝚊*\n' +
          `*✰ 𝙾𝚝𝚛𝚊:* ${usedPrefix}${command}\n` +
          '*༺═──── ✰ ────═༻*\n' +
          'ミ★𝙎Λ𝙄𝙏Λ𝙈Λ•𝘽𝙊𝙏-𝙎𝙏★彡',
        footer:
          config.botName ||
          config.botname ||
          'SaitamaBot'
      },
      { quoted: m }
    )
  } catch (error) {
    console.error(
      '[PACK IMAGE]',
      error?.response?.data ||
      error?.message ||
      error
    )

    return m.reply(
      '༺═──── ✰ ────═༻\n' +
      '✰ 𝙽𝚘 𝚜𝚎 𝚙𝚞𝚍𝚘 𝚘𝚋𝚝𝚎𝚗𝚎𝚛 𝚕𝚊 𝚒𝚖𝚊𝚐𝚎𝚗.\n' +
      '✰ 𝙸𝚗𝚝𝚎𝚗𝚝𝚊 𝚍𝚎 𝚗𝚞𝚎𝚟𝚘.\n' +
      '༺═──── ✰ ────═༻'
    )
  }
}

// ═══════════════════════════════════════
// ✰ CONFIGURACIÓN
// ═══════════════════════════════════════

handler.help = ['pack']
handler.tags = ['fun']
handler.command = ['pack']
handler.groupOnly = true
handler.register = true

export default handler


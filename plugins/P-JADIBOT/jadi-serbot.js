import * as baileys from '@whiskeysockets/baileys'

import {
  startSubBot,
  subBots
} from '../../lib/jadibot.js'

// ═════════════════════════════════════
// ✰ SAITAMABOT • SERBOT
// ═════════════════════════════════════

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

const handler = async (
  m,
  {
    conn: zen,
    usedPrefix,
    command
  }
) => {
  try {
    // ✰ SOLO BOT PRINCIPAL
    if (zen.isSubBot) {
      const mainNum = zen.mainBotNumber

      return m.reply(
`༺ ✰ 𝚂𝙴𝚁𝙱𝙾𝚃 ✰ ༻

> ✰ 𝙴𝚜𝚝𝚎 𝚌𝚘𝚖𝚊𝚗𝚍𝚘 𝚜𝚘𝚕𝚘 𝚜𝚎 𝚞𝚜𝚊 𝚎𝚗 𝚎𝚕 𝚋𝚘𝚝 𝚙𝚛𝚒𝚗𝚌𝚒𝚙𝚊𝚕.

> ✰ 𝙱𝚘𝚝 𝚘𝚏𝚒𝚌𝚒𝚊𝚕:
https://wa.me/${mainNum}?text=${encodeURIComponent(`${usedPrefix}${command}`)}`
      )
    }

    // ✰ NÚMERO DEL USUARIO
    const numero = m.sender.split('@')[0]

    // ✰ COMPROBAR SESIÓN ACTIVA
    if (subBots.has(numero)) {
      return m.reply(
`༺ ✰ 𝚂𝙴𝚂𝙸Ó𝙽 𝙰𝙲𝚃𝙸𝚅𝙰 ✰ ༻

> ✰ 𝚈𝚊 𝚝𝚒𝚎𝚗𝚎𝚜 𝚞𝚗 𝚂𝚞𝚋-𝙱𝚘𝚝 𝚏𝚞𝚗𝚌𝚒𝚘𝚗𝚊𝚗𝚍𝚘.

> ✰ 𝚄𝚜𝚊 *${usedPrefix}stopbot* 𝚙𝚊𝚛𝚊 𝚍𝚎𝚝𝚎𝚗𝚎𝚛𝚕𝚘.`
      )
    }

    // ✰ REACCIÓN DE VINCULACIÓN
    await react(zen, m, '🔗')

    // ✰ GENERAR CÓDIGO
    const resultado = await startSubBot(
      zen,
      numero,
      m
    )

    const codigo =
      typeof resultado === 'string'
        ? resultado
        : resultado?.code ||
          resultado?.pairingCode ||
          resultado?.codigo ||
          null

    if (!codigo) {
      await react(zen, m, '❌')

      return m.reply(
`༺ ✰ 𝙴𝚁𝚁𝙾𝚁 𝙳𝙴 𝚅𝙸𝙽𝙲𝚄𝙻𝙰𝙲𝙸Ó𝙽 ✰ ༻

> ✰ No se pudo generar el código.
> ✰ Intenta nuevamente en unos minutos.

SaitamaBot`
      )
    }

    const codigoLimpio = String(codigo)
      .replace(/\s+/g, '')
      .trim()

    if (!codigoLimpio) {
      await react(zen, m, '❌')
      return
    }

    // ✰ MENSAJE ÚNICO
    const tutorial =
`༺ ✰ 𝚂𝚄𝙱-𝙱𝙾𝚃 ✰ ༻

> ✰ 𝙲ó𝚍𝚒𝚐𝚘 𝚍𝚎 𝚟𝚒𝚗𝚌𝚞𝚕𝚊𝚌𝚒ó𝚗:

*${codigoLimpio}*

༺ ✰ 𝚃𝚄𝚃𝙾𝚁𝙸𝙰𝙻 ✰ ༻

> 1. 𝙰𝚋𝚛𝚎 *WhatsApp*.
> 2. 𝙴𝚗𝚝𝚛𝚊 𝚊 *𝙰𝚓𝚞𝚜𝚝𝚎𝚜*.
> 3. 𝙿𝚞𝚕𝚜𝚊 *𝙳𝚒𝚜𝚙𝚘𝚜𝚒𝚝𝚒𝚟𝚘𝚜 𝚟𝚒𝚗𝚌𝚞𝚕𝚊𝚍𝚘𝚜*.
> 4. 𝚂𝚎𝚕𝚎𝚌𝚌𝚒𝚘𝚗𝚊 *𝚅𝚒𝚗𝚌𝚞𝚕𝚊𝚛 𝚞𝚗 𝚍𝚒𝚜𝚙𝚘𝚜𝚒𝚝𝚒𝚟𝚘*.
> 5. 𝙸𝚗𝚐𝚛𝚎𝚜𝚊 𝚎𝚕 𝚌ó𝚍𝚒𝚐𝚘.

> ✰ 𝙽𝚘 𝚌𝚘𝚖𝚙𝚊𝚛𝚝𝚊𝚜 𝚎𝚕 𝚌ó𝚍𝚒𝚐𝚘 𝚌𝚘𝚗 𝚘𝚝𝚛𝚊𝚜 𝚙𝚎𝚛𝚜𝚘𝚗𝚊𝚜.`

    // ✰ BOTÓN NATIVO PARA COPIAR
    const msg = await baileys.generateWAMessage(
      m.chat,
      {
        text: tutorial,
        footer: 'SaitamaBot',
        nativeFlow: [
          {
            text: '✰ COPIAR CÓDIGO',
            copy: codigoLimpio
          }
        ]
      },
      {
        userJid: zen.user.id,
        quoted: m
      }
    )

    await zen.relayMessage(m.chat, msg.message, {
      messageId: msg.key.id
    })

    // ✰ VINCULACIÓN ENVIADA
    await react(zen, m, '✅')

  } catch (error) {
    console.error(
      '[SERBOT]',
      error?.stack || error?.message || error
    )

    await react(zen, m, '❌')

    return m.reply(
`༺ ✰ 𝙴𝚁𝚁𝙾𝚁 𝚂𝙴𝚁𝙱𝙾𝚃 ✰ ༻

> ✰ ${error.message || 'Ocurrió un error al iniciar la vinculación.'}

SaitamaBot`
    )
  }
}

// ═════════════════════════════════════
// ✰ COMANDOS
// ═════════════════════════════════════

handler.help = [
  'serbot',
  'jadibot',
  'subbot',
  'code'
]

handler.tags = ['jadibot']

handler.command = [
  'serbot',
  'jadibot',
  'subbot',
  'code'
]

handler.noRegister = true

export default handler

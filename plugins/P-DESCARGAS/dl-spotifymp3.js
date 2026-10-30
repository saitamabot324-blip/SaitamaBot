import axios from 'axios'
import config from '../../config.js'


// ═══════════════════════════════════════
// ✰ SAITAMABOT • SPOTIFY MP3
// ═══════════════════════════════════════

const STELLAR_API =
  'https://api.stellarwa.xyz'


const STELLAR_KEY =
  'proyectsV2'


const BOT_NAME =
  config.botName ||
  '𝚂𝙰𝙸𝚃𝙰𝙼𝙰𝙱𝙾𝚃'


// ═══════════════════════════════════════
// ✰ LIMPIAR NOMBRE
// ═══════════════════════════════════════

function cleanFileName(name) {

  return String(
    name || 'Spotify Music'
  )
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
    .slice(
      0,
      150
    )

}


// ═══════════════════════════════════════
// ✰ VALIDAR SPOTIFY
// ═══════════════════════════════════════

function isSpotifyTrack(url) {

  return /^https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/i
    .test(
      String(
        url || ''
      ).trim()
    )

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

    const url =
      String(
        text || ''
      ).trim()


    // ═════════════════════════════════
    // ✰ SIN URL
    // ═════════════════════════════════

    if (!url) {

      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '❌',
            key: m.key
          }
        }
      ).catch(() => {})


      return m.reply(

`༺ 𝚂𝙿𝙾𝚃𝙸𝙵𝚈 𝙼𝙿𝟹 ༻

✰ 𝙴𝚗𝚟í𝚊 𝚎𝚕 𝚎𝚗𝚕𝚊𝚌𝚎 𝚍𝚎 𝚞𝚗𝚊 𝚌𝚊𝚗𝚌𝚒ó𝚗 𝚍𝚎 𝚂𝚙𝚘𝚝𝚒𝚏𝚢.

✰ 𝚄𝚜𝚊:
${usedPrefix}${command} <url>

✰ 𝙴𝚓𝚎𝚖𝚙𝚕𝚘:
${usedPrefix}${command} https://open.spotify.com/track/09mEdoA6zrmBPgTEN5qXmN

✰ ${BOT_NAME}`

      )

    }


    // ═════════════════════════════════
    // ✰ URL INVÁLIDA
    // ═════════════════════════════════

    if (
      !isSpotifyTrack(url)
    ) {

      await conn.sendMessage(
        m.chat,
        {
          react: {
            text: '❌',
            key: m.key
          }
        }
      ).catch(() => {})


      return m.reply(

`༺ 𝚂𝙿𝙾𝚃𝙸𝙵𝚈 ༻

✰ 𝙻𝚊 𝚄𝚁𝙻 𝚗𝚘 𝚎𝚜 𝚟á𝚕𝚒𝚍𝚊.

✰ 𝙳𝚎𝚋𝚎𝚜 𝚎𝚗𝚟𝚒𝚊𝚛 𝚞𝚗𝚊 𝚄𝚁𝙻 𝚍𝚎 𝚞𝚗𝚊 𝚌𝚊𝚗𝚌𝚒ó𝚗:

https://open.spotify.com/track/...

✰ ${BOT_NAME}`

      )

    }


    // ═════════════════════════════════
    // ✰ REACCIÓN PROCESANDO
    // ═════════════════════════════════

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: '🎵',
          key: m.key
        }
      }
    ).catch(() => {})


    // ═════════════════════════════════
    // ✰ SOLICITAR STELLARWA
    // ═════════════════════════════════

    const response =
      await axios.get(

        `${STELLAR_API}/dl/spotify`,

        {

          params: {

            url,

            key:
              STELLAR_KEY

          },

          timeout:
            120000,

          validateStatus:
            status =>
              status >= 200 &&
              status < 500

        }

      )


    const data =
      response?.data


    // ═════════════════════════════════
    // ✰ VALIDAR RESPUESTA
    // ═════════════════════════════════

    if (!data) {

      throw new Error(
        '𝙽𝚘 𝚜𝚎 𝚛𝚎𝚌𝚒𝚋𝚒ó 𝚛𝚎𝚜𝚙𝚞𝚎𝚜𝚝𝚊 𝚍𝚎 𝚂𝚝𝚎𝚕𝚕𝚊𝚛𝚆𝙰.'
      )

    }


    if (
      data.status === false
    ) {

      throw new Error(

        data.message ||
        data.msg ||
        '𝚂𝚝𝚎𝚕𝚕𝚊𝚛𝚆𝙰 𝚛𝚎𝚌𝚑𝚊𝚣ó 𝚕𝚊 𝚜𝚘𝚕𝚒𝚌𝚒𝚝𝚞𝚍.'

      )

    }


    // ═════════════════════════════════
    // ✰ INFORMACIÓN
    // ═════════════════════════════════

    const song =
      data.data ||
      data.result ||
      {}


    const audioUrl =
      song.dl ||
      song.mp3 ||
      song.download ||
      song.url


    if (!audioUrl) {

      throw new Error(
        '𝙽𝚘 𝚜𝚎 𝚎𝚗𝚌𝚘𝚗𝚝𝚛ó 𝚎𝚕 𝚎𝚗𝚕𝚊𝚌𝚎 𝚍𝚎𝚕 𝙼𝙿𝟹.'
      )

    }


    const title =
      song.title ||
      song.name ||
      '𝚂𝚙𝚘𝚝𝚒𝚏𝚢 𝙼𝚞𝚜𝚒𝚌'


    const artist =
      song.artist ||
      song.artists ||
      '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘'


    const album =
      song.album ||
      '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘'


    const duration =
      song.duration ||
      '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚊'


    const year =
      song.year ||
      song.publish ||
      '𝙳𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘'


    const cover =
      song.cover ||
      song.image ||
      song.thumbnail ||
      null


    // ═════════════════════════════════
    // ✰ NOMBRE DEL ARCHIVO
    // ═════════════════════════════════

    const fileName =
      `${cleanFileName(title)} - ${cleanFileName(artist)}.mp3`


    // ═════════════════════════════════
    // ✰ DESCARGAR MP3
    // ═════════════════════════════════

    const audioResponse =
      await axios.get(

        audioUrl,

        {

          responseType:
            'arraybuffer',

          timeout:
            180000,

          maxContentLength:
            Infinity,

          maxBodyLength:
            Infinity

        }

      )


    const audioBuffer =
      Buffer.from(
        audioResponse.data
      )


    if (
      !audioBuffer.length
    ) {

      throw new Error(
        '𝙴𝚕 𝚊𝚛𝚌𝚑𝚒𝚟𝚘 𝙼𝙿𝟹 𝚎𝚜𝚝á 𝚟𝚊𝚌í𝚘.'
      )

    }


    // ═════════════════════════════════
    // ✰ ENVIAR AUDIO
    // ═════════════════════════════════

    const audioMessage = {

      audio:
        audioBuffer,

      mimetype:
        'audio/mpeg',

      fileName,

      ptt:
        false,

      contextInfo:

        cover

          ? {

              externalAdReply: {

                title:
                  title,

                body:
                  artist,

                thumbnailUrl:
                  cover,

                mediaType:
                  1,

                renderLargerThumbnail:
                  true,

                sourceUrl:
                  url

              }

            }

          : undefined

    }


    await conn.sendMessage(

      m.chat,

      audioMessage,

      {

        quoted:
          m

      }

    )


    // ═════════════════════════════════
    // ✰ REACCIÓN FINAL
    // ═════════════════════════════════

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text:
            '✅',
          key:
            m.key
        }
      }
    ).catch(() => {})


  } catch (error) {

    console.error(
      '[STELLAR SPOTIFY MP3]',
      error?.response?.data ||
      error?.message ||
      error
    )


    // ═════════════════════════════════
    // ✰ REACCIÓN ERROR
    // ═════════════════════════════════

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text:
            '❌',
          key:
            m.key
        }
      }
    ).catch(() => {})


    const details =
      error?.response?.data?.message ||
      error?.response?.data?.msg ||
      error?.message ||
      '𝙴𝚛𝚛𝚘𝚛 𝚍𝚎𝚜𝚌𝚘𝚗𝚘𝚌𝚒𝚍𝚘.'


    // ═════════════════════════════════
    // ✰ MENSAJE DE ERROR
    // ═════════════════════════════════

    return m.reply(

`༺ 𝙴𝚁𝚁𝙾𝚁 𝚂𝙿𝙾𝚃𝙸𝙵𝚈 𝙼𝙿𝟹 ༻

✰ 𝙽𝚘 𝚜𝚎 𝚙𝚞𝚍𝚘 𝚍𝚎𝚜𝚌𝚊𝚛𝚐𝚊𝚛 𝚎𝚕 𝚊𝚞𝚍𝚒𝚘.

✰ 𝙳𝚎𝚝𝚊𝚕𝚕𝚎𝚜:
${String(details).slice(0, 350)}

✰ ${BOT_NAME}`

    )

  }

}


// ═══════════════════════════════════════
// ✰ CONFIGURACIÓN
// ═══════════════════════════════════════

handler.help = [

  'spotifymp3 <url>'

]


handler.tags = [

  'descargas'

]


handler.command = [

  'spotifymp3',

  'spmp3'

]


handler.register = false


export default handler

import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import axios from 'axios'
import FormData from 'form-data'
import ffmpeg from 'fluent-ffmpeg'
import config from '../../config.js'


// ═══════════════════════════════════
// ⚙️ CONFIGURACIÓN
// ═══════════════════════════════════

const TEMP_DIR = os.tmpdir()

const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36'


// ═══════════════════════════════════
// 🎵 CONVERTIR VIDEO A MP3
// ═══════════════════════════════════

async function toMp3(input, output) {

  return new Promise((resolve, reject) => {

    ffmpeg(input)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate(128)
      .format('mp3')
      .save(output)

      .on('end', resolve)

      .on('error', reject)

  })

}


// ═══════════════════════════════════
// 🎧 IDENTIFICAR CANCIÓN
// ═══════════════════════════════════

async function identifySong(filePath) {

  if (
    !config.ACR_ACCESS_KEY ||
    !config.ACR_ACCESS_SECRET ||
    !config.ACR_HOST
  ) {
    throw new Error(
      'Faltan las credenciales de ACRCloud en config.js'
    )
  }

  const timestamp =
    Math.floor(
      Date.now() / 1000
    )

  const stringToSign = [
    'POST',
    '/v1/identify',
    config.ACR_ACCESS_KEY,
    'audio',
    '1',
    timestamp
  ].join('\n')


  const signature =
    crypto
      .createHmac(
        'sha1',
        config.ACR_ACCESS_SECRET
      )
      .update(stringToSign)
      .digest('base64')


  const form =
    new FormData()


  form.append(
    'sample',
    fs.createReadStream(
      filePath
    )
  )

  form.append(
    'access_key',
    config.ACR_ACCESS_KEY
  )

  form.append(
    'data_type',
    'audio'
  )

  form.append(
    'signature_version',
    '1'
  )

  form.append(
    'signature',
    signature
  )

  form.append(
    'timestamp',
    timestamp
  )


  const { data } =
    await axios.post(
      `https://${config.ACR_HOST}/v1/identify`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'User-Agent':
            USER_AGENT
        },

        timeout: 60000,

        maxBodyLength:
          Infinity,

        maxContentLength:
          Infinity
      }
    )


  return data

}


// ═══════════════════════════════════
// 🧹 LIMPIAR ARCHIVOS TEMPORALES
// ═══════════════════════════════════

function removeFile(file) {

  try {

    if (
      file &&
      fs.existsSync(file)
    ) {
      fs.unlinkSync(file)
    }

  } catch {}

}


// ═══════════════════════════════════
// 🎧 ENVIAR RESULTADO
// ═══════════════════════════════════

async function sendShazamResult(
  conn,
  m,
  song,
  usedPrefix
) {

  const spotifyId =
    song.external_metadata
      ?.spotify
      ?.track
      ?.id ||
    null


  const youtubeId =
    song.external_metadata
      ?.youtube
      ?.vid ||
    null


  const spotifyUrl =
    spotifyId
      ? `https://open.spotify.com/track/${spotifyId}`
      : ''


  const youtubeUrl =
    youtubeId
      ? `https://youtu.be/${youtubeId}`
      : ''


  const cover =
    song.album
      ?.images
      ?.[0]
      ?.url ||
    'https://files.catbox.moe/rszopk.png'


  const title =
    song.title ||
    'Desconocido'


  const artist =
    song.artists
      ?.map(
        item => item.name
      )
      .filter(Boolean)
      .join(', ') ||
    'Desconocido'


  const album =
    song.album
      ?.name ||
    'Desconocido'


  const releaseDate =
    song.release_date ||
    'Desconocida'


  // ═══════════════════════════════════
  // ✰ INFORMACIÓN
  // ═══════════════════════════════════

  const caption =
`༻ ✰ 𝚂𝙷𝙰𝚉𝙰𝙼 ✰ ༺

✰ 𝙼Ú𝚂𝙸𝙲𝙰 𝙸𝙳𝙴𝙽𝚃𝙸𝙵𝙸𝙲𝙰𝙳𝙰

✰ 𝚃í𝚝𝚞𝚕𝚘:
> ${title}
✰ 𝙰𝚛𝚝𝚒𝚜𝚝𝚊:
> ${artist}
✰ Á𝚕𝚋𝚞𝚖:
> ${album}
✰ 𝙵𝚎𝚌𝚑𝚊:
> ${releaseDate}

༻ ✰ 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝚂 ✰

✰ Selecciona una opción
> para descargar la canción.

༻ ✰ 𝚂𝙰𝙸𝚃𝙰𝙼𝙰𝙱𝙾𝚃`


  // ═══════════════════════════════════
  // 📥 OPCIONES DE DESCARGA
  // ═══════════════════════════════════

  const rows = []


  if (spotifyUrl) {

    rows.push({

      title:
        '✰ 𝚂𝚙𝚘𝚝𝚒𝚏𝚢 𝙼𝙿𝟹',

      description:
        '༻ Descargar audio en MP3',

      id:
        `${usedPrefix}spotifymp3 ${spotifyUrl}`

    })


    rows.push({

      title:
        '✰ 𝚂𝚙𝚘𝚝𝚒𝚏𝚢 𝙳𝚘𝚌𝚞𝚖𝚎𝚗𝚝𝚘',

      description:
        '༻ Enviar audio como documento',

      id:
        `${usedPrefix}spotifymp3doc ${spotifyUrl}`

    })

  }


  if (youtubeUrl) {

    rows.push({

      title:
        '✰ 𝚈𝚘𝚞𝚃𝚞𝚋𝚎 𝙼𝙿𝟹',

      description:
        '༻ Descargar audio en MP3',

      id:
        `${usedPrefix}ytmp3 ${youtubeUrl}`

    })


    rows.push({

      title:
        '✰ 𝚈𝚘𝚞𝚃𝚞𝚋𝚎 𝙳𝚘𝚌𝚞𝚖𝚎𝚗𝚝𝚘',

      description:
        '༻ Enviar audio como documento',

      id:
        `${usedPrefix}ytmp3doc ${youtubeUrl}`

    })

  }


  // ═══════════════════════════════════
  // 📤 ENVIAR TARJETA
  // ═══════════════════════════════════

  if (rows.length) {

    try {

      await conn.sendMessage(
        m.chat,
        {
          image: {
            url: cover
          },

          caption,

          footer:
            `༻ ✰ ${config.botName || 'SAITAMABOT'} ✰`,

          buttons: [
            {
              text:
                '✰ 𝙳𝙴𝚂𝙲𝙰𝚁𝙶𝙰𝚂',

              sections: [
                {
                  title:
                    '༻ ✰ 𝙾𝙿𝙲𝙸𝙾𝙽𝙴𝚂 ✰',

                  rows
                }
              ]
            }
          ]
        },
        {
          quoted: m
        }
      )

      return

    } catch {

      // Si el formato de botones no es compatible,
      // enviamos la información sin botones.

    }

  }


  await conn.sendMessage(
    m.chat,
    {
      image: {
        url: cover
      },

      caption

    },
    {
      quoted: m
    }
  )

}


// ═══════════════════════════════════
// 🎯 HANDLER PRINCIPAL
// ═══════════════════════════════════

const handler = async (
  m,
  {
    conn,
    usedPrefix
  }
) => {

  // ═══════════════════════════════════
  // 🎧 OBTENER AUDIO / VIDEO
  // ═══════════════════════════════════

  const q =
    m.quoted ||
    m


  const mime =
    q.msg
      ?.mimetype ||
    q.mimetype ||
    q.mediaType ||
    ''


  if (
    !/audio|video/.test(
      mime
    )
  ) {

    return m.reply(
`༻ ✰ 𝚂𝙷𝙰𝚉𝙰𝙼 ✰

✰ 𝙼𝙴𝙳𝙸𝙰 𝙽𝙾 𝙴𝙽𝙲𝙾𝙽𝚃𝚁𝙰𝙳𝙾

✰ Responde a un audio
> o video para reconocer
> la canción.

✰ 𝙴𝚓𝚎𝚖𝚙𝚕𝚘:
> ${usedPrefix}shazam

༻ ✰ 𝚂𝙰𝙸𝚃𝙰𝙼𝙰𝙱𝙾𝚃`
    )

  }


  // ═══════════════════════════════════
  // ⏳ REACCIÓN
  // ═══════════════════════════════════

  await conn.sendMessage(
    m.chat,
    {
      react: {
        text: '🎧',
        key: m.key
      }
    }
  )


  const base =
    path.join(
      TEMP_DIR,
      `shazam_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`
    )


  const input =
    base


  const output =
    `${base}.mp3`


  try {

    // ═══════════════════════════════════
    // 📥 DESCARGAR MEDIA
    // ═══════════════════════════════════

    const buffer =
      await q.download()


    if (
      !buffer ||
      !buffer.length
    ) {
      throw new Error(
        'No se pudo descargar el audio.'
      )
    }


    fs.writeFileSync(
      input,
      buffer
    )


    // ═══════════════════════════════════
    // 🎬 CONVERTIR VIDEO
    // ═══════════════════════════════════

    if (
      /video/.test(
        mime
      )
    ) {

      await toMp3(
        input,
        output
      )

    } else {

      fs.renameSync(
        input,
        output
      )

    }


    // ═══════════════════════════════════
    // 🔎 IDENTIFICAR
    // ═══════════════════════════════════

    const result =
      await identifySong(
        output
      )


    if (
      result.status?.code !== 0
    ) {

      throw new Error(
        'No se pudo reconocer la canción.'
      )

    }


    const song =
      result.metadata
        ?.music
        ?.[0]


    if (!song) {

      throw new Error(
        'No se encontró información de la canción.'
      )

    }


    // ═══════════════════════════════════
    // 📤 MOSTRAR RESULTADO
    // ═══════════════════════════════════

    await sendShazamResult(
      conn,
      m,
      song,
      usedPrefix
    )


    // ═══════════════════════════════════
    // ✅ FINALIZAR
    // ═══════════════════════════════════

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: '✅',
          key: m.key
        }
      }
    )


  } catch (error) {

    await conn.sendMessage(
      m.chat,
      {
        react: {
          text: '❌',
          key: m.key
        }
      }
    )


    return m.reply(
`༻ ✰ 𝚂𝙷𝙰𝚉𝙰𝙼 ✰

✰ 𝙴𝚁𝚁𝙾𝚁

✰ No se pudo identificar
> la canción.

✰ 𝙳𝚎𝚝𝚊𝚕𝚕𝚎:
> ${String(
  error?.message ||
  error ||
  'Error desconocido'
).slice(0, 300)}

༻ ✰ 𝚂𝙰𝙸𝚃𝙰𝙼𝙰𝙱𝙾𝚃`
    )


  } finally {

    // ═══════════════════════════════════
    // 🧹 LIMPIAR
    // ═══════════════════════════════════

    removeFile(input)

    removeFile(output)

  }

}


// ═══════════════════════════════════
// ⚙️ CONFIGURACIÓN DEL COMANDO
// ═══════════════════════════════════

handler.help = [
  'shazam'
]

handler.tags = [
  'busquedas'
]

handler.command = [
  'shazam',
  'music',
  'whatmusic'
]

export default handler

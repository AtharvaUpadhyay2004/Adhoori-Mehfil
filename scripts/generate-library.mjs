import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const musicRoot = path.join(root, 'public', 'music')
const output = path.join(root, 'public', 'library.json')

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.opus', '.flac'])
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif']

function toWebPath(...parts) {
  return '/' + parts.map((part) => encodeURIComponent(part).replaceAll('%2F', '/')).join('/')
}

function cleanText(value) {
  return value.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function inferArtistAndTitle(filename) {
  const basename = path.basename(filename, path.extname(filename))
  const normalized = cleanText(basename)
  const separator = normalized.includes(' - ') ? ' - ' : null

  if (!separator) return { artist: 'Unknown Artist', title: normalized }
  const [artist, ...titleParts] = normalized.split(separator)
  return {
    artist: cleanText(artist) || 'Unknown Artist',
    title: cleanText(titleParts.join(separator)) || normalized,
  }
}

async function exists(filepath) {
  try {
    await fs.access(filepath)
    return true
  } catch {
    return false
  }
}

async function findCover(directory, audioFilename) {
  const base = path.basename(audioFilename, path.extname(audioFilename))
  for (const ext of IMAGE_EXTENSIONS) {
    for (const candidate of [`${base}${ext}`, `${base}.cover${ext}`, `cover${ext}`, `folder${ext}`]) {
      if (await exists(path.join(directory, candidate))) return candidate
    }
  }
  return null
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(absolute)))
    else files.push(absolute)
  }
  return files
}

await fs.mkdir(musicRoot, { recursive: true })
const files = await walk(musicRoot)
const audioFiles = files.filter((file) => AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase()))

const coversDir = path.join(root, 'public', 'covers')

const tracks = []
for (const absolute of audioFiles.sort((a, b) => a.localeCompare(b))) {
  const relative = path.relative(musicRoot, absolute)
  const filename = path.basename(absolute)
  const directory = path.dirname(absolute)
  const { artist, title } = inferArtistAndTitle(filename)
  const cover = await findCover(directory, filename)
  const relDirectory = path.relative(musicRoot, directory)
  const id = crypto.createHash('sha1').update(relative).digest('hex').slice(0, 12)

  // Check for cover in /public/covers/ by track ID
  let coverPath = cover ? toWebPath('music', ...relDirectory.split(path.sep).filter(Boolean), cover) : ''
  if (!coverPath) {
    for (const ext of IMAGE_EXTENSIONS) {
      if (await exists(path.join(coversDir, `${id}${ext}`))) {
        coverPath = `/covers/${id}${ext}`
        break
      }
    }
  }

  tracks.push({
    id,
    artist,
    title,
    src: toWebPath('music', ...relative.split(path.sep)),
    cover: coverPath,
  })
}

// Assign artist covers to tracks missing them
const artistCovers = {}
for (const t of tracks) {
  if (t.cover && !artistCovers[t.artist]) artistCovers[t.artist] = t.cover
}
for (const t of tracks) {
  if (!t.cover && artistCovers[t.artist]) t.cover = artistCovers[t.artist]
}

await fs.writeFile(output, JSON.stringify({ tracks }, null, 2) + '\n')
console.log(`Found ${tracks.length} track${tracks.length === 1 ? '' : 's'} in public/music.`)

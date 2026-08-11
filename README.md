# One Page Radio

A single-screen music site. No genres, no queue, no scrolling.

## 1. Add your music

Drop audio files directly into:

`public/music/`

Recommended filename format:

`Artist - Track Name.mp3`

Optional cover art can sit beside the song with the same filename:

`Artist - Track Name.jpg`

You can also use `cover.jpg` or `folder.jpg` as a shared cover in a folder.

## 2. Add your text and links

Open `src/App.jsx` and edit the `SITE` block at the top:

- `name`
- `label`
- `title`
- `text`
- `spotifyUrl`
- `appleMusicUrl`

## 3. Run it

```bash
npm install
npm run dev
```

The site scans `public/music` automatically whenever dev/build starts.

## 4. Build for hosting

```bash
npm run build
```

Upload the generated `dist` folder to any static host such as Cloudflare Pages, Netlify, or Vercel.

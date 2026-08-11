DROP YOUR MUSIC HERE
====================

Recommended folder layout:

public/music/
  indie/
    Artist Name - Track Title.mp3
    Artist Name - Track Title.jpg   <- optional matching cover
  house/
    Another Artist - Another Track.mp3
    cover.jpg                       <- optional fallback cover for this folder
  jazz/
  ambient/

Supported audio extensions:
.mp3 .m4a .aac .wav .ogg .opus .flac

The FIRST folder after /music becomes the station ID.
It should match an id in src/config/stations.js.

Filename convention:
Artist - Track Title.mp3

After adding/removing music, run:

npm run library

Or just run:

npm run dev

The dev/build commands regenerate the library automatically.

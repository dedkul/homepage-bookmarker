# Collections

Wallpaper sets for Lumen's Collections tab. Each folder here is one collection.

```
collections/
  windows-7/
    collection.json     name and credits (optional)
    01.jpg
    02.webp
    live-01.mp4         live wallpaper
  anime/
    ...
```

- **Folder names:** lowercase with dashes, like `windows-7`. The folder name becomes the collection's id.
- **Photos:** JPG or WebP, at least 2560 × 1440.
- **Live wallpapers:** MP4 or WebM, short loops without sound. GitHub rejects files over 100 MB, so keep each one well under that.
- **`collection.json` (optional):**

  ```json
  { "name": "Windows 7", "credit": "Microsoft", "source": "https://example.com/where-you-found-them" }
  ```

**Only add wallpapers you're allowed to share.** This repo is public, so everything here can be downloaded by anyone. Note the source and licence in `collection.json` when you know them.

Nothing in this folder ships with the extension yet. Once a few collections exist, we'll decide how Lumen loads them, either bundled in the extension or served from the proxy.

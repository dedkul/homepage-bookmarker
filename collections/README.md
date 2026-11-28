# Collections

Wallpaper sets for Lumen's Collections tab. Each folder here is one collection.

```
collections/
  anime/
    links.txt
  windows-7/
    links.txt
```

## How to add wallpapers

Paste the wallpaper's **page link** into `links.txt`, one per line. Lines starting with `#` are notes and are skipped.

```
# Your Name
https://wallhaven.cc/w/abc123
https://whvn.cc/abc123
https://unsplash.com/photos/some-photo-id
```

Commit to `master` (editing the file on github.com is fine). That's all: no Store update, no Vercel step.

- Lumen's server reads these files from GitHub and caches them for up to an hour.
- Each copy of Lumen checks for changes at most every 12 hours, so a new wallpaper reaches everyone within about half a day.
- The folder name becomes the collection's title (`windows-7` shows as "Windows 7"). A folder with no working links is hidden.
- Removing a line removes the wallpaper from the tab. People who already added it to their own set keep it.
- Wallhaven wallpapers that aren't marked safe for work are skipped. Up to 60 links per collection are used.

To preview before committing, run the prototype (`cd prototypes && python3 serve.py`). It reads your local files directly.

## Why links and not image files

This repo is public and the extension is published, so any image file here is being redistributed. Most wallpapers belong to someone: anime art to its artist or studio, Windows wallpapers to Microsoft and the photographers it licensed them from. Redistributing them without permission can get the extension taken down after a copyright complaint.

Linking to where the artist or uploader already shared the wallpaper, with credit, is what Lumen already does in search and is much lower risk.

**Image files are fine only when you're allowed to share them:** your own work, art you have written permission for, or images under a licence that allows it (CC0, or CC BY with credit). If you add one, put a `credits.txt` beside it with the source and licence.

- **Photos:** JPG or WebP, at least 2560 × 1440.
- **Live wallpapers (later):** MP4 or WebM, short loops without sound, well under 100 MB (GitHub's limit).
- **Folder names:** lowercase with dashes, like `windows-7`.

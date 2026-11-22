# Chrome Web Store listing

Copy each part into the matching field of the developer dashboard. Everything here matches `PRIVACY.md` and the code as of v0.1.0; if a feature changes what it sends, update both.

## Store listing tab

**Name:** Lumen

**Summary** (from `manifest.json`, 132 characters max):
A calm, fast new tab with your favorite sites, a clock, notes and your own wallpapers.

**Category:** Productivity › Tools
**Language:** English

**Description:**

```
Lumen replaces Chrome's new tab with a quiet page: a large clock, your favorite sites, a search bar, notes and a wallpaper you choose.

FAVORITES
Add the sites you open every day. Lumen finds their icons, or you can upload your own. Show them as a list or a dock.

SEARCH
Searches go to the search engine you already use in Chrome. Type a bang to search one site directly, like !yt lofi for YouTube or !gh for GitHub. Recent searches and suggestions are optional.

NOTES
Quick notes, to-dos and links in a panel that stays out of the way. Paste a link and it becomes a chip with the site's icon. Group things in toggles.

WALLPAPERS
Pick photos from Unsplash or Wallhaven, upload your own, or use a plain color. Lumen rotates through up to 10.

ALSO
Weather for a town you choose, a second time zone, 12 or 24-hour time, light and dark.

YOUR DATA
No account, no analytics, no ads. Favorites, notes, photos and settings stay in this browser and are deleted when you remove Lumen.
Some features need other services, and only when you use them:
• Searches go to your Chrome search engine, or to the site you name with a bang.
• Suggestions as you type (off by default) send what you type to DuckDuckGo.
• Weather (off by default) sends the town you search for, and then its rounded coordinates, to Open-Meteo.
• Wallpaper searches go through Lumen's server to Unsplash or Wallhaven.
• Site icons are loaded from Google, which receives the site's name, like youtube.com.
Full details: https://github.com/dedkul/homepage-bookmarker/blob/master/PRIVACY.md

Lumen is not affiliated with Unsplash, Wallhaven, DuckDuckGo or Open-Meteo.
```

**Screenshots** (1280 × 800, in this order): `store/screenshots/1-home.png`, `2-notes.png`, `3-search.png`, `4-wallpapers.png`, `5-light.png`
**Store icon:** `store/icon512.png` (the dashboard scales it to 128)
**Small promo tile:** `store/promo-440x280.png`
**Website / support:** https://github.com/dedkul/homepage-bookmarker

## Privacy practices tab

**Single purpose:**
Lumen replaces Chrome's new tab page with a page that shows the time, the user's favorite sites, a search bar, notes and a wallpaper.

**Permission justification, `search`:**
Lumen's search bar sends what the user types to the default search engine they chose in Chrome, using chrome.search.query, so Lumen never picks or changes the search engine.

**Permission justification, host `https://duckduckgo.com/*` (optional):**
Requested only when the user turns on "suggestions as you type" in Settings > Search. Lumen then fetches search suggestions for what they type from DuckDuckGo's autocomplete endpoint. Turning the setting off removes the permission. It is not requested at install.

**Remote code:** No, I am not using remote code.
Justification (if asked): All JavaScript is in the package. The extension only fetches data (JSON and images) from the services listed in the privacy policy.

**Data usage**, tick these:

| Type | Tick | Why |
|---|---|---|
| Location | Yes | Weather sends the chosen town and its coordinates, rounded to about 1 km, to Open-Meteo. |
| User activity | Yes | With suggestions on, typed search text is sent to DuckDuckGo as the user types. |
| Web history | Yes | The site names of favorites and note links go to Google's icon service. This is a cautious reading; it is not browsing history, but disclosing it costs nothing. |
| Personally identifiable info, health, financial, authentication, personal communications, website content | No | Not collected. |

**Certify all three:** not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not used to determine creditworthiness or for lending.

**Privacy policy URL:** https://github.com/dedkul/homepage-bookmarker/blob/master/PRIVACY.md

## Distribution tab
**Visibility:** Public. **Regions:** All. **Price:** Free.

## Test instructions (for reviewers)
No account or login is needed. Open a new tab after installing. To see search suggestions, open Settings (gear, top right) > Search and turn on suggestions; Chrome will ask to allow duckduckgo.com. Weather is in Settings > Weather.

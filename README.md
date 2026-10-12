# Encore

A self-hosted, Spotify-style music player that can play to your **Sonos** speakers.

![Encore](public/icon.svg)

## Quick start

```bash
# Node.js 20 or newer, no npm install needed (zero dependencies)
npm start
```

Open **http://localhost:4415**. Phones and tablets on the same Wi-Fi can use the "On your network" address printed at startup (add it to your home screen to use it like an app).

For Sonos, run Encore on a computer that's **on the same network as your speakers** (a laptop, desktop, Raspberry Pi or NAS). The speakers stream audio directly from that computer.

## Features

| | |
|---|---|
| **Music** | Full-length tracks from [Audius](https://audius.co), plus 30-second previews of the mainstream catalog (Apple Music), plus ~50,000 live radio stations |
| **Discover** | Home feed (trending, underground, popular playlists, radio), 20 genre mixes, charts |
| **Search** | Songs, catalog previews, artists, playlists and radio stations at once |
| **Library** | Liked Songs, your own playlists (create, rename, delete, add and remove songs), save public playlists, recently played. Stored on the server so it follows you between devices; export and import as JSON |
| **Player** | Queue with "Play next" and "Add to queue", shuffle, repeat all or one, autoplay of similar songs when the queue ends, sleep timer, 5-band equalizer with presets |
| **Lyrics** | Synced, karaoke-style lyrics (click a line to jump to it) from [LRCLIB](https://lrclib.net) |
| **Sonos** | Speaker discovery, play / pause / seek / skip / group volume, automatic queue advance, track info and artwork on the Sonos app, group and ungroup rooms, radio on Sonos |
| **Everywhere** | Responsive layout for phones, lock-screen and media-key controls, keyboard shortcuts |

### Keyboard shortcuts

`Space` play/pause · `←/→` seek 10 seconds · `Shift+←/→` previous/next · `↑/↓` volume · `M` mute · `S` shuffle · `R` repeat · `L` like · `/` search

## How Sonos casting works

Encore uses the speakers' own local control API (UPnP/SOAP on port 1400), the same way the official Sonos app does. You don't need a Sonos account, API key or cloud service.

1. **Discovery:** the server sends an SSDP multicast search, then asks any speaker for the household's zone groups.
2. **Playback:** for the group you pick, the server calls `SetAVTransportURI` with a URL pointing back at itself (`http://<your-computer>:4415/stream/...`), along with DIDL-Lite metadata (title, artist, artwork), then calls `Play`.
3. **Streaming:** the speaker fetches the audio from Encore, which relays it from the source. Radio uses Sonos's `x-rincon-mp3radio://` scheme so endless streams play correctly.
4. **Control:** the web app polls the speaker's transport state each second to keep the progress bar in sync and to start the next song in your queue when a track ends.

**If no speakers show up:**
- Check that the Encore computer and the speakers are on the same network/VLAN (multicast must be allowed).
- Add a speaker by IP in **Settings → Sonos speakers**, or start the server with `SONOS_HOSTS=192.168.1.40 npm start`.
- If the address Encore detects isn't reachable from the speakers (several network cards, Docker, etc.), set it yourself: `PUBLIC_URL=http://192.168.1.10:4415 npm start`.

> Sonos also supports **AirPlay 2**, so on an iPhone or Mac you can send *any* audio (including this app in Safari) to newer Sonos speakers through the AirPlay menu.

## About Spotify

Encore can't stream songs from Spotify. Spotify's terms forbid it, its audio is DRM-protected, and its Web API stopped serving even 30-second previews to new apps in late 2024. The only official way to play Spotify audio is inside Spotify's own apps or SDKs, and those require a Premium account.

So Encore uses sources that legally allow free streaming:

| Source | What you get | Key needed? |
|---|---|---|
| Audius | Full tracks, uploaded by artists | No |
| Apple iTunes Search | 30-second previews of major-label music, with a link to the full song | No |
| radio-browser.info | Live radio stations | No |
| LRCLIB | Lyrics | No |

Ideas for more sources: [Jamendo](https://developer.jamendo.com) (600k+ Creative Commons tracks, free API key), the Internet Archive's live concert collection, your own MP3/FLAC folder, or Spotify **playlist import** (copy playlist names and track lists over and match them to the sources above; this needs a free Spotify developer app).

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4415` | HTTP port |
| `PUBLIC_URL` | auto-detected LAN address | Base URL Sonos speakers use to fetch audio |
| `SONOS_HOSTS` | (none) | Comma-separated speaker IPs to use alongside discovery |

## Project layout

```
server/index.js    HTTP server: API, audio relay, static files
server/sources.js  Audius, iTunes, radio-browser and LRCLIB clients
server/sonos.js    Sonos discovery and control (UPnP/SOAP)
public/            Web app (vanilla JS, no build step)
test/              Tests, including a simulated Sonos speaker
data/library.json  Your likes and playlists (created at runtime)
```

## Development

```bash
npm run dev   # restart on file changes
npm test      # tests run against a fake Sonos speaker
```

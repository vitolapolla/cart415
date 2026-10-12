# Encore

A self-hosted, Spotify-style music player that can play to your **Sonos** speakers.

![Encore](public/icon.svg)

## Get it on your Android phone

1. On your phone, open this repository's **Releases** page and find **"Encore for Android (latest build)"**. A GitHub Action builds it on every push.
2. Download **Encore.apk** and open it. If Android asks, allow your browser to *install unknown apps*.
3. Open Encore. Your phone plays the music itself and talks to your Sonos speakers directly over Wi-Fi, so no computer or server is needed.

To build the APK yourself: install Node.js 20+, JDK 21 and the Android SDK, then run `npm install && npm run android:build`. The APK ends up in `android/app/build/outputs/apk/debug/`.

### Android Auto

Encore is a native Android Auto media app. In the car you get Liked Songs, your playlists, Recently played, Trending, 20 genre mixes and live radio, plus search and voice ("Hey Google, play lo-fi on Encore").

Android Auto only lists Play Store apps by default, so you need to allow Encore once:

1. On your phone, open **Settings → Connected devices → Connection preferences → Android Auto** (or search Settings for "Android Auto").
2. Scroll down and tap **Version** about 10 times until it says developer mode is on.
3. In the **⋮** menu, open **Developer settings** and turn on **Unknown sources**.
4. Reconnect your phone to the car. Encore appears in the media apps.

## Run the server version (computer at home)

```bash
# Node.js 20 or newer
npm install
npm start
```

Open **http://localhost:4415**. Phones and tablets on the same Wi-Fi can use the "On your network" address printed at startup. For Sonos, the computer must be **on the same network as your speakers**, because they stream audio from it.

There's also a server-less website build (`npm run web`). It plays music from any browser, but a website can't reach the speakers on your home network, so it has no Sonos.

## Apple: iPhone and CarPlay

The same app can be packaged for iPhone with Capacitor's iOS platform, but this hasn't been done yet. You'll need:

- **A Mac with Xcode.** iOS apps can only be built on macOS.
- **An Apple Developer account.** It costs $99 a year. With a free account, apps on your phone expire after 7 days.
- **For CarPlay, Apple's CarPlay audio entitlement.** You request it from Apple for your developer account, and they must approve it. The CarPlay screens are then written in Swift (`CPTemplateApplicationScene` with list templates), similar to the Android Auto browse tree in `PlaybackService.java`.

Until then, on an iPhone you can open the website version in Safari and use **Share → Add to Home Screen**. Newer Sonos speakers also accept any iPhone audio over **AirPlay 2**.

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
| **Android app** | Phone-first design, full-screen player with swipe gestures, background playback with notification and lock-screen controls, Bluetooth and headset buttons, Android Auto, voice search, system equalizer |
| **Everywhere** | Works as a website on any device, keyboard shortcuts on desktop |

### Keyboard shortcuts

`Space` play/pause · `←/→` seek 10 seconds · `Shift+←/→` previous/next · `↑/↓` volume · `M` mute · `S` shuffle · `R` repeat · `L` like · `/` search

## How Sonos casting works

Encore uses the speakers' own local control API (UPnP/SOAP on port 1400), the same way the official Sonos app does. You don't need a Sonos account, API key or cloud service.

1. **Discovery:** the app (or server) sends an SSDP multicast search, then asks any speaker for the household's zone groups.
2. **Playback:** for the group you pick, it calls `SetAVTransportURI` with the song's URL and DIDL-Lite metadata (title, artist, artwork), then `Play`. The Android app hands the speaker the song's own address, so the speaker streams straight from the music service and the phone can sleep or leave the house. The server version gives the speaker a URL on the server, which relays the audio. Radio uses Sonos's `x-rincon-mp3radio://` scheme so endless streams play correctly.
3. **Control:** the app polls the speaker's state every second to keep the progress bar in sync and to start the next song in your queue when one ends. If the app is closed or your phone suspends it, the speaker finishes its current song but may not start the next one.

**If no speakers show up:**
- Check that your phone (or the Encore computer) and the speakers are on the same network, not a guest network or mobile data. Multicast must be allowed.
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
shared/            Runs everywhere (Node, browser, Android WebView)
  api.js           The Encore API (home, search, genres, library, Sonos…)
  sources.js       Audius, iTunes, radio-browser and LRCLIB clients
  sonos.js         Sonos control over UPnP/SOAP
public/            The app UI (vanilla JS, no build step)
  app.js           Views, queue, library, full-screen player
  engines.js       Playback engines: browser audio, Android native player, Sonos
  platform.js      Detects server / website / Android mode
server/            Node server for the at-home version (API, audio relay, SSDP)
android/           Capacitor Android project
  app/src/main/java/app/encore/music/
    PlaybackService.java     Media3 player: background play, notification, Android Auto
    Catalog.java             Android Auto browse tree and search
    EncorePlayerPlugin.java  Bridge between the web UI and the native player
    SonosDiscoveryPlugin.java  SSDP speaker discovery
scripts/           Website build, Android icon generator
test/              Tests, including a simulated Sonos speaker
```

## Development

```bash
npm run dev            # server version, restarts on file changes
npm test               # tests, including against a fake Sonos speaker
npm run web            # build and serve the server-less website (www/)
npm run android:sync   # copy the web app into the Android project
npm run android:build  # build the APK
```

The Android project signs builds with `android/encore-dev.jks`, a key kept in the repository on purpose so that every build installs over the previous one. It's fine for sideloading. Create your own private key before publishing to the Play Store.

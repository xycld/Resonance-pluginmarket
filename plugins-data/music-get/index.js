module.exports = {
  activate(api) {
    const NETEASE_API_BASE = 'https://music.163.com'

    // Cookie storage
    let cookies = {}

    async function loadCookies() {
      try {
        const stored = await api.storage.get('cookies')
        if (stored) cookies = stored
      } catch (e) {}
    }

    async function saveCookies() {
      await api.storage.set('cookies', cookies)
    }

    function getCookieHeader() {
      const parts = []
      for (const [key, value] of Object.entries(cookies)) {
        parts.push(key + '=' + value)
      }
      return parts.join('; ')
    }

    async function neteaseFetch(endpoint, options) {
      options = options || {}
      var url = endpoint.indexOf('http') === 0 ? endpoint : NETEASE_API_BASE + endpoint
      var headers = {
        'Referer': 'https://music.163.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
      if (options.headers) {
        for (var k in options.headers) {
          headers[k] = options.headers[k]
        }
      }
      var cookieHeader = getCookieHeader()
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader
      }

      var res = await fetch(url, {
        method: options.method || 'GET',
        headers: headers,
        body: options.body,
      })

      // Parse and save cookies
      var setCookie = res.headers.get('set-cookie')
      if (setCookie) {
        var cookieList = setCookie.split(',')
        for (var i = 0; i < cookieList.length; i++) {
          var kv = cookieList[i].split(';')[0]
          var eq = kv.indexOf('=')
          if (eq > 0) {
            var ck = kv.slice(0, eq).trim()
            var cv = kv.slice(eq + 1).trim()
            cookies[ck] = cv
          }
        }
        await saveCookies()
      }

      return res
    }

    // Search
    async function search(keyword, limit) {
      limit = limit || 20
      var res = await neteaseFetch('/api/search/get/web?s=' + encodeURIComponent(keyword) + '&type=1&offset=0&total=true&limit=' + limit)
      var data = await res.json()

      if (!data.result || !data.result.songs) {
        return { provider: 'netease', songs: [], hasMore: false }
      }

      var songs = []
      for (var i = 0; i < data.result.songs.length; i++) {
        var s = data.result.songs[i]
        var artists = []
        for (var j = 0; j < s.artists.length; j++) {
          artists.push(s.artists[j].name)
        }
        songs.push({
          id: String(s.id),
          name: s.name,
          artists: artists,
          album: s.album ? s.album.name || '' : '',
          duration: Math.round(s.duration / 1000),
          provider: 'netease',
          cover: s.album && s.album.picUrl ? s.album.picUrl : undefined,
        })
      }

      return {
        provider: 'netease',
        songs: songs,
        hasMore: data.result.songCount > limit,
      }
    }

    // Get song URL
    async function getSongUrl(songId, quality) {
      var qualityMap = {
        low: 64000,
        standard: 128000,
        high: 192000,
        lossless: 320000,
        hires: 999000,
      }
      var br = qualityMap[quality] || 128000

      var res = await neteaseFetch('/api/song/enhance/player/url?ids=[' + songId + ']&br=' + br)
      var data = await res.json()

      if (!data.data || !data.data[0]) return null

      var item = data.data[0]
      return {
        url: item.url,
        format: item.type || 'mp3',
        bitrate: item.br,
        size: item.size,
      }
    }

    // Get lyrics
    async function getLyrics(songId) {
      var res = await neteaseFetch('/api/song/lyric?id=' + songId + '&lv=1&kv=1&tv=1')
      var data = await res.json()

      return {
        lrc: data.lrc && data.lrc.lyric ? data.lrc.lyric : '',
        translatedLrc: data.tlyric && data.tlyric.lyric ? data.tlyric.lyric : undefined,
      }
    }

    // Register hooks
    api.hooks.intercept('musicGet:search', async (ctx, next) => {
      var keyword = ctx.data.keyword
      var limit = ctx.data.limit || 20
      var result = await search(keyword, limit)
      ctx.data.results = [result]
      await next()
    })

    api.hooks.intercept('musicGet:download', async (ctx, next) => {
      var song = ctx.data.song
      var quality = ctx.data.quality || 'standard'
      var urlInfo = await getSongUrl(song.id, quality)
      var lyrics = await getLyrics(song.id)

      ctx.data.audioUrl = urlInfo && urlInfo.url ? urlInfo.url : null
      ctx.data.format = urlInfo && urlInfo.format ? urlInfo.format : 'mp3'
      ctx.data.bitrate = urlInfo && urlInfo.bitrate ? urlInfo.bitrate : 0
      ctx.data.size = urlInfo && urlInfo.size ? urlInfo.size : 0
      ctx.data.lrc = lyrics.lrc
      ctx.data.translatedLrc = lyrics.translatedLrc

      await next()
    })

    // QR Login hooks (placeholder)
    api.hooks.intercept('musicGet:qrLogin', async (ctx, next) => {
      ctx.data.session = {
        provider: 'netease',
        key: 'demo-key',
        qrUrl: 'https://music.163.com',
        expiresAt: Date.now() + 300000,
      }
      await next()
    })

    api.hooks.intercept('musicGet:pollQrLogin', async (ctx, next) => {
      ctx.data.result = {
        status: 'expired',
        message: 'QR login not fully implemented',
      }
      await next()
    })

    api.hooks.intercept('musicGet:setCookie', async (ctx, next) => {
      var provider = ctx.data.provider
      var cookie = ctx.data.cookie
      if (provider === 'netease') {
        cookies['MUSIC_U'] = cookie
        await saveCookies()
      }
      await next()
    })

    // Load saved cookies
    loadCookies().catch(function () {})

    console.log('[music-get] plugin activated')
  },

  deactivate() {
    console.log('[music-get] plugin deactivated')
  },
}

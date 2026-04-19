module.exports = function (ctx) {
  var h = ctx.React.createElement
  var useState = ctx.React.useState
  var useEffect = ctx.React.useEffect
  var useRef = ctx.React.useRef
  var useCallback = ctx.React.useCallback
  var motion = ctx.motion.motion
  var AnimatePresence = ctx.motion.AnimatePresence

  var QUALITY_OPTIONS = [
    { value: 'standard', label: '标准' },
    { value: 'high', label: '高品质' },
    { value: 'lossless', label: '无损' },
    { value: 'hires', label: 'Hi-Res' },
  ]

  function formatDuration(secs) {
    if (!secs) return '--:--'
    var m = Math.floor(secs / 60)
    var s = Math.floor(secs % 60)
    return m + ':' + (s < 10 ? '0' : '') + s
  }

  // ─── SearchBar ─────────────────────────────────────────
  function SearchBar(props) {
    var inputRef = useRef(null)

    function onSubmit(e) {
      e.preventDefault()
      if (props.keyword.trim()) props.onSearch()
    }

    return h('form', {
      onSubmit: onSubmit,
      style: {
        display: 'flex', gap: '10px', alignItems: 'center',
        padding: '0 4px',
      },
    },
      h('div', {
        style: {
          flex: 1, display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '14px', padding: '0 16px', height: '48px',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'border-color 0.2s',
        },
      },
        h(ctx.icons.Search, { size: 18, style: { opacity: 0.4, flexShrink: 0 } }),
        h('input', {
          ref: inputRef,
          type: 'text',
          value: props.keyword,
          onChange: function (e) { props.setKeyword(e.target.value) },
          placeholder: '搜索歌曲、歌手...',
          style: {
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'white', fontSize: '15px', marginLeft: '10px',
            fontFamily: 'inherit',
          },
        })
      ),
      h('select', {
        value: props.quality,
        onChange: function (e) { props.setQuality(e.target.value) },
        style: {
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px', color: 'white', padding: '0 12px', height: '48px',
          fontSize: '13px', outline: 'none', cursor: 'pointer',
          fontFamily: 'inherit',
        },
      },
        QUALITY_OPTIONS.map(function (q) {
          return h('option', { key: q.value, value: q.value, style: { background: '#1a1a1a' } }, q.label)
        })
      ),
      h('button', {
        type: 'submit',
        disabled: props.loading || !props.keyword.trim(),
        style: {
          height: '48px', padding: '0 24px', borderRadius: '14px',
          background: props.loading ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)',
          color: 'white', border: 'none', cursor: props.loading ? 'wait' : 'pointer',
          fontSize: '14px', fontWeight: 500, transition: 'all 0.2s',
          fontFamily: 'inherit',
        },
      }, props.loading ? '搜索中...' : '搜索')
    )
  }

  // ─── ResultCard ─────────────────────────────────────────
  function ResultCard(props) {
    var song = props.song
    var dlState = props.dlState // 'idle' | 'loading' | 'done' | 'error'

    var statusIcon = {
      idle: h(ctx.icons.Download, { size: 16 }),
      loading: h(ctx.icons.Loader2, { size: 16, style: { animation: 'mg-spin 1s linear infinite' } }),
      done: h(ctx.icons.Check, { size: 16 }),
      error: h(ctx.icons.X, { size: 16 }),
    }

    var statusColor = {
      idle: 'rgba(255,255,255,0.5)',
      loading: '#60a5fa',
      done: '#4ade80',
      error: '#f87171',
    }

    return h(motion.div, {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      transition: { type: 'spring', bounce: 0, duration: 0.4 },
      style: {
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '12px 16px', borderRadius: '16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        transition: 'background 0.2s, border-color 0.2s',
        cursor: 'default',
      },
      onMouseEnter: function (e) {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
      },
      onMouseLeave: function (e) {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
      },
    },
      // Cover
      h('div', {
        style: {
          width: 48, height: 48, borderRadius: '12px', flexShrink: 0,
          background: song.cover ? 'none' : 'rgba(255,255,255,0.06)',
          backgroundImage: song.cover ? 'url(' + song.cover + ')' : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
      },
        !song.cover && h(ctx.icons.Music, { size: 20, style: { opacity: 0.3 } })
      ),
      // Info
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', {
          style: {
            color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: 500,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          },
        }, song.name),
        h('div', {
          style: {
            color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '3px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          },
        }, song.artists.join(', ') + (song.album ? ' · ' + song.album : ''))
      ),
      // Duration
      h('span', {
        style: {
          color: 'rgba(255,255,255,0.3)', fontSize: '12px',
          width: '46px', textAlign: 'right', flexShrink: 0,
        },
      }, formatDuration(song.duration)),
      // Download button
      h('button', {
        onClick: function () { if (dlState === 'idle' || dlState === 'error') props.onDownload() },
        disabled: dlState === 'loading' || dlState === 'done',
        style: {
          width: 36, height: 36, borderRadius: '10px', border: 'none',
          background: 'rgba(255,255,255,0.06)', cursor: dlState === 'loading' ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: statusColor[dlState] || statusColor.idle,
          transition: 'all 0.2s', flexShrink: 0,
        },
      }, statusIcon[dlState] || statusIcon.idle)
    )
  }

  // ─── QrLoginModal ──────────────────────────────────────
  function QrLoginModal(props) {
    var sessionState = useState(null)
    var session = sessionState[0]
    var setSession = sessionState[1]
    var statusState = useState('idle') // 'idle' | 'loading' | 'waiting' | 'scanned' | 'success' | 'expired' | 'error'
    var status = statusState[0]
    var setStatus = statusState[1]
    var pollRef = useRef(null)

    function cleanup() {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    useEffect(function () { return cleanup }, [])

    function startLogin() {
      cleanup()
      setStatus('loading')
      setSession(null)
      ctx.hooks.dispatch('musicGet:qrLogin', { provider: 'netease' }).then(function (res) {
        var s = res.data.session
        setSession(s)
        setStatus('waiting')
        // Start polling
        pollRef.current = setInterval(function () {
          ctx.hooks.dispatch('musicGet:pollQrLogin', { session: s }).then(function (res) {
            var result = res.data.result
            if (result.status === 'scanned') setStatus('scanned')
            else if (result.status === 'success') {
              cleanup()
              setStatus('success')
              if (result.cookie) {
                ctx.hooks.dispatch('musicGet:setCookie', { provider: 'netease', cookie: result.cookie })
              }
              setTimeout(function () { props.onClose() }, 1500)
            } else if (result.status === 'expired') {
              cleanup()
              setStatus('expired')
            }
          }).catch(function () {
            cleanup()
            setStatus('error')
          })
        }, 2000)
      }).catch(function () {
        setStatus('error')
      })
    }

    var statusLabels = {
      idle: '点击下方按钮生成二维码',
      loading: '正在生成二维码...',
      waiting: '请使用网易云音乐 APP 扫描二维码',
      scanned: '已扫描，请在手机上确认',
      success: '登录成功！',
      expired: '二维码已过期，请重新生成',
      error: '出现错误，请重试',
    }

    var statusColors = {
      idle: 'rgba(255,255,255,0.5)',
      loading: '#60a5fa',
      waiting: '#60a5fa',
      scanned: '#fbbf24',
      success: '#4ade80',
      expired: '#f87171',
      error: '#f87171',
    }

    var Modal = ctx.components.Modal

    return h(Modal, {
      open: props.open,
      onClose: function () { cleanup(); props.onClose() },
      title: '网易云音乐扫码登录',
    },
      h('div', { style: { padding: '8px 0' } },
        // QR display area
        h('div', {
          style: {
            width: '100%', aspectRatio: '1', maxWidth: '240px', margin: '0 auto 16px',
            background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          },
        },
          session && session.qrImage
            ? h('img', {
                src: session.qrImage.startsWith('data:') ? session.qrImage : 'data:image/png;base64,' + session.qrImage,
                style: { width: '80%', height: '80%', objectFit: 'contain' },
              })
            : session && session.qrUrl
              ? h('div', {
                  style: {
                    color: 'rgba(255,255,255,0.4)', fontSize: '12px',
                    textAlign: 'center', padding: '20px', wordBreak: 'break-all',
                  },
                }, session.qrUrl)
              : h(ctx.icons.QrCode, { size: 48, style: { opacity: 0.15 } })
        ),
        // Status
        h('div', {
          style: {
            textAlign: 'center', fontSize: '13px', marginBottom: '16px',
            color: statusColors[status] || 'rgba(255,255,255,0.5)',
          },
        }, statusLabels[status] || ''),
        // Action button
        h('button', {
          onClick: startLogin,
          disabled: status === 'loading' || status === 'waiting' || status === 'scanned',
          style: {
            width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
            background: 'rgba(255,255,255,0.1)', color: 'white',
            cursor: status === 'loading' ? 'wait' : 'pointer',
            fontSize: '14px', fontWeight: 500, transition: 'all 0.2s',
            fontFamily: 'inherit',
          },
        }, status === 'idle' || status === 'expired' || status === 'error' ? '生成二维码' : '等待扫码中...')
      )
    )
  }

  // ─── MusicGetPage (main) ───────────────────────────────
  function MusicGetPage() {
    var keywordState = useState('')
    var keyword = keywordState[0]
    var setKeyword = keywordState[1]
    var qualityState = useState('standard')
    var quality = qualityState[0]
    var setQuality = qualityState[1]
    var resultsState = useState([])
    var results = resultsState[0]
    var setResults = resultsState[1]
    var loadingState = useState(false)
    var loading = loadingState[0]
    var setLoading = loadingState[1]
    var dlStatesState = useState({})
    var dlStates = dlStatesState[0]
    var setDlStates = dlStatesState[1]
    var qrOpenState = useState(false)
    var qrOpen = qrOpenState[0]
    var setQrOpen = qrOpenState[1]
    var settingsStore = ctx.stores.useSettingsStore

    function doSearch() {
      if (!keyword.trim() || loading) return
      setLoading(true)
      setResults([])
      setDlStates({})
      ctx.hooks.dispatch('musicGet:search', { keyword: keyword.trim(), limit: 20 })
        .then(function (result) {
          var res = result.data.results || []
          // Flatten results from all providers
          var allSongs = []
          res.forEach(function (r) {
            r.songs.forEach(function (s) { allSongs.push(s) })
          })
          setResults(allSongs)
        })
        .catch(function (err) { console.error('[music-get] search error:', err) })
        .finally(function () { setLoading(false) })
    }

    function doDownload(song, index) {
      var key = song.provider + ':' + song.id
      setDlStates(function (prev) {
        var next = {}
        for (var k in prev) next[k] = prev[k]
        next[key] = 'loading'
        return next
      })

      // Step 1: Get download info from backend
      ctx.hooks.dispatch('musicGet:download', { song: song, quality: quality })
        .then(function (result) {
          var info = result.data
          if (!info || !info.audioUrl) {
            throw new Error('No audio URL available')
          }

          // Step 2: Fetch audio data
          return ctx.fetch(info.audioUrl)
            .then(function (res) { return res.body })
            .then(function (audioData) {
              // Step 3: Save to plugin downloads directory
              var ext = info.format || 'mp3'
              var safeName = song.name.replace(/[\\/:*?"<>|]/g, '_').trim()
              var safeArtist = song.artists.join(', ').replace(/[\\/:*?"<>|]/g, '_').trim()
              var filename = safeName + ' - ' + safeArtist + '.' + ext

              return ctx.fs.mkdir('downloads')
                .catch(function () { /* dir may already exist */ })
                .then(function () {
                  return ctx.fs.writeFile('downloads/' + filename, new Uint8Array(audioData))
                })
                .then(function () {
                  // Step 4: Save lyrics if available
                  if (info.lrc) {
                    var lrcFilename = safeName + ' - ' + safeArtist + '.lrc'
                    var lrcContent = info.lrc
                    if (info.translatedLrc) {
                      lrcContent += '\n\n' + info.translatedLrc
                    }
                    return ctx.fs.writeFile('downloads/' + lrcFilename, lrcContent)
                  }
                })
            })
            .then(function () {
              setDlStates(function (prev) {
                var next = {}
                for (var k in prev) next[k] = prev[k]
                next[key] = 'done'
                return next
              })
            })
        })
        .catch(function (err) {
          console.error('[music-get] download error:', err)
          setDlStates(function (prev) {
            var next = {}
            for (var k in prev) next[k] = prev[k]
            next[key] = 'error'
            return next
          })
        })
    }

    var hasResults = results.length > 0

    return h('div', {
      style: {
        width: '100%', maxWidth: '800px', margin: '0 auto',
        padding: '100px 20px 40px', minHeight: '100vh',
        display: 'flex', flexDirection: 'column', gap: '16px',
      },
    },
      // Title bar
      h('div', {
        style: {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '8px', padding: '0 4px',
        },
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
          h(ctx.icons.Search, { size: 22, style: { opacity: 0.6 } }),
          h('span', {
            style: { fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' },
          }, '音乐搜索')
        ),
        h('button', {
          onClick: function () { setQrOpen(true) },
          style: {
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '10px', border: 'none',
            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s',
            fontFamily: 'inherit',
          },
        },
          h(ctx.icons.QrCode, { size: 14 }),
          '网易云登录'
        )
      ),
      // Search bar
      h(SearchBar, {
        keyword: keyword, setKeyword: setKeyword,
        quality: quality, setQuality: setQuality,
        loading: loading, onSearch: doSearch,
      }),
      // Results list
      hasResults && h('div', {
        style: {
          display: 'flex', flexDirection: 'column', gap: '6px',
          marginTop: '8px',
        },
      },
        h('div', {
          style: {
            fontSize: '12px', color: 'rgba(255,255,255,0.3)',
            padding: '0 4px', marginBottom: '4px',
          },
        }, '找到 ' + results.length + ' 首歌曲'),
        results.map(function (song, i) {
          var key = song.provider + ':' + song.id
          return h(ResultCard, {
            key: key + ':' + i,
            song: song,
            dlState: dlStates[key] || 'idle',
            onDownload: function () { doDownload(song, i) },
          })
        })
      ),
      // Empty state
      !hasResults && !loading && h('div', {
        style: {
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          opacity: 0.3, paddingTop: '80px',
        },
      },
        h(ctx.icons.Music, { size: 48 }),
        h('div', {
          style: { marginTop: '16px', fontSize: '14px' },
        }, keyword ? '没有找到相关歌曲' : '输入关键词开始搜索')
      ),
      // Loading state
      loading && h('div', {
        style: {
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          paddingTop: '80px',
        },
      },
        h(ctx.icons.Loader2, {
          size: 32,
          style: { opacity: 0.4, animation: 'mg-spin 1s linear infinite' },
        })
      ),
      // QR modal
      h(QrLoginModal, { open: qrOpen, onClose: function () { setQrOpen(false) } })
    )
  }

  // ─── Register ──────────────────────────────────────────

  ctx.register.style(
    '@keyframes mg-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }'
  )

  ctx.register.page({
    id: 'music-get',
    title: '音乐搜索',
    icon: 'Search',
    component: function () { return h(MusicGetPage, null) },
  })
}

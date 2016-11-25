/* eslint no-param-reassign: 0 */
import '../_sass/_vars.scss'
import '../_sass/_base.scss'
import '../_sass/_layout.scss'
import '../_sass/_home.scss'
import '../_sass/_buy.scss'
import '../_sass/_tour.scss'
import '../_sass/_switch.scss'
import '../_sass/_format.scss'
import '../_sass/_howto.scss'
import '../_sass/_timeline.scss'
import '../_sass/_nav.scss'
import '../_sass/_playButton.scss'
import '../_sass/_features.scss'
import '../_sass/_shortcuts.scss'
import '../_sass/_footer.scss'
import '../_sass/changelog.scss'
import '../_sass/main.scss'
import checkOSCompatibility from './checkOSCompatibility'

const CIRCLE_LENGTH = Math.PI * 45 * 2
const forEach = Array.prototype.forEach
let currentlyPlayingVideo = null

function pauseVideoPlayback(video) {
  if (video) video.pause()
}

function toggleVideoPlayback(video) {
  if (video) {
    if (video.paused) {
      const playButtonEl = document.querySelector(`.features__item[data-video=${ video.id }] .playButton`)
      if (playButtonEl) {
        playButtonEl.classList.add('playButton_loading')
      }
      video.play()
    } else {
      video.pause()
    }
  }
}

function initGA(classNames) {
  classNames.forEach((className) => {
    forEach.call(document.querySelectorAll(`.${ className }`), (el) => {
            // Display alert about incompatible OS X version
            el && el.addEventListener('click', () => { // eslint-disable-line
              if (className === 'buy-paddle' && !checkOSCompatibility(navigator.userAgent)) {
                alert('Your OS version is not compatible with ColorSnapper2, which requires' +
                      ' Mac OS X 10.9+ or macOS 11+.')
              }
            })

            // Send tracking code
            window.ga && window.ga('send', 'event', 'button', 'click', className) // eslint-disable-line
    })
  })
}

function onMouseEnter(video) {
    // Resume the video marked for that on hover
  if (video && currentlyPlayingVideo !== video && video.wasPlaying) {
    toggleVideoPlayback(currentlyPlayingVideo)
    video.play()
  }
    // Toggle screenshots on mouse hover
  if (video) video.classList.add('is-active')
}

function onMouseLeave(video) {
    // If the video is playing now we mark it to resume next time we hover it
  if (video && video.played.length) {
    video.wasPlaying = !video.paused
  }
    // Toggle screenshots on mouse hover
  if (video && video.paused) {
    video.classList.remove('is-active')
  }
}

function onTimeUpdate(el, video) {
  const playedPercent = (video.currentTime / video.duration) * 100
  const progressEl = el.querySelector('.js-progress')
  if (progressEl) {
    progressEl.style.width = `${ playedPercent }%`
  }
}

function initTourForContainer(id) {
  const container = document.getElementById(id)
  if (!container) return
  const links = container.querySelectorAll('.features__item[data-video]')

  forEach.call(links, (link) => {
    const videoID = link.getAttribute('data-video')
    const video = document.getElementById(videoID)

    if (typeof video !== 'undefined') {
      video.addEventListener('timeupdate', onTimeUpdate.bind(this, link, video))
      link.addEventListener('mouseenter', onMouseEnter.bind(this, video))
      link.addEventListener('mouseleave', onMouseLeave.bind(this, video))
      link.addEventListener('click', () => {
        if (currentlyPlayingVideo && video !== currentlyPlayingVideo) {
          toggleVideoPlayback(currentlyPlayingVideo)
        }
        toggleVideoPlayback(video)
      })
    }
  })
}

function initVideoProgressInContainer(id) {
  const container = document.getElementById(id)
  if (!container) return
  const video = container.querySelector('video')
  video.addEventListener('timeupdate', onTimeUpdate.bind(this, container, video))
}

document.addEventListener('DOMContentLoaded', () => {
  initGA(['buy-mas', 'buy-paddle', 'buy-download'])
  initVideoProgressInContainer('howto')
  initTourForContainer('loupeTour')
  initTourForContainer('overlayTour')

  forEach.call(document.querySelectorAll('#switch-theme input'), (item) => {
    item.addEventListener('change', (event) => {
      const themeName = event.target.value

      forEach.call(document.querySelectorAll('#overlayTour .tour__img'), (img) => {
        img.src = img.src.replace(/(dark|light)/, themeName)
      })

      forEach.call(document.querySelectorAll('#overlayTour .tour__video'), (video) => {
        if (video.paused) {
          video.poster = video.poster.replace(/(dark|light)/, themeName)
          video.src = video.src.replace(/(dark|light)/, themeName)
        } else {
                    // Stop all videos
          video.pause()
          video.wasPlaying = false
          window.setTimeout(() => {
                        // For some reason events won't fire if this code is sync
            video.currentTime = 0
            window.setTimeout(() => {
                            // For some reason events won't fire if this code is sync
              video.poster = video.poster.replace(/(dark|light)/, themeName)
              video.src = video.src.replace(/(dark|light)/, themeName)
            }, 100)
          }, 100)
        }
      })
    })
  })

    // Videos pre-loading indication
  forEach.call(document.querySelectorAll('video'), (video) => {
    const id = video.id
    const featureEl = document.querySelector(`.features__item[data-video=${ id }]`)
    const playButtonEl = document.querySelector(`.playButton[data-video=${ id }]`)
    const bufferedProgressEl = playButtonEl ? playButtonEl.querySelector('.playButton__progress_buffer') : null
    const playedProgressEl = playButtonEl ? playButtonEl.querySelector('.playButton__progress_time') : null

    if (playButtonEl) {
      playButtonEl.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()

            // Stop currently playing video
        if (video !== currentlyPlayingVideo) {
          pauseVideoPlayback(currentlyPlayingVideo)
        }

        toggleVideoPlayback(video, playButtonEl)
      })
    }

    function renderProgress(videoEl) {
      if (videoEl.buffered && videoEl.buffered.length) {
        const buffered = videoEl.buffered.end(0) / videoEl.duration
        if (bufferedProgressEl) {
          bufferedProgressEl.style.strokeDashoffset = CIRCLE_LENGTH * (1 - buffered)
        }
      }
      const played = videoEl.currentTime / videoEl.duration
      if (playedProgressEl) {
        playedProgressEl.style.strokeDashoffset = CIRCLE_LENGTH * (1 - played)
      }
    }

    video.addEventListener('progress', (event) => {
      renderProgress(event.target)
    })

    video.addEventListener('timeupdate', (event) => {
      renderProgress(event.target)
    })

    video.addEventListener('playing', () => {
      currentlyPlayingVideo = video
      video.classList.add('is-active')
      if (featureEl) featureEl.classList.add('is-active')
      if (playButtonEl) playButtonEl.classList.remove('playButton_loading')
      if (playButtonEl) playButtonEl.classList.add('playButton_playing')
    })

    video.addEventListener('pause', () => {
      if (currentlyPlayingVideo === video) {
        currentlyPlayingVideo = null
      }
      video.classList.remove('is-active')
      if (featureEl) featureEl.classList.remove('is-active')
      if (playButtonEl) playButtonEl.classList.remove('playButton_playing')
    })

    video.addEventListener('loadeddata', () => {
      if (playButtonEl) playButtonEl.classList.remove('playButton_loading')
    })
  })
})

require('../_sass/main.scss');

const CIRCLE_LENGTH = Math.PI * 45 * 2;
const forEach = Array.prototype.forEach;
let currentlyPlayingVideo = null;

function onMouseEnter(video) {
    // Resume the video marked for that on hover
    if (video &&
        currentlyPlayingVideo !== video &&
        video.wasPlaying) {
        toggleVideoPlayback(currentlyPlayingVideo);
        video.play();
    }
}

function onMouseLeave(video) {
    // If the video is playing now we mark it to resume next time we hover it
    if (video && video.played.length) {
        video.wasPlaying = !video.paused;
    }
}

function onTimeUpdate(el, video) {
    var playedPercent = (video.currentTime / video.duration) * 100;
    var progressEl = el.querySelector('.js-progress');
    if (progressEl) {
        progressEl.style.width = playedPercent + "%";
    }
}

function initTourForContainer(id) {
    var container = document.getElementById(id);
    if (!container) return;
    var links = container.querySelectorAll('.features__link');

    forEach.call(links, link => {
        if (!link.href) {
            return;
        }

        const videoID = link.href.replace(/(.+)(#)(.+)/, '$3');
        const video = document.getElementById(videoID);

        video.addEventListener('timeupdate', onTimeUpdate.bind(this, link, video));
        link.addEventListener('mouseenter', onMouseEnter.bind(this, video));
        link.addEventListener('mouseleave', onMouseLeave.bind(this, video));
        link.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            if (currentlyPlayingVideo && video !== currentlyPlayingVideo) {
                toggleVideoPlayback(currentlyPlayingVideo);
            }
            toggleVideoPlayback(video);
        });
    });
}

function initVideoProgressInContainer(id) {
    const container = document.getElementById(id);
    if (!container) return;
    const video = container.querySelector('video');
    video.addEventListener('timeupdate', onTimeUpdate.bind(this, container, video));
}

function pauseVideoPlayback(video) {
    video && video.pause();
}

function toggleVideoPlayback(video) {
    if (video) {
        if (video.paused) {
            const playButtonEl = document.querySelector(`a[href="#${video.id}"] .playButton`)
            if (playButtonEl) {
                playButtonEl.classList.add("playButton_loading");
            }
            video.play();
        } else {
            video.pause();
        }
    }
}
document.addEventListener("DOMContentLoaded", () => {
    initVideoProgressInContainer('howto');
    initTourForContainer('loupeTour');
    initTourForContainer('overlayTour');

    forEach.call(document.querySelectorAll("#switch-theme input"), item => {
        item.addEventListener("change", event => {
            const themeName = event.target.value;

            forEach.call(document.querySelectorAll("#overlayTour .tour__img"), img => {
                img.src = img.src.replace(/(dark|light)/, themeName);
            });

            forEach.call(document.querySelectorAll("#overlayTour .tour__video"), video => {
                // Stop all videos
                video.pause();
                video.wasPlaying = false;
                window.setTimeout(() => {
                    // For some reason events won't fire if this code is sync
                    video.currentTime = 0;
                    window.setTimeout(() => {
                        // For some reason events won't fire if this code is sync
                        video.poster = video.poster.replace(/(dark|light)/, themeName);
                        video.src = video.src.replace(/(dark|light)/, themeName);
                    }, 100);
                }, 100);
            });
        });
    });

    // Videos pre-loading indication
    forEach.call(document.querySelectorAll("video"), video => {
        const id = video.id;
        const linkToVideoEl = document.querySelector(`a[href="#${id}"]`);
        const playButtonEl = document.querySelector(`.playButton[data-video=${id}]`);
        const bufferedProgressEl = playButtonEl ? playButtonEl.querySelector('.playButton__progress_buffer') : null;
        const playedProgressEl = playButtonEl ? playButtonEl.querySelector('.playButton__progress_time') : null;

        playButtonEl && playButtonEl.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            // Stop currently playing video
            if (video !== currentlyPlayingVideo) {
                pauseVideoPlayback(currentlyPlayingVideo);
            }

            toggleVideoPlayback(video, playButtonEl);
        });

        function renderProgress(video) {
            if (video.buffered && video.buffered.length) {
                const buffered = video.buffered.end(0) / video.duration
                if (bufferedProgressEl) {
                    bufferedProgressEl.style.strokeDashoffset = CIRCLE_LENGTH * (1 - buffered);
                }
            }
            const played = video.currentTime / video.duration;
            if (playedProgressEl) {
                playedProgressEl.style.strokeDashoffset = CIRCLE_LENGTH * (1 - played);
            }
        }

        video.addEventListener('progress', event => {
            renderProgress(event.target);
        });

        video.addEventListener('timeupdate', event => {
            renderProgress(event.target);
        });

        video.addEventListener('playing', () => {
            currentlyPlayingVideo = video;
            video.classList.add("is-active");
            linkToVideoEl && linkToVideoEl.classList.add("is-active");
            playButtonEl && playButtonEl.classList.remove("playButton_loading");
            playButtonEl && playButtonEl.classList.add("playButton_playing");
        });

        video.addEventListener('pause', () => {
            if (currentlyPlayingVideo === video) {
                currentlyPlayingVideo = null;
            }
            video.classList.remove("is-active");
            linkToVideoEl && linkToVideoEl.classList.remove("is-active");
            playButtonEl && playButtonEl.classList.remove("playButton_playing");
        });

        video.addEventListener('loadeddata', () => {
            playButtonEl && playButtonEl.classList.remove("playButton_loading");
        });

    });
});

require('../_sass/main.scss');

const CIRCLE_LENGTH = Math.PI * 45 * 2;
const forEach = Array.prototype.forEach;
let currentlyPlayingVideo;

let onMouseEnter = (event, el, video) => {
    el.classList.add("is-hovered");
    video.classList.add("is-hovered");
    typeof video !== "undefined" && video.wasPlayed && video.play();
};

let onMouseLeave = (event, el, video) => {
    el.classList.remove("is-hovered");
    video.classList.remove("is-hovered");
    pauseVideoPlayback(currentlyPlayingVideo);
};

let onTimeUpdate = (event, el, video) => {
    var playedPercent = (video.currentTime / video.duration) * 100;
    var progressEl = el.querySelector('.js-progress');
    if (progressEl) {
        progressEl.style.width = playedPercent + "%";
    }
};

let initTourForContainer = (id) => {
    var container = document.getElementById(id);
    if (!container) return;
    var links = container.querySelectorAll('.features__link');

    forEach.call(links, link => {
        if (!link.href) {
            return;
        }

        const videoID = link.href.replace(/(.+)(#)(.+)/, '$3');
        const video = document.getElementById('video-' + videoID);

        video.addEventListener('timeupdate', onTimeUpdate.bind(this, event, link, video));
        link.addEventListener('mouseenter', onMouseEnter.bind(this, event, link, video));
        link.addEventListener('mouseleave', onMouseLeave.bind(this, event, link, video));
        link.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            toggleVideoPlayback(video);
        });
    });
};

function initVideoProgressInContainer(id) {
    const container = document.getElementById(id);
    if (!container) return;
    const video = container.querySelector('video');
    video.addEventListener('timeupdate', onTimeUpdate.bind(this, event, container, video));
};

function pauseVideoPlayback(video) {
    if (typeof video !== "undefined") {
        video.pause();
    }
};

function toggleVideoPlayback(video, playButtonEl) {
    if (video.paused) {
        const id = video.id.replace('video-', '');
        const playButtonEl = document.querySelector(`a[href="#${id}"] .playButton`)
        if (playButtonEl) {
            playButtonEl.classList.add("playButton_loading");
        }
        video.wasPlayed = true;
        video.play();
    } else {
        video.wasPlayed = false;
        video.pause();
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
                video.poster = video.poster.replace(/(dark|light)/, themeName);
                video.src = video.src.replace(/(dark|light)/, themeName);
                video.wasPlayed = false;
            });
        });
    });

    // Videos pre-loading indication
    forEach.call(document.querySelectorAll("video"), video => {
        const id = video.id;
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

        video.addEventListener('progress', event => {
            const videoEl = event.target;
            if (videoEl.buffered && videoEl.buffered.length) {
                const amount = videoEl.buffered.end(0) / videoEl.duration
                if (bufferedProgressEl) {
                    bufferedProgressEl.style.strokeDashoffset = CIRCLE_LENGTH * (1 - amount);
                }
            }
        });

        video.addEventListener('timeupdate', event => {
            const videoEl = event.target;
            const amount = (videoEl.currentTime / videoEl.duration);
            if (playedProgressEl) {
                playedProgressEl.style.strokeDashoffset = CIRCLE_LENGTH * (1 - amount);
            }
        });

        video.addEventListener('playing', () => {
            currentlyPlayingVideo = video;
            playButtonEl && playButtonEl.classList.remove("playButton_loading");
            playButtonEl && playButtonEl.classList.add("playButton_playing");
        });

        video.addEventListener('ended', () => {
            playButtonEl && playButtonEl.classList.remove("playButton_playing");
        });

        video.addEventListener('pause', () => {
            playButtonEl && playButtonEl.classList.remove("playButton_playing");
        });

        video.addEventListener('loadeddata', () => {
            playButtonEl && playButtonEl.classList.remove("playButton_loading");
        });

    });
});

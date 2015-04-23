require('../_sass/main.scss');

const CIRCLE_LENGTH = Math.PI * 45 * 2;
const forEach = Array.prototype.forEach;
let currentlyPlayingVideo;

let onMouseEnter = (event, el, videoEl) => {
    //console.log("Playing...");
    videoEl.classList.add("active");
    //typeof videoEl.play === "function" && videoEl.play();
};

let onMouseLeave = (event, el, videoEl) => {
    //console.log("Pausing...");
    videoEl.classList.remove("active");
    stopVideoPlayback(currentlyPlayingVideo);
    //typeof videoEl.pause === "function" && videoEl.pause();
    //videoEl.currentTime = 0; // Always go to the beginning
};

let onTimeUpdate = (event, el, videoEl) => {
    var playedPercent = (videoEl.currentTime / videoEl.duration) * 100;
    var progressEl = el.querySelector('.js-progress');
    if (progressEl) {
        progressEl.style.width = playedPercent + "%";
    }
};

let initTourForContainer = (id) => {
    var container = document.getElementById(id);

    if (!container) return;

    var items = container.querySelectorAll('.features__item');

    forEach.call(items, item => {
        if (!item.id) {
            return;
        }

        var name = item.id.split('-')[1];
        var video = document.getElementById('video-' + name);

        video.addEventListener('timeupdate', onTimeUpdate.bind(this, event, item, video));
        item.addEventListener('mouseenter', onMouseEnter.bind(this, event, item, video));
        item.addEventListener('mouseleave', onMouseLeave.bind(this, event, item, video));
    });
};

function initVideoProgressInContainer(id) {
    var container = document.getElementById(id);

    if (!container) return;

    var video = container.querySelector('video');

    video.addEventListener('timeupdate', onTimeUpdate.bind(this, event, container, video));
};

function stopVideoPlayback(video) {
    if (typeof video !== "undefined" && !video.paused) {
        video.pause();
        video.currentTime = 0;
    }
};

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
        });
    });

    // Videos pre-loading indication
    forEach.call(document.querySelectorAll("video"), video => {
        const id = video.id;
        const playButtonEl = document.querySelector(`.playButton[data-video=${id}]`);
        const bufferedProgressEl = playButtonEl ? playButtonEl.querySelector('.playButton__progress_buffer') : null;
        const playedProgressEl = playButtonEl ? playButtonEl.querySelector('.playButton__progress_time') : null;

        playButtonEl && playButtonEl.addEventListener('click', () => {
            // Stop currently playing video
            if (video !== currentlyPlayingVideo) {
                stopVideoPlayback(currentlyPlayingVideo);
            }

            if (video.paused) {
                video.play();
                currentlyPlayingVideo = video;
            } else {
                video.pause();
            }
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
            playButtonEl && playButtonEl.classList.add("playButton_playing");
        });

        video.addEventListener('ended', () => {
            playButtonEl && playButtonEl.classList.remove("playButton_playing");
        });

        video.addEventListener('pause', () => {
            playButtonEl && playButtonEl.classList.remove("playButton_playing");
        });

    });
});

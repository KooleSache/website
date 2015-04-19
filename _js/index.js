require('../_sass/main.scss');

var forEach = Array.prototype.forEach;

var onMouseEnter = function(event, el, videoEl) {
    console.log("Playing...");
    videoEl.classList.add("active");
    typeof videoEl.play === "function" && videoEl.play();
};

var onMouseLeave = function(event, el, videoEl) {
    console.log("Pausing...");
    videoEl.classList.remove("active");
    typeof videoEl.pause === "function" && videoEl.pause();
    videoEl.currentTime = 0; // Always go to the beginning
};

var onTimeUpdate = function(event, el, videoEl) {
    var playedPercent = (videoEl.currentTime / videoEl.duration) * 100 ;
    var progressEl = el.querySelector('.js-progress')
    if (progressEl != null) {
        progressEl.style.width = playedPercent + "%";
    }
};

var initTourForContainer = (id) => {
    var container = document.getElementById(id);

    if (!container) return;

    var items = container.querySelectorAll('.features__item');

    forEach.call(items, item => {
        if (!item.id) {
            return;
        }

        var name = item.id.split('-')[1];
        var video = document.getElementById('video-' + name);

        video.addEventListener('progress',()=>{
            if (this.buffered.length) {
                console.log("Loading...", this.buffered.end(0) / this.duration);
            }
        });

        video.addEventListener('timeupdate', onTimeUpdate.bind(this, event, item, video));
        item.addEventListener('mouseenter', onMouseEnter.bind(this, event, item, video));
        item.addEventListener('mouseleave', onMouseLeave.bind(this, event, item, video));
    });
};

var initVideoProgressInContainer = (id) => {
    var container = document.getElementById(id);

    if (!container) return;

    var video = container.querySelector('video');

    video.addEventListener('progress',()=>{
        if (this.buffered.length) {
            console.log("Loading...", this.buffered.end(0) / this.duration);
        }
    });

    video.addEventListener('timeupdate', onTimeUpdate.bind(this, event, container, video));
};

document.addEventListener("DOMContentLoaded", ()=>{
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
});

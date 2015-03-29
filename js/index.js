var forEach = Array.prototype.forEach;

var onMouseEnter = function(event, el, videoEl) {
    console.log("Playing...");
    videoEl.classList.add("active");
    videoEl.play()
};

var onMouseLeave = function(event, el, videoEl) {
    console.log("Pausing...");
    videoEl.classList.remove("active");
    videoEl.pause()
};

var onTimeUpdate = function(event, el, videoEl) {
    var playedPercent = (videoEl.currentTime / videoEl.duration) * 100 ;
    var progressEl = el.querySelector('.features__progress')
    if (progressEl != null) {
        progressEl.style.width = playedPercent + "%";
    }
};

var initTourForContainer = function(id) {
    var container = document.getElementById(id);
    var items = container.querySelectorAll('.features__item');


    forEach.call(items, function(item){
        if (!item.id) {
            return;
        }

        var name = item.id.split('-')[1];
        var video = document.getElementById('video-' + name);

        video.addEventListener('progress',function() {
            if (this.buffered.length) {
                console.log("Loading...", this.buffered.end(0) / this.duration);
            }
        });

        video.addEventListener('timeupdate', onTimeUpdate.bind(this, event, item, video));

        item.addEventListener('mouseenter', onMouseEnter.bind(this, event, item, video));
        item.addEventListener('mouseleave', onMouseLeave.bind(this, event, item, video));
    });
};

document.addEventListener("DOMContentLoaded", function () {
    initTourForContainer('loupeTour');
    initTourForContainer('overlayTour');
});

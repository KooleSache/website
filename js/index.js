var forEach = Array.prototype.forEach;

var onMouseEnter = function(event, el, videoEl) {
    console.log("Playing...");
    var timeRanges = videoEl.played
    if (timeRanges.length === 1) {
        console.log(timeRanges.start(0));
        console.log(timeRanges.end(0));
    }
    videoEl.play()
};

var onMouseLeave = function(event, el, videoEl) {
    console.log("Pausing...");
    videoEl.pause()
};

var initTourForContainer = function(id) {
    var container = document.getElementById(id);
    var video = container.querySelector('video');
    var items = container.querySelectorAll('.features__item');

    forEach.call(items, function(item){
        item.addEventListener('mouseenter', onMouseEnter.bind(this, event, item, video));
        item.addEventListener('mouseleave', onMouseLeave.bind(this, event, item, video));
    });
};

document.addEventListener("DOMContentLoaded", function () {
    initTourForContainer('loupeTour');
    initTourForContainer('overlayTour');
});

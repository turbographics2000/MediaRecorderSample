var stream = null;
var recordChunks = null;
var recorder = null;
var codecType = null;
var recBtns = document.querySelectorAll('.recbtn');

navigator.mediaDevices.getUserMedia({video: true, audio:false}).then(gumStream => {
    stream = gumStream;
    gumPreview.srcObject = stream;
    recBtns.forEach(btn => btn.disabled = false);
});


function handleDataAvailable(event) {
    recordChunks.push(event.data);
}

function rec(recType) {
    codecType = recType;
    recordChunks = [];
    recorder = new MediaRecorder(stream, {mimeType: `video/webm; codecs=${recType}`});
    recBtns.forEach(btn => btn.disabled = true);
    recStop.disabled = false;
    dl.disabled = true;
    msg.textContent = recType + 'で録画中';
    msg.style.display = '';
    recorder.ondataavailable = handleDataAvailable;
    recorder.start();
}

recVP8.onclick = function() {
    rec('vp8');
}
recVP9.onclick = function() {
    rec('vp9');
}
recH264.onclick = function() {
    rec('h264');
}

recStop.onclick = function() {
    recBtns.forEach(btn => btn.disabled = false);
    recorder.stop();
    recorder = null;
    recStop.disabled = true;
    msg.style.display = 'none';
    var blob = new Blob(recordChunks, {type: 'video/webm'});
    var url = null;
    if(recPreview.src) {
        url = recPreview.src;
        recPreview.stop();
        recPreview.src = null;
        URL.revokeURL(url);
        url = null;
    }
    var url = URL.createObjectURL(blob);
    recPreview.src = url;
    if(recordChunks && recordChunks.length) dl.disabled = false;
}

dl.onclick = function () {
  var blob = new Blob(recordChunks, {type: 'video/webm'});
  var url = URL.createObjectURL(blob);
    
  var a = document.createElement('a');
  //a.style.display = 'none';
  a.href = url;
  a.download = codecType + '.webm';
  //document.body.appendChild(a);
  a.click();
}

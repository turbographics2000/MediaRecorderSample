var stream = null;
var recordChunks = null;
var recorder = null;
var codecType = null;

navigator.mediaDevices.getUserMedia({video: true, audio:false}).then(gumStream => {
    stream = gumStream;
    document.querySelectorAll('recbtn').forEach(btn => btn.disabled = false);
});


function handleDataAvailable(event) {
    recordChunks.push(event.data);
}

function rec(recType) {
    codecType = recType;
    recordChunks = [];
    recorder = new MediaRecorder(stream, {mimeType: `video/webm; codecs=${recType}`});
    document.querySelectorAll('recbtn').forEach(btn => btn.disabled = true);
    recStop.disabled = false;
    dl.disabled = true;
    msg.textContent = recType + 'で録画中';
    msg.style.display = '';
    recorder.ondataavailable = handleDataAvailable;
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
    document.querySelectorAll('recbtn').forEach(btn => btn.disabled = false);
    recorder.stop();
    recorder = null;
    recStop.disabled = true;
    msg.style.display = 'none';
    if(recordChunks && recordChunks.length) dl.disabled = false;
}

function download() {
  var blob = new Blob(recordChunks, {type: 'video/webm'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  //a.style.display = 'none';
  a.href = url;
  a.download = codecType + '.webm';
  //document.body.appendChild(a);
  a.click();
}

var stream = null;
var recordChunks = null;
var recorder = null;
var fileName = null;
var recBtns = Array.from(document.querySelectorAll('.recbtn'));
var audioContext = new (window.AudioContext || window.webKitAudioContext)();
var mediaStreamSource = null;
var audioProcessor = null;

gumPreview.volume = 0;

var audioContainerTypes = ['webm', 'ogg'];
var videoContainerTypes = ['webm', 'mp4'];
var audioCodecs = [
    'opus', 
    'vorbis', 
    'aac', 
    'opus,vorbis',
    'vorbis,opus',
    'opus,aac',
    'aac,opus',
    'vorbis,aac',
    'aac,vorbis',
    'opus,vorbis,aac',
    'vorbis,opus,aac',
    'vorbis,aac,opus',
    'aac,opus,vorbis',
    'aac,vorbis,opus'
];
audioCodecs.reverse();
var videoCodecs = [
    'vp8', 
    'vp9', 
    'h264', 
    'vp8,vp9', 
    'vp9,vp8', 
    'vp8,h264', 
    'h264,vp8', 
    'vp9,h264',
    'h264,vp9', 
    'vp8,vp9,h264',
    'vp9,vp8,h264',
    'vp9,h264,vp8', 
    'h264,vp8,vp9', 
    'h264,vp9,vp8'
];
videoCodecs.reverse();
var avCodecs = videoCodecs.concat(audioCodecs);
videoCodecs.forEach(vc => {
    audioCodecs.forEach(ac => {
        avCodecs.push(vc + ',' + ac);
    });
});
function createButton(title, category, containerTypes, codecs, video, audio) {
    containerTypes.forEach(containerType => {
        var rowDisplay = 'none';
        var tr = document.createElement('tr');
        var tdTitle = document.createElement('td');
        var mimeType = category + '/' + containerType;
        tdTitle.textContent = `${title} (MIMEType=${mimeType})`;
        var tdButtons = document.createElement('td');
        codecs.forEach(codec => {
            var btn = document.createElement('button');
            btn.textContent = codec;
            btn.dataset.video = +video;
            btn.dataset.audio = +audio;
            btn.classList.add('recbtn');
            btn.dataset.mimeType = `${mimeType}; codecs=${codec}`;
            if(!MediaRecorder.isTypeSupported(btn.dataset.mimeType)) {
                btn.classList.add('notsupported');
                tdButtons.appendChild(btn);
            } else {
                tdButtons.insertBefore(btn, tdButtons.firstChild);
                btn.onclick = recButtonClick;
                rowDisplay = '';
            }
        });
        var btnNoCodecType = document.createElement('button');
        btnNoCodecType.dataset.mimeType = mimeType;
        btnNoCodecType.dataset.video = +video;
        btnNoCodecType.dataset.audio = +audio;
        if(!MediaRecorder.isTypeSupported(mimeType)) {
            btnNoCodecType.classList.add('notsupported');
            tdButtons.appendChild(btnNoCodecType);
        } else {
            tdButtons.insertBefore(btnNoCodecType, tdButtons.firstChild);
            btnNoCodecType.onclick = recButtonClick;
            rowDisplay = '';
        }
        btnNoCodecType.classList.add('recbtn');
        btnNoCodecType.textContent = 'codec指定なし';
        tr.appendChild(tdTitle);
        tr.appendChild(tdButtons);
        tr.style.display = rowDisplay;
        recButtonsTable.appendChild(tr);
    });
}
createButton('音声のみ', 'audio', audioContainerTypes, audioCodecs, false, true);
createButton('映像のみ', 'video', videoContainerTypes, videoCodecs, true, false);
createButton('両方', 'video', videoContainerTypes, avCodecs, true, true);

function gum(video, audio) {
    if(audio && window.chrome) {
        audio = {
            echoCancellation: false
        };
    }
    return navigator.mediaDevices.getUserMedia({video: video, audio: audio})
        .then(gumStream => {
            stream = gumStream;
            var audioTracks = stream.getAudioTracks();
            // if(audioTracks.length) {
            //     mediaStreamSource = audioContext.createMediaStreamSource(stream);
            //     audioProcessor = audioContext.createScriptProcessor(512);
            //     audioProcessor.onaudioprocess = function(evt) {
            //         for(var i = 0; i < 2; i++) {
            //             var buf = evt.inputBuffer.getChannelData(i);
            //             var maxVal = 0;
            //             for (var j = 0, l = buf.length; j < l; j++) {
            //                 maxVal = Math.max(maxVal, buf[j]);
            //             }
            //             window['audioMeter' + i].style.width = Math.min(~~(maxVal * 100), 100) + '%';
            //         }
            //     }
            //     mediaStreamSource.connect(audioProcessor);
            //     audioProcessor.connect(audioContext.destination);
            // }
            gumPreview.srcObject = stream;
            recBtns.forEach(btn => btn.disabled = false);
        });
}

function handleDataAvailable(event) {
    recordChunks.push(event.data);
}

function recButtonClick(evt) {
    var video = !!+this.dataset.video;
    var audio = !!+this.dataset.audio;
    var mimeType = this.dataset.mimeType;
    gum(video, audio).then(_ => {
        rec(mimeType);
    });
}

function rec(mimeType) {
    fileName = mimeType.replace('_', '');
    recordChunks = [];
    recordFileInfo.style.display = dl.style.display = 'none';
    recordFileInfoBody.innerHTML = '';
    msg.classList.add('animate');
    console.log('mimeType', mimeType);
    var isTypeSupported = MediaRecorder.isTypeSupported(mimeType);
    recorder = new MediaRecorder(stream, {mimeType: mimeType});
    recBtns.forEach(btn => btn.disabled = true);
    recStop.disabled = false;
    dl.disabled = true;
    msg.textContent = mimeType + '　で録画中';
    recorder.ondataavailable = handleDataAvailable;
    recorder.start();
}

recStop.onclick = function() {
    recBtns.forEach(btn => btn.disabled = false);
    recorder.stop();
    recorder = null;
    recStop.disabled = true;
    for(var track of stream.getTracks()) {
        track.stop();
    }
    var blob = new Blob(recordChunks, {type: 'video/webm'});
    var fr = new FileReader();
    fr.onload = function(evt) {
        parseFile(evt.target.result);
        recordFileInfo.style.display = dl.style.display = '';
    }
    fr.readAsArrayBuffer(blob);
    var url = null;
    if(recPreview.src) {
        url = recPreview.src;
        recPreview.src = null;
        URL.revokeObjectURL(url);
        url = null;
    }
    url = URL.createObjectURL(blob);
    recPreview.src = url;
    msg.classList.remove('animate');
    if(recordChunks && recordChunks.length) dl.disabled = false;
}

dl.onclick = function () {
  var blob = new Blob(recordChunks, {type: 'video/webm'});
  var url = URL.createObjectURL(blob);
    
  var a = document.createElement('a');
  a.href = url;
  a.download = fileName + '.webm';
  a.click();
}


function parseFile(data) {
    var ui8a = new Uint8Array(data);
    var tableRow = function(title, value) {
        var tr = document.createElement('tr');
        var tdTitle = document.createElement('td');
        tdTitle.textContent = title;
        var tdValue = document.createElement('td');
        tdValue.textContent = value;
        tr.appendChild(tdTitle);
        tr.appendChild(tdValue);
        return tr.outerHTML;
    }
    var getMatroskaRow = function(elmName) {
        if(recordFileInfoBody[elmName]) {
            return tableRow(elmName, recordFileInfoBody[elmName].map(elm => elm.value).join(' + '));
        }
        return '';
    }
    if(ui8a[4] === 0x66 && ui8a[5] === 0x74 && ui8a[6] === 0x79 && ui8a[7] === 0x70) { // 'ftyp'
        // MP4コンテナ
    } else {
        var [result, resultNameClassify] = parseMKV(data);
        recordFileInfoBody.innerHTML = [
            tableRow('コンテナタイプ', 'Matroska'),
            getMatroskaRow('DocType'),
            getMatroskaRow('CodecID'),
            getMatroskaRow('PixelWidth'),
            getMatroskaRow('PixelHeight'),
            getMatroskaRow('DisplayWidth'),
            getMatroskaRow('DisplayHeight'),
            getMatroskaRow('StereoMode'),
            getMatroskaRow('AlphaMode'),
            getMatroskaRow('SamplingFrequency'),
            getMatroskaRow('OutputSamplingFrequency'),
            getMatroskaRow('Channels'),
            getMatroskaRow('BitDepth')
        ].join('');
    }
}


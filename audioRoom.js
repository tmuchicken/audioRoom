/*
更新日時
2018/11/28/14:34

感謝のURL
https://github.com/skyway/skyway-js-sdk/blob/master/examples/p2p-broadcast/script.js
https://qiita.com/yusuke84/items/54dce88f9e896903e64f#step3-1
*/

'use strict';

$(function(){ //やる意味あるらしいけどエラー出ねぇから嫌いやわ

    //audio処理用
    window.AudioContext = window.AudioContext || window.webkitAudioContext; 
    
    let localStream = null;
    let peer = null;
    let existingCall = null;
    let remoteStream = null;
    let recorder = null;
    let audioSelect = $('#audioSource');

    function stopVideo() {
        localVideo.pause();
        location.reload(true);
        if (localVideo.srcObject) {
          localVideo.srcObject = null;
        }
        else {
          localVideo.src = "";
        }
      
        if (localStream) {
         stopStream(localStream);
         localStream = null;
        }
    }

    navigator.mediaDevices.enumerateDevices()
        .then(function(deviceInfos) {
            for (let i = 0; i !== deviceInfos.length; ++i) {
                let deviceInfo = deviceInfos[i];
                let option = $('<option>');
                option.val(deviceInfo.deviceId);
                if (deviceInfo.kind === 'audioinput') {
                    option.text(deviceInfo.label);
                    audioSelect.append(option);
                } else if (deviceInfo.kind === 'videoinput') {
                    option.text(deviceInfo.label);
                                    }
            }
            
        }).catch(function (error) {
            console.error('mediaDevices.enumerateDevices() error:', error);
            return;
        });

    $('#peerid-ui').hide();
    peer = new Peer(/*id,*/{
            key: '9373b614-604f-4fd5-b96a-919b20a7c24e',    //APIkey
            debug: 3
    });

    function startSelectedVideoAudio(sound)  {
        let audioSource = $('#audioSource').val();
        //let videoSource = $('#videoSource').val();
        let constraints = {
            audio: {deviceId: {exact: audioSource},
            echoCancellation:false},
        };

        if(localStream){
            localStream = null;
        }

        navigator.mediaDevices.getUserMedia(constraints)
            .then(function (stream) {
                //$('#myStream').get(0).srcObject = stream;  //とりあえず消した
 
                //AudioContextを作成
                var context  = new AudioContext();
                //sourceの作成
                var source = context.createMediaStreamSource(stream);
                //panner の作成
                var panner = context.createPanner();
                panner.panningModel = 'HRTF';
                source.connect(panner);
                //StereoPannerの作成
                var StereoPanner = context.createStereoPanner();
                panner.connect(StereoPanner);
                StereoPanner.pan.value = sound;
              
                //peer1の作成
                var peer1 = context.createMediaStreamDestination();
            
                StereoPanner.connect(peer1); //ココの先頭変えるよ
                localStream = peer1.stream;


                if(existingCall){
                    existingCall.replaceStream(stream);
                }

            }).catch(function (error) {
            console.error('mediaDevice.getUserMedia() error:', error);
            return;
        });
    };

    peer.on('open', function(){
        $('#my-id').text(peer.id);
    });

    peer.on('error', function(err){
        alert(err.message);
    });

    $('#make-call').submit(function(e){
        e.preventDefault();
        let roomName = $('#join-room').val();
        if (!roomName) {
            return;
        }
        const　call = peer.joinRoom(roomName, {mode: 'sfu', stream: localStream});
        setupCallEventHandlers(call);
    });

    $('#end-call').click(function(){
        existingCall.close();
    });

    $('#recording button').click(function(){
        if(recorder){
            recorder.stop();
            $('#recording button').text('Recording');
            $('#downloadlink').hide();
        }else if(remoteStream){
            let chunks = [];
            let options = {
                mimeType : 'video/webm; codecs=vp9'
            };

            recorder = new MediaRecorder(remoteStream,options);

            recorder.ondataavailable = function(evt) {
                console.log("data available: evt.data.type=" + evt.data.type + " size=" + evt.data.size);
                chunks.push(evt.data);
            };

            recorder.onstop = function(evt) {
                console.log('recorder.onstop(), so playback');
                recorder = null;
                const videoBlob = new Blob(chunks, { type: "video/webm" });
                blobUrl = window.URL.createObjectURL(videoBlob);
                $('#downloadlink').attr("download", 'recorded.webm');
                $('#downloadlink').attr("href", blobUrl);
                $('#downloadlink').show();
            };
            recorder.start(1000);
            console.log('start recording');
            $('#recording button').text('Stop');
            $('#downloadlink').hide();
        }
    });

       //オーディオシステムの選択
    $('#start_video_button_L').click(function () {
        startSelectedVideoAudio(-1);
    });

    $('#start_video_button_R').click(function () {
        startSelectedVideoAudio(1);
    });

    $('#start_video_button_W').click(function () {
      startSelectedVideoAudio(0);
    });

    function setupCallEventHandlers(call){
        if (existingCall) {
            existingCall.close();
        };

        existingCall = call;
        setupEndCallUI();
        $('#room-id').text(call.name);

        call.on('stream', function(stream){
            addVideo(stream);
            remoteStream = stream;
        });

        call.on('removeStream', function(stream){
            removeVideo(stream.peerId);
        });

        call.on('peerLeave', function(peerId){
            removeVideo(peerId);
        });

        call.on('close', function(){
            removeAllRemoteVideos();
            setupMakeCallUI();
        });

    }

    function addVideo(stream){
        const videoDom = $('<video autoplay>');
        videoDom.attr('id',stream.peerId);
        videoDom.get(0).srcObject = stream;
        $('.videosContainer').append(videoDom);
    }

    function removeVideo(peerId){
        $('#'+peerId).remove();
    }

    function removeAllRemoteVideos(){
        $('.videosContainer').empty();
    }

    function setupMakeCallUI(){
        $('#make-call').show();
        $('#end-call').hide();
        $('#recording').hide();
    }

    function setupEndCallUI() {
        $('#make-call').hide();
        $('#end-call').show();
        $('#recording').show();
    }

});
/**
 * Created by lica on 8/31/2016.
 */
var Scanner = function (options) {
    if (!options) {
        throw 'Scanner constructor: missing arguments';
    }
    if (!options.video) {
        throw 'Scanner constructor: missing arguments video';
    }
    if (!options.canvas) {
        throw 'Scanner constructor: missing arguments canvas';
    }
    this.canvas = options.canvas;
    this.video = options.video;
    this.context = this.canvas.getContext('2d');
    this.localMediaStream = null;
    this.stream = null;
    this.scannerId = 0;

    this.constraints = function (sourceId) {
        return {
            video: {
                mandatory: {
                    //maxAspectRatio
                    //minAspectRatio
                    //maxWidth
                    //minWidth
                    //maxHeight
                    //minHeight
                    //maxFrameRate
                    //minFrameRate
                    //maxFrameRate:
                    minFrameRate: 24,
                    maxFrameRate: 24,
                    minWidth: this.video.width,
                    maxWidth: this.video.width,
                    minHeight: this.video.height,
                    maxHeight: this.video.height
                },
                optional: [{
                    sourceId: sourceId
                }]
            }
        }
    }

    window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
}

Scanner.prototype = {
    onStart: function (scanSuccess, scanError, videoError) {

        var $scanner = this;

        navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

        function gotDevices(deviceInfos) {
            for (var i = deviceInfos.length - 1; i >= 0; i--) {
                if (deviceInfos[i].kind === 'videoinput') {
                    if (navigator.getUserMedia) {
                        navigator.getUserMedia(
                            $scanner.constraints(deviceInfos[i].id),
                            successCallback.bind($scanner),
                            function (error) {
                                videoError(error, $scanner.localMediaStream);
                            }
                        );
                    } else {
                        console.log('Native web camera streaming (getUserMedia) not supported in this browser.');
                    }
                    return;
                }
            }
        }

        var successCallback = function (stream) {
            $scanner.video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
            $scanner.localMediaStream = stream;
            $scanner.stream = stream;
            $scanner.video.play();
            setTimeout(scan.bind($scanner), 1000);
        }

        var scan = function () {
            if ($scanner.localMediaStream) {
                $scanner.context.drawImage($scanner.video, 0, 0, $scanner.canvas.width, $scanner.canvas.height);
                var imgData = $scanner.context.getImageData(0, 0, $scanner.canvas.width, $scanner.canvas.height);
                desaturateImg(imgData);
                $scanner.context.putImageData(imgData, 0, 0);
                try {
                    qrcode.decode();
                } catch (e) {
                    scanError(e, $scanner.localMediaStream);
                }
                $scanner.scannerId = setTimeout(scan.bind($scanner), 500);
            } else {
                $scanner.scannerId = setTimeout(scan.bind($scanner), 500);
            }
        }

        function desaturateImg(imgData) {
            for (var i = 0; i < imgData.data.length; i += 4) {
                var myRed = imgData.data[i]; // First bytes are red bytes.
                var myGreen = imgData.data[i + 1]; // Second bytes are green bytes.
                var myBlue = imgData.data[i + 2]; // Third bytes are blue bytes.
                // Fourth bytes are alpha bytes

                myGray = parseInt((myRed + myGreen + myBlue) / 3); // Make it an integer.
                // Assign average to red, green, and blue.
                myGray = myGray > 127 ? 255 : myGray;
                imgData.data[i] = myGray;
                imgData.data[i + 1] = myGray;
                imgData.data[i + 2] = myGray;
            }
        }

        qrcode.callback = function (result) {
            scanSuccess(result, $scanner.localMediaStream);
        }

        function handleError(error) {
            console.log('navigator.getUserMedia error: ', error);
        }

    },

    onStop: function () {
        $scanner.stream.getVideoTracks().forEach(function (videoTrack) {
            videoTrack.stop();
        });
        clearTimeout($scanner.scannerId);
    }

}
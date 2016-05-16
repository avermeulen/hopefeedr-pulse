var listenForSpeech = function(cb) {

    if (!('webkitSpeechRecognition' in window)) {
        cb('Speech API not supported here…', null);

    } else { //Let’s do some cool stuff :)
        var recognition = new webkitSpeechRecognition(); //That is the object that will manage our whole recognition process.
        recognition.continuous = true; //Suitable for dictation.
        recognition.interimResults = true; //If we want to start receiving results even if they are not final.
        //Define some more additional parameters for the recognition:
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1; //Since from our experience, the highest result is really the best...

        recognition.onstart = function() {
            console.log('Listening...')
        };

        recognition.onspeechstart = function() {
            console.log('Speech has been detected');
        };

        recognition.onspeechend = function() {
            console.log('Speech has stopped being detected');
        };

        recognition.onsoundstart = function() {
            console.log('Some sound is being received');
        };

        recognition.onsoundend = function() {
            console.log('Sound has stopped being received');
        };

        recognition.onresult = function(event) { //the event holds the results
            //Yay – we have results! Let’s check if they are defined and if final or not:
            if (typeof(event.results) === 'undefined') { //Something is wrong…
                recognition.stop();
                return;
            }

            for (var i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) { //Final results
                    console.log("final results: " + event.results[i][0].transcript); //Of course – here is the place to do useful things with the results.
                    var results = event.results[i][0].transcript;

                    setTimeout(function() {
                        cb(null, results);
                    }, 0);

                    //console.log(results);

                } //end for loop
            };

        };

        recognition.start();

    }
};

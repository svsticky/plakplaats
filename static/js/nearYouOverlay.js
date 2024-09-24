// This is a popup in the middle of the screen: 
// var Overlay = L.Class.extend({
//     // this is the constructor
//     initialize: function (selector, options) {
//         L.Util.setOptions(this, options);
//         this._selector = selector;
        
//         // create overlay here
//         this._overlayElement = document.createElement('div');
//         this._overlayElement.id = 'overlay';
//         this._overlayElement.style.position = 'fixed';
//         this._overlayElement.style.top = '25%';
//         this._overlayElement.style.left = '25%';
//         this._overlayElement.style.width = '50%';
//         this._overlayElement.style.height = '50%';
//         this._overlayElement.style.backgroundColor = this.options.background;
//         this._overlayElement.style.opacity = '0';
//         this._overlayElement.style.transition = 'opacity 0.3s';
//         this._overlayElement.style.zIndex = '-1';
//         this._overlayElement.style.display = 'flex';
//         this._overlayElement.style.alignItems = 'center';
//         this._overlayElement.style.justifyContent = 'center';
//         document.body.appendChild(this._overlayElement);
//     },
  
//     // these are the default options
//     options: {
//         isActive: false,
//         background: 'rgba(0, 0, 0, 1)',
//     },
  
//     // this is a public function
//     toggle: function () {
//         this.isActive = !this.isActive;
//         if (this.isActive) {
//             this._overlayElement.style.opacity = '1';
//             this._overlayElement.style.zIndex = '999';
//         } else {
//             this._overlayElement.style.opacity = '0';
//             this._overlayElement.style.zIndex = '-1';
//         }
//     },
// });

// var overlay = new Overlay('#overlay', { background: 'rgba(0, 0, 0, 1)' });

// nearYouButton.addEventListener('click', function(){
//     console.log("near you clicked!");
//     overlay.toggle();
// });

// nearYouMobileOverlay = document.createElement('div');
// nearYouMobileOverlay.id = 'nearYouMobileOverlay';
// document.body.appendChild(nearYouMobileOverlay);

// Google maps style upwards drag overlay
var Overlay = L.Class.extend({
    // this is the constructor
    initialize: function (selector, options) {
        L.Util.setOptions(this, options);
        this._selector = selector;
        this._dragStartY = 0;
        this._overlayHeight = 0;
        
        this._overlayElement = document.createElement('div');
        this._overlayElement.id = 'nearYouMobileOverlay';

        this._line = document.createElement('img');
        this._line.id = 'nearYouMobileLine';
        this._line.src = "./static/img/line.svg";
        this._overlayElement.appendChild(this._line);

        this._nearYouTopText = document.createElement('h1');
        this._nearYouTopText.id = 'nearYouMobileTopText';
        this._nearYouTopTextText = document.createTextNode("Stickers near you");
        this._nearYouTopText.appendChild(this._nearYouTopTextText);
        this._overlayElement.appendChild(this._nearYouTopText);

        for (let i = 0; i < 10; i++) {
            this.createStickerDiv(i);
        }

        document.body.appendChild(this._overlayElement);
        
        var self = this;
        this._overlayElement.addEventListener('touchstart', function(e) {
            self._dragStartY = e.touches[0].clientY;
            self._overlayHeight = self._overlayElement.clientHeight;
        });
        
        this._overlayElement.addEventListener('touchmove', function(e) {
            var deltaY = e.touches[0].clientY - self._dragStartY;
            var newBottom = Math.max(-self._overlayHeight * 0.8, -deltaY); // Limit to 80% below
            self._overlayElement.style.bottom = newBottom + 'px';
            if (self._overlayElement.scrollHeight - self._overlayElement.scrollTop === self._overlayElement.clientHeight) {
                e.preventDefault(); // Prevent further scrolling
            }
        });
        
        this._overlayElement.addEventListener('touchend', function(e) {
            var snapThreshold = -self._overlayHeight * 0.3; // Snap when dragged beyond 30% of the overlay height

            // Under threshold -> snap back to the bottom
            if (parseInt(self._overlayElement.style.bottom) < snapThreshold) {
                self.closeOverlay();
            }
            // Above threshold -> reveal the overlay 
            else {
                self.openOverlay();
            }
        });
    },
  
    // Default options
    options: {
        isActive: false,
    },
    
    createStickerDiv: function (i) {
        stickerDiv = document.createElement('div');
        stickerDiv.id = `stickerDiv-${i}`;
        stickerDiv.classList.add('stickerDiv');
        
        stickerDivH1 = document.createElement('h1');
        stickerDivH1.id = `stickerDivH1-${i}`;
        stickerDivH1.classList.add('stickerDivH1');
        stickerDivH1Text = document.createTextNode(`stickerDivH1-${i}`);
        stickerDivH1.appendChild(stickerDivH1Text);
        stickerDiv.appendChild(stickerDivH1);

        stickerDivUser = document.createElement('h3');
        stickerDivUser.id = `stickerDivUser-${i}`;
        stickerDivUser.classList.add('stickerDivUser');
        stickerDivUserText = document.createTextNode(`Sticked by ???`);
        stickerDivUser.appendChild(stickerDivUserText);
        stickerDiv.appendChild(stickerDivUser);

        stickerImg = document.createElement('img');
        stickerImg.id = `stickerDivImg-${i}`;
        stickerImg.classList.add('stickerDivImg');
        stickerImg.src = "";
        stickerDiv.appendChild(stickerImg);

        stickerDivDate = document.createElement('h3');
        stickerDivDate.id = `stickerDivDate-${i}`;
        stickerDivDate.classList.add('stickerDivDate');
        stickerDivDateText = document.createTextNode(`Posted ???`);
        stickerDivDate.appendChild(stickerDivDateText);
        stickerDiv.appendChild(stickerDivDate);

        stickerDivNearby = document.createElement('h3');
        stickerDivNearby.id = `stickerDivNearby-${i}`;
        stickerDivNearby.classList.add('stickerDivNearby');
        stickerDivNearbyText = document.createTextNode(`Nearby ???`);
        stickerDivNearby.appendChild(stickerDivNearbyText);
        stickerDiv.appendChild(stickerDivNearby);

        stickerDivButton = document.createElement("button");
        stickerDivButton.id = `stickerDivButton-${i}`;
        stickerDivButton.classList.add('stickerDivButton');
        stickerDivButton.innerHTML = "Open on map";
        stickerDiv.appendChild(stickerDivButton);

        this._overlayElement.appendChild(stickerDiv);
    },

    openOverlay: function () {
        this.isActive = !this.isActive;
        this._overlayElement.style.bottom = '0';
        this._overlayElement.style.borderRadius = '0px 0px 0px 0px';
        this._overlayElement.style.overflowY = 'auto';
        this._line.style.display = 'none';
        this.getNearYouData();
    },

    closeOverlay: function () {
        this.isActive = !this.isActive;
        this._overlayElement.style.bottom = '-90%';
        this._overlayElement.style.borderRadius = '15px 15px 0px 0px';
        this._overlayElement.style.overflowY = 'hidden';
        this._overlayElement.scrollTo(0, 0);
        this._line.style.display = 'block';
        let stickerDivs = document.querySelectorAll('.stickerDiv');
        stickerDivs.forEach(function(stickerDiv) {
            stickerDiv.classList.remove('revealed');
        });
    },

    getNearYouData: function () {
        var self = this;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                self.requestDBStickers(position);
            }, showError);
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    },

    requestDBStickers: function (position) {
        var self = this;

        console.log("Your current position is:");
        console.log(`Latitude : ${position.coords.latitude}`);
        console.log(`Longitude: ${position.coords.longitude}`);

        if (!position.coords.latitude || !position.coords.longitude) {
            return;
        }

        var request = new XMLHttpRequest();

        var url = 'getNearYouStickers?';
        url += 'lon=' + position.coords.longitude;
        url += '&lat=' + position.coords.latitude;
        
        request.open('GET', url, true); 
        request.onreadystatechange = function(){
            if(this.readyState == 4){
                if(this.status == 200){
                    var results = JSON.parse(this.responseText);
                    let stickerDivs = document.querySelectorAll('.stickerDiv');
                    let stickerDivH1s = document.querySelectorAll('.stickerDivH1');
                    let stickerDivImgs = document.querySelectorAll('.stickerDivImg');
                    let stickerDivDates = document.querySelectorAll('.stickerDivDate');
                    let stickerDivButtons = document.querySelectorAll('.stickerDivButton');
                    let stickerDivNearbys = document.querySelectorAll('.stickerDivNearby');
                    
                    for(var i = 0; i < stickerDivH1s.length; i++) {
                        if (i < results.length) {
                            stickerDivH1s[i].textContent = `Sticker ${results[i][0]}`;
                            stickerDivImgs[i].src = results[i][4];
                            stickerDivDates[i].textContent = `Posted ${dayjs().to(dayjs(results[i][6]))}`

                            stickerDivButtons[i].dataset.id = results[i][0];
                            stickerDivButtons[i].dataset.lat = results[i][1];
                            stickerDivButtons[i].dataset.long = results[i][2];
                            stickerDivButtons[i].addEventListener('click', function(){
                                console.log("Button clicked!");
                                self.closeOverlay();
                                mymap.flyTo([this.getAttribute('data-lat'), this.getAttribute('data-long')], 18);
                                let stickerID = this.getAttribute('data-id');

                                // Recursive function to check if the pointer with the desired ID is present in the array
                                function checkPointerAndOpenPopup(stickerID) {
                                    for (var y = 0; y < pointersOnMap.length; y++) {
                                        if (stickerID == pointersOnMap[y].id) {
                                            pointersOnMap[y].pointer.openPopup();
                                            return; // Exit the function if the pointer is found
                                        }
                                    }
                                    // If the pointer is not found, schedule the function to run again after a short delay
                                    setTimeout(function() {
                                        checkPointerAndOpenPopup(stickerID);
                                    }, 100);
                                }
                                
                                // Call the recursive function to start checking for the pointer with the desired ID
                                checkPointerAndOpenPopup(stickerID);
                            });

                            // Load nearby text (estimated address)
                            var stickerDivNearby = stickerDivNearbys[i];
                            var addressRequest = new XMLHttpRequest();
                            addressRequest.onreadystatechange = function(){
                                if(this.readyState == 4 && this.status == 200){
                                    var addressJson = JSON.parse(addressRequest.responseText);
                                    console.log(addressJson);
                                    var text = "Nearby ";
                                    if(addressJson['address']['road'] != undefined){
                                        text += addressJson['address']['road'];
                                        if(addressJson['address']['house_number'] != undefined){
                                            text += ' ' + addressJson['address']['house_number'];
                                        }
                                    }
                                    console.log(text);
                                    stickerDivNearby.textContent = text;
                                } else {
                                    // Error handling for non-200 status codes
                                    
                                    console.error('Request failed with status code ' + this.status + ', readystate: ' + this.readyState);
                                }
                            }
                            console.log('https://nominatim.openstreetmap.org/reverse?lat=' + results[i][1] + '&lon=' + results[i][2] + '&format=json');
                            addressRequest.open("GET", 'https://nominatim.openstreetmap.org/reverse?lat=' + results[i][1] + '&lon=' + results[i][2] + '&format=json', true);
                            addressRequest.send();
                        }
                        else {
                            // Don't show the div if the amount of divs (10) > amount of stickers
                            stickerDivs[i].style.display = 'none';                 
                        }
                        // Show the divs
                        stickerDivs.forEach(function(stickerDiv, index) {
                            setTimeout(function() {
                                stickerDiv.classList.add('revealed');
                            }, index * 400);
                        });
                    }
                } else {
                    console.error('Error while loading near you stickers!');
                }
            }
        }
        request.send();
    },

    toggle: function () {
        this.isActive = !this.isActive;
        if (this.isActive) {
            this.openOverlay();
        } else {
            this.closeOverlay();
        }
    },
});

var overlay = new Overlay('#overlay');

// nearYouButton.addEventListener('click', function(){
//     console.log("near you clicked!");
//     overlay.toggle();
// });


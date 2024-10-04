// Google maps style upwards drag overlay
var Overlay = L.Class.extend({
    // Overylay constructor
    initialize: function (selector, options) {
        this.isActive = false;
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
        this._overlayElement.style.bottom = '0';
        this._overlayElement.style.borderRadius = '0px 0px 0px 0px';
        this._overlayElement.style.overflowY = 'auto';
        this._line.style.display = 'none';
        if (!this.isActive) {
            this.getNearYouData();
        }
        this.isActive = true;
    },

    closeOverlay: function () {
        this.isActive = false;
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
        // Get user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                // Use user location to request nearby stickers from database
                self.requestDBStickers(position);
            }, showError);
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    },

    // Request nearby stickers from database
    requestDBStickers: function (position) {
        var self = this;

        if (!position.coords.latitude || !position.coords.longitude) {
            throw new Error("Location couldn't be accessed");
        }

        let nearYouStickersDBUrl = `getNearYouStickers?lon=${position.coords.longitude}&lat=${position.coords.latitude}`;
        
        fetch(nearYouStickersDBUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error while fetching near you stickers from database');
                }
                return response.json();
            })
            .then(results => {
                this.processDBStickers(results);
            })
            .catch(error => {
                console.error(error.message);
            });
    },

    // Use database results to fill all stickers with content
    processDBStickers: function (results) {
        // Get sticker DOM elements
        let stickerDivs = document.querySelectorAll('.stickerDiv');
        let stickerDivH1s = document.querySelectorAll('.stickerDivH1');
        let stickerDivImgs = document.querySelectorAll('.stickerDivImg');
        let stickerDivDates = document.querySelectorAll('.stickerDivDate');
        let stickerDivButtons = document.querySelectorAll('.stickerDivButton');
        let stickerDivNearbys = document.querySelectorAll('.stickerDivNearby');

        // Iterate over sticker elements
        for (let i = 0; i < stickerDivH1s.length; i++) {
            if (i < results.length) {
                let stickerData = results[i];

                // Fill sticker with content
                this.renderSticker(stickerDivH1s[i], stickerDivImgs[i], stickerDivDates[i], stickerData);

                // Add the 'open on map' button click event
                this.addOpenOnmapClickListener(stickerDivButtons[i], stickerData[0], stickerData[1], stickerData[2]);

                // Fetch approximate address given the sticker coordinate
                this.fetchStickerAddress(stickerData[1], stickerData[2], stickerDivNearbys[i]);
            } else {
                // Hide the sticker div when there are more divs than stickers
                stickerDivs[i].style.display = 'none';
            }
        }

        // Show the near you stickers
        this.revealStickers(stickerDivs);
    },

    // Fills individual stickers with content
    renderSticker: function (stickerDivH1, stickerDivImg, stickerDivDate, stickerData) {
        let [stickerID, lat, long, logoID, pictureURL, email, postTime, spots, verified] = stickerData;

        stickerDivH1.textContent = `Sticker ${stickerID}`;
        stickerDivImg.src = pictureURL;
        stickerDivDate.textContent = `Posted ${dayjs().to(dayjs(postTime))}`;
    },

    // Add 'open on map' button event listener
    addOpenOnmapClickListener: function (stickerDivButton, stickerID, lat, long) {
        let self = this;
        stickerDivButton.dataset.id = stickerID;
        stickerDivButton.dataset.lat = lat;
        stickerDivButton.dataset.long = long;
    
        stickerDivButton.addEventListener('click', function () {
            let stickerID = this.getAttribute('data-id');
            let lat = this.getAttribute('data-lat');
            let long = this.getAttribute('data-long');
    
            self.handleOpenOnMapClick(stickerID, lat, long);
        });
    },

    handleOpenOnMapClick: function (stickerID, lat, long) {
        this.closeOverlay();
        mymap.flyTo([lat, long], 18);

        // Stickers are loaded in only when they're in you view
        // Therefore, when 'flying' to a sticker we need to 'find' it before we can open it
        // This recursive function checks whether the sticker is present, it not tries again later until it is present
        
        function checkPointerAndOpenPopup(stickerID) {
            for (let y = 0; y < pointersOnMap.length; y++) {
                if (stickerID == pointersOnMap[y].id) {
                    pointersOnMap[y].pointer.openPopup();
                    return; // Stop when the sticker is found and opened
                }
            }
            // When the sticker isn't found, try again after a small pause
            setTimeout(function () {
                checkPointerAndOpenPopup(stickerID);
            }, 100);
        }
    
        // Search for sticker on map and open it
        checkPointerAndOpenPopup(stickerID);
    },

    // Get approximate address of coordinates
    fetchStickerAddress: function (lat, long, stickerDivNearby) {
        let addressUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${long}&format=json`;

        fetch(addressUrl)
            .then(addressResponse => {
                if (!addressResponse.ok) {
                    throw new Error(`Address request failed with status: ${addressResponse.status}`);
                }
                return addressResponse.json();
            })
            .then(addressJson => {
                let text = "Nearby ";
                if (addressJson['address']['road'] != undefined) {
                    text += addressJson['address']['road'];
                    if (addressJson['address']['house_number'] != undefined) {
                        text += ' ' + addressJson['address']['house_number'];
                    }
                }
                stickerDivNearby.textContent = text;
            })
            .catch(error => {
                console.error('Error fetching nearby address:', error);
            });
    },

    // Show all the stickers with a delay going from top (small delay) to bottom (large delay)
    revealStickers: function (stickerDivs) {
        stickerDivs.forEach(function (stickerDiv, index) {
            setTimeout(function () {
                stickerDiv.classList.add('revealed');
            }, index * 400);
        });
    },
});

var overlay = new Overlay('#overlay');

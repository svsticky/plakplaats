// Google maps style upwards drag overlay
const SNAP_THRESHOLD = 0.3; // 30% of the overlay height
const OVERLAY_HIDE_LIMIT = 0.8; // Limit to 80% below screen
const STICKER_REVEAL_DELAY = 400; // Delay between sticker reveal animations

var Overlay = L.Class.extend({
    // Overylay constructor
    initialize: function (selector, options) {
        this.isActive = false;
        this._selector = selector;
        this._dragStartY = 0;
        this._overlayHeight = 0;
        
        this._overlayElement = this.createOverlayElement();
        document.body.appendChild(this._overlayElement);

        this.addTouchEventListeners();
    },

    // Create overlay structure
    createOverlayElement: function () {
        const overlayElement = document.createElement('div');
        overlayElement.id = 'nearYouMobileOverlay';
    
        // Assign this._line here to make sure it's accessible
        this._line = this.createElement('img', 'nearYouMobileLine', { src: './static/img/line.svg' });
        overlayElement.appendChild(this._line);
    
        const titleText = this.createElement('h1', 'nearYouMobileTopText', { textContent: "Stickers near you" });
        overlayElement.appendChild(titleText);
    
        for (let i = 0; i < 10; i++) {
            this.createStickerDiv(i, overlayElement);
        }
    
        return overlayElement;
    },

    // Helper to create elements with attributes
    createElement: function (tagName, id, attributes = {}) {
        const element = document.createElement(tagName);
        element.id = id;
        Object.assign(element, attributes);
        return element;
    },
    
    // Create individual sticker elements
    createStickerDiv: function (i, parentElement) {
        const stickerDiv = this.createElement('div', `stickerDiv-${i}`, { className: 'stickerDiv' });

        const title = this.createElement('h1', `stickerDivH1-${i}`, { textContent: `stickerDivH1-${i}`, className: 'stickerDivH1' });
        stickerDiv.appendChild(title);

        const user = this.createElement('h3', `stickerDivUser-${i}`, { textContent: 'Sticked by ???', className: 'stickerDivUser' });
        stickerDiv.appendChild(user);

        const img = this.createElement('img', `stickerDivImg-${i}`, { src: '', className: 'stickerDivImg' });
        stickerDiv.appendChild(img);

        const date = this.createElement('h3', `stickerDivDate-${i}`, { textContent: 'Posted ???', className: 'stickerDivDate' });
        stickerDiv.appendChild(date);

        const nearby = this.createElement('h3', `stickerDivNearby-${i}`, { textContent: 'Nearby ???', className: 'stickerDivNearby' });
        stickerDiv.appendChild(nearby);

        const button = this.createElement('button', `stickerDivButton-${i}`, { innerHTML: 'Open on map', className: 'stickerDivButton' });
        stickerDiv.appendChild(button);

        parentElement.appendChild(stickerDiv);
    },

    addTouchEventListeners: function () {
        const self = this;

        // Use named functions for event listeners
        this._overlayElement.addEventListener('touchstart', this.onTouchStart.bind(self));
        this._overlayElement.addEventListener('touchmove', this.onTouchMove.bind(self));
        this._overlayElement.addEventListener('touchend', this.onTouchEnd.bind(self));
    },

    onTouchStart: function (e) {
        this._dragStartY = e.touches[0].clientY;
        this._overlayHeight = this._overlayElement.clientHeight;
    },

    onTouchMove: function (e) {
        const deltaY = e.touches[0].clientY - this._dragStartY;
        const newBottom = Math.max(-this._overlayHeight * OVERLAY_HIDE_LIMIT, -deltaY); // Limit to OVERLAY_HIDE_LIMIT% below
        this._overlayElement.style.bottom = `${newBottom}px`;
        if (this._overlayElement.scrollHeight - this._overlayElement.scrollTop === this._overlayElement.clientHeight) {
            e.preventDefault(); // Prevent further scrolling
        }
    },

    onTouchEnd: function () {
        const snapThreshold = -this._overlayHeight * SNAP_THRESHOLD; // Snap when dragged beyond SNAP_THRESHOLD% of the overlay height

        if (parseInt(this._overlayElement.style.bottom) < snapThreshold) {
            this.closeOverlay();
        } else {
            this.openOverlay();
        }
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
        stickerDivs.forEach(div => div.classList.remove('revealed'));
    },

    handleGeolocationError: function (error) {
        console.error(`Geolocation error: ${error.message}`);
        alert("Geolocation is not supported by this browser.");
    },

    handleFetchError: function (error, url) {
        console.error(`Error fetching from ${url}: ${error.message}`);
    },

    getNearYouData: function () {
        const self = this;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                // Use user location to request nearby stickers from database
                position => self.requestDBStickers(position),
                error => self.handleGeolocationError(error)
            );
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    },

    // Request nearby stickers from database
    requestDBStickers: function (position) {
        if (!position.coords.latitude || !position.coords.longitude) {
            throw new Error("Location couldn't be accessed");
        }

        const nearYouStickersDBUrl = `getNearYouStickers?lon=${position.coords.longitude}&lat=${position.coords.latitude}`;
        fetch(nearYouStickersDBUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error while fetching near you stickers from database');
                }
                return response.json();
            })
            .then(results => this.processDBStickers(results))
            .catch(error => this.handleFetchError(error, nearYouStickersDBUrl));
    },

    // Use database results to fill all stickers with content
    processDBStickers: function (results) {
        // Get sticker DOM elements
        const stickerDivs = document.querySelectorAll('.stickerDiv');
        const stickerDivH1s = document.querySelectorAll('.stickerDivH1');
        const stickerDivImgs = document.querySelectorAll('.stickerDivImg');
        const stickerDivDates = document.querySelectorAll('.stickerDivDate');
        const stickerDivButtons = document.querySelectorAll('.stickerDivButton');
        const stickerDivNearbys = document.querySelectorAll('.stickerDivNearby');

        // Iterate over sticker elements
        stickerDivH1s.forEach((title, i) => {
            if (i < results.length) {
                const stickerData = results[i];
                // Fill sticker with content
                this.renderSticker(title, stickerDivImgs[i], stickerDivDates[i], stickerData);
                // Add the 'open on map' button click event
                this.addOpenOnmapClickListener(stickerDivButtons[i], stickerData[0], stickerData[1], stickerData[2]);

                // Fetch approximate address given the sticker coordinate
                this.fetchStickerAddress(stickerData[1], stickerData[2], stickerDivNearbys[i]);
            } else {
                // Hide the sticker div when there are more divs than stickers
                stickerDivs[i].style.display = 'none';
            }
        });

        // Show all stickers
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

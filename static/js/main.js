const addView = document.getElementsByClassName('addView')[0];
const successView = document.getElementsByClassName('successView')[0];
const imageText = document.getElementsByClassName('addImageText')[0];
const imagePreview = document.getElementsByClassName('addImagePreview')[0];
const dropArea = document.getElementsByClassName('addImageInput')[0];
const latitudeInput = document.getElementById('latitudeInput');
const longitudeInput = document.getElementById('longitudeInput');
const locationContainerText = document.getElementsByClassName('locationContainerText')[0];
const locationIcon = document.getElementsByClassName('locationIcon')[0];
const locationContainerSpinner = document.getElementsByClassName('locationContainerSpinner')[0];
const submitButton = document.getElementsByClassName('addSubmitButton')[0];
const addLogoSelector = document.getElementsByClassName('addLogoSelector')[0];
const addIcon = document.getElementsByClassName('addIcon')[0];
const emailInput = document.getElementsByClassName('successEmail')[0];

const nearYouButton = document.getElementsByClassName('nearYouButton')[0];

var imageFile;
var selectedLogo;
var selectedLogoId;
var emailCode;

var pointersOnMap = [];
var logoIcons = [];

dayjs.extend(window.dayjs_plugin_relativeTime)

// ****LOGO ADDER
//Load the logo for the add view and the icons
var logoSourceRequest = new XMLHttpRequest();
logoSourceRequest.open('GET', 'static/img/logo.svg', true);
logoSourceRequest.onreadystatechange = function(){
    if(this.readyState == 4 && this.status == 200){
        //Get the logo
        const logo = this.responseText;
        // Make request to server to get all logos
        var logoRequest = new XMLHttpRequest();
        logoRequest.open('GET', 'logos', true);

        logoRequest.onreadystatechange = function() {
            if(this.readyState == 4 && this.status == 200){
                //Create JSON object of response
                var logoJson = JSON.parse(this.responseText);
                for(var i = 0; i < logoJson.length; i ++){
                    const color = logoJson[i][2];
                    const logoId = logoJson[i][0];
                    const title = logoJson[i][1];
                    //Create the object
                    const logoElement = document.createElement('div');
                    logoElement.classList.add('logoElement');
                    logoElement.innerHTML = logo.replaceAll('COLORPLACE', color);
                    logoElement.style.width = '50px';

                    //Handle selection
                    logoElement.addEventListener('click', function(){
                        if(selectedLogo != null){
                            selectedLogo.classList.remove('logoElementSelected');
                        }
                        logoElement.classList.add('logoElementSelected');
                        selectedLogo = logoElement;
                        selectedLogoId = logoId;
                    });

                    //Select if first one
                    if(i == 0){
                        logoElement.classList.add('logoElementSelected');
                        selectedLogo = logoElement;
                        selectedLogoId = logoId;
                    }

                    addLogoSelector.appendChild(logoElement);

                    //Create icon for map
                    const logoIcon = {
                        id: logoId,
                        icon: L.divIcon({
                            className: 'customDivIcon',
                            html: logo.replaceAll('COLORPLACE', color),
                            iconSize: [40, 40],
                            iconAnchor: [24, 24]
                        })
                    }
                    logoIcons.push(logoIcon);
                } 
                //Logo's ready, map ready
                updateMap();
            }
        }
        logoRequest.send();
    }
}
logoSourceRequest.send();

// ***** MAP
// Create a map
var mymap = L.map('map').setView([52.087299, 5.165430], 13);

// Give the map a source
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
}).addTo(mymap);

// Update the pointers
mymap.on('moveend', updateMap);

// Add a button for the current location
L.control.locate().addTo(mymap);

// Update the map so it always renders the markers on page load 
updateMap();

function updateMap() {
    //Remove pointers that fell of the map
    pointersOnMap = pointersOnMap.filter(function(pointer){
        if(pointer.lat < mymap.getBounds().getSouth() || pointer.lat > mymap.getBounds().getNorth() || pointer.lon < mymap.getBounds().getWest() || pointer.lon > mymap.getBounds().getEast()){
            mymap.removeLayer(pointer.pointer);
            return false;
        }
        return true;
    });
    //Add new pointers on the map
    var request = new XMLHttpRequest();
    var url = 'getStickers?north=' + mymap.getBounds().getNorth();
    url += '&south=' + mymap.getBounds().getSouth();
    url += '&west=' + mymap.getBounds().getWest();
    url += '&east=' + mymap.getBounds().getEast();
    request.open('GET', url, true); 
    request.onreadystatechange = function(){
        if(this.readyState == 4){
            if(this.status == 200){
                var results = JSON.parse(this.responseText);
                for(var x = 0; x < results.length; x++){
                    //Check if the pointer already exists on map
                    var isNotOnMap = true;
                    for(var y = 0; y < pointersOnMap.length; y++){
                        if(results[x][0] == pointersOnMap[y].id){
                            isNotOnMap = false;
                        }
                    }
                    if(isNotOnMap){
                        //Not on map, add the pointer
                        var stickyIcon = L.icon({
                            iconUrl: '/static/img/marker.png',
                            shadowUrl: '/static/img/markerShadow.png',
                            iconSize: [38, 52],
                            shadowSize: [52, 52],
                            shadowAnchor: [19, 25],
                        });

                        const pointer = {
                            id: results[x][0],
                            lat: results[x][1],
                            lon: results[x][2],
                            pointer: L.marker([results[x][1], results[x][2]], {icon: stickyIcon}).addTo(mymap)
                        }

                        //Add a popup
                        let spotText = "";
                        if (results[x][7] === 1) {
                            spotText = "spot";
                        } 
                        else {
                            spotText = "spots";
                        }

                        pointer.pointer.bindPopup(`
                        <h1>Sticker ${results[x][0]}</h1>
                        <h2>Sticked by ???</h2>
                        <img width='200px' src='${results[x][4]}'>
                        <h2>${results[x][7]} ${spotText}</h2>
                        <h2>Posted ${dayjs().to(dayjs(results[x][6]))}</h2>
                        <button class='leafletMarkerButton' id='spotButton-${pointer.id}' data-stickerID='${results[x][0]}'>I've spotted this sticker</button>`)
                    
                        pointer.pointer.on('popupopen', function (e) {                         
                            document.getElementById('spotButton-' + pointer.id).addEventListener('click', async (e) => {
                                
                                const button = document.getElementById('spotButton-' + pointer.id);
                                const stickerID = button.getAttribute('data-stickerID');

                                // Post to updateStickerSpots to update spots value for the sticker
                                try {
                                    const response = await fetch('updateStickerSpots', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ stickerID: stickerID })
                                    });
                                    if (response.ok) {
                                        console.log('Spot value updated successfully for sticker ID: ' + stickerID);
                                        alert('Added a spot successfully!')
                                        // Optionally, you can reload the map or perform any other action here
                                    } else {
                                        console.error('Failed to update spot value for sticker ID: ' + stickerID);
                                    }
                                } catch (error) {
                                    console.error('Error updating spot value:', error);
                                }
                            });
                        });


                        //Add pointer object to array
                        pointersOnMap.push(pointer);
                    }
                }
            } else {
                console.error('Error while loading map pointers!');
            }
        }
    }
    request.send();
}



//Add view
var addIsOpen = false;
addIcon.addEventListener('click', function(){
    if(!addIsOpen){
        //Open add view
        openAddView();
        addIsOpen = true;
        //Change icon
        addIcon.classList.add('addIconClose');
    } else {
        //Close add view
        closeAddView();
        closeSuccessView();
        addIsOpen = false;
        addIcon.classList.remove('addIconClose');
        
    }
});
//Open view
function openAddView(){
    resetView();
    addView.classList.add('openView');
    setTimeout(function(){
        getLocation();
    }, 500);
}

function closeAddView(){
    addView.classList.remove('openView');
}

function openSuccessView(){
    successView.classList.add('openView');
}

function closeSuccessView(){
    successView.classList.remove('openView');
    addIsOpen = false;
    addIcon.classList.remove('addIconClose');
}

//Reset add view
function resetView(){
    imageText.classList.remove('addImageTextHidden');
    imagePreview.classList.remove('addImagePreviewShow');
    dropArea.classList.remove('invalid');
    latitudeInput.value = "";
    longitudeInput.value = "";
    latitudeInput.disabled = false;
    longitudeInput.disabled = false;
    setLocationContainer("", false);
    imageFile = null;
    submitButton.classList.remove('addSubmitButtonPressed');
    setManualLocationInput(false);  
}

// *****LOCATION
function getLocation(){
    //Get the permissions
    setLocationContainer("Please grant location permission...");
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(handleLocation, showError);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function handleLocation(position){
    //Set the values in the inputs
    setLocationContainer("Loading location...");
    latitudeInput.value = position.coords.latitude;
    longitudeInput.value = position.coords.longitude;
    //Retrieve estimated address
    var addressRequest = new XMLHttpRequest();
    addressRequest.onreadystatechange = function(){
        if(this.readyState == 4 && this.status == 200){
            var addressJson = JSON.parse(addressRequest.responseText);
            var text = "Location: <i>nearby ";
            if(addressJson['address']['road'] != undefined){
                text += addressJson['address']['road'];
                if(addressJson['address']['house_number'] != undefined){
                    text += ' ' + addressJson['address']['house_number'];
                }
            }
            text += "</i><br>Click to enter manually."
            setLocationContainer(text, true);
        }
    }
    console.log('https://nominatim.openstreetmap.org/reverse?lat=' + position.coords.latitude + '&lon=' + position.coords.longitude + '&format=json');
    addressRequest.open("GET", 'https://nominatim.openstreetmap.org/reverse?lat=' + position.coords.latitude + '&lon=' + position.coords.longitude + '&format=json', true);
    addressRequest.send();
}

function showError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            setLocationContainer("Location permission denied, please enter manually.");
        break;
        case error.POSITION_UNAVAILABLE:
            setLocationContainer("Location information is unavailable, please enter manually.");
        break;
        case error.TIMEOUT:
            setLocationContainer("The request to get user location timed out, please enter manually.");
        break;
        case error.UNKNOWN_ERROR:
            setLocationContainer("An unknown error occurred, please enter manually");
        break;
    }
}

function setLocationContainer(text, found=false){
    locationContainerText.innerHTML = text;
    if(found == true){
        locationContainerSpinner.style.display = "none";
        locationIcon.style.display = "block";
    } else {
        locationContainerSpinner.style.display = "block";
        locationIcon.style.display = "none";
    }
}

function setManualLocationInput(state){
    if(state == true){
        latitudeInput.style.display = 'block';
        longitudeInput.style.display = 'block';
        document.getElementsByClassName('locationInputDes')[0].style.display = 'block';
        document.getElementsByClassName('locationInputDes')[1].style.display = 'block';
    } else {
        latitudeInput.style.display = 'none';
        longitudeInput.style.display = 'none';
        document.getElementsByClassName('locationInputDes')[0].style.display = 'none';
        document.getElementsByClassName('locationInputDes')[1].style.display = 'none';
    }
}

// *****IMAGE UPLOAD
function onClickImage(){
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = _ => {
        imageFile = Array.from(input.files)[0];
        previewImage();
        input.remove();
    };
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
}
//Drop image
//Prevent default behavior
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});
function preventDefaults (e) {
    e.preventDefault();
    e.stopPropagation();
}

//Change the look of the box when you hover with a file
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});
  
function highlight(e) {
    dropArea.classList.add('highlight');
}

function unhighlight(e) {
    dropArea.classList.remove('highlight');
}

//Handle drop
dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  let dt = e.dataTransfer;
  imageFile = dt.files[0];
  previewImage();
}

//Preview Image
function previewImage(){
    let reader = new FileReader()
    reader.readAsDataURL(imageFile)
    reader.onloadend = function() {
        //Hide the text
        imageText.classList.add('addImageTextHidden');
        //Set image
        imagePreview.src = reader.result;
        //Show image element
        imagePreview.classList.add('addImagePreviewShow');
    }
}

//Upload function
function submit(){
    latitudeInput.disabled = true;
    longitudeInput.disabled = true;
    submitButton.classList.add('addSubmitButtonPressed');

    //Create request
    var request = new XMLHttpRequest();
    request.open('POST', 'upload', true);
    //request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

    //Handle response
    request.onreadystatechange = function() {
        if(this.readyState == 4){
            if(this.status == 200){
                dropArea.classList.remove('invalid');
                const response = this.responseText;
                closeAddView();
                setTimeout(function(){
                    openSuccessView();
                    emailCode = JSON.parse(response)['emailCode'];
                }, 500);
            } else {
                if(JSON.parse(this.responseText)['error'] == "You must upload a picture."){
                    dropArea.classList.add('invalid');
                } else if (JSON.parse(this.responseText)['error'] == "Unsupported file type."){
                    dropArea.classList.add('invalid');
                    alert('File type not supported.');
                } else {
                    alert("Error: " + this.responseText);
                }
                latitudeInput.disabled = false;
                longitudeInput.disabled = false;
                submitButton.classList.remove('addSubmitButtonPressed');
            }
        }
    }

    //Send request
    var formdata = new FormData();
    formdata.append('image', imageFile);
    formdata.append('lat', latitudeInput.value);
    formdata.append('lon', longitudeInput.value);
    formdata.append('logoId', selectedLogoId);
    request.send(formdata);
}

//Update email
function updateEmail(){
    if(emailInput.value != ''){
        //Check if email is valid
        if(checkEmail(emailInput.value)){
            //Update email
            emailInput.classList.remove('invalid');
            var request = new XMLHttpRequest();
            request.open('PATCH', 'addEmail', true);
            var formData = new FormData();
            formData.append('email', emailInput.value);
            formData.append('token', emailCode);
            request.onreadystatechange = function(){
                if(this.readyState == 4){
                    if(this.status == 200){
                        closeSuccessView();
                    } else {
                        alert('Email could not be added :(');
                        closeSuccessView();
                    }
                }
            }
            request.send(formData);
        } else {
            //Email not valid, update UI
            emailInput.classList.add('invalid');
        }
    } else {
        //No email added close success view
        closeSuccessView()
    }
}

function checkEmail(email){
    if(email.includes('@') && email.includes('.')){
        return true;
    }
    else{
        return false;
    }
}

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

        this._userLon = 9.404223;
        this._userLat = 52.359474;

        // Replace this with actual user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this.handleOverlayLocation, showError);
        } else {
            alert("Geolocation is not supported by this browser.");
        }

        this.requestDBStickers();
    },

    handleOverlayLocation: function (position) {
        this._userlon = position.coords.longitude;
        this._userLat = position.coords.latitude;
        // console.log(position.coords.longitude, position.coords.latitude, position.coords.accuracy);
        // console.log(this._userlon, this._userLat);
        // this.requestDBStickers();
    },

    requestDBStickers: function () {
        var self = this;

        var request = new XMLHttpRequest();

        var url = 'getNearYouStickers?';
        url += 'lon=' + this._userLon;
        url += '&lat=' + this._userLat;
        
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
                            // var stickerDivNearby = stickerDivNearbys[i];
                            // var addressRequest = new XMLHttpRequest();
                            // addressRequest.onreadystatechange = function(){
                            //     if(this.readyState == 4 && this.status == 200){
                            //         var addressJson = JSON.parse(addressRequest.responseText);
                            //         console.log(addressJson);
                            //         var text = "Nearby ";
                            //         if(addressJson['address']['road'] != undefined){
                            //             text += addressJson['address']['road'];
                            //             if(addressJson['address']['house_number'] != undefined){
                            //                 text += ' ' + addressJson['address']['house_number'];
                            //             }
                            //         }
                            //         console.log(text);
                            //         stickerDivNearby.textContent = text;
                            //     } else {
                            //         // Error handling for non-200 status codes
                            //         // console.error('Request failed with status code ' + this.status);
                            //     }
                            // }
                            // console.log('https://nominatim.openstreetmap.org/reverse?lat=' + results[i][1] + '&lon=' + results[i][2] + '&format=json');
                            // addressRequest.open("GET", 'https://nominatim.openstreetmap.org/reverse?lat=' + results[i][1] + '&lon=' + results[i][2] + '&format=json', true);
                            // addressRequest.send();
                        }
                        else {
                            // Don't show the div if the amount of divs (10) > amount of stickers
                            stickerDivs[i].style.display = 'none';                 
                        }
                        // Show the divs
                        let stickerDivs = document.querySelectorAll('.stickerDiv');
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


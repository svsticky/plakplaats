// *****LOCATION

let pickingLocation = false;

function getLocation(){
    //Get the permissions
    setLocationContainer("Please grant location permission...");
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(handleGeoLocation, showError);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function handleGeoLocation(location) {
    if (!pickingLocation)
        handleLocation(location.coords.latitude, location.coords.longitude);
}

function handleLocation(lat, lon){
    //Set the values in the inputs
    setLocationContainer("Loading location...");
    setPicker(false)
    latitudeInput.value = lat;
    longitudeInput.value = lon;
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
            text += "</i><br>Press to pick manually."
            setLocationContainer(text, true);
        }
    }
    console.log('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json');
    addressRequest.open("GET", 'https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json', true);
    addressRequest.send();
}

function showError(error) {
    let text = "";
    switch(error.code) {
        case error.PERMISSION_DENIED:
            text += "Location permission denied";
        break;
        case error.POSITION_UNAVAILABLE:
            text += "Location information is unavailable"
        break;
        case error.TIMEOUT:
            text += "The request to get user location timed out"
        break;
        case error.UNKNOWN_ERROR:
            text += "An unknown error occurred"
        break;
    }
    text += ",\ please press to add manually."
    setLocationContainer(text);
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

// Manages manually picking a location by clikcing the map
function pickManualLocation(location) {
    if (pickingLocation) {
        handleLocation(location.latlng.lat, location.latlng.lng);
        setManualLocationInput(true);
        openAddView(false);
    }
}

// Set the picking state
function setPicker(state) {
    pickingLocation = state;
    setOverlay(state);
    if (state) 
        closeAddView(false);
}
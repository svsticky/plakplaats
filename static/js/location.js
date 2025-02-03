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
    handleLocation(location.coords.latitude, location.coords.longitude);
}

function handleLocation(lat, lon){
    //Set the values in the inputs
    setLocationContainer("Loading location...");
    latitudeInput.value = lat;
    longitudeInput.value = lon;
    setManualLocationInput(true);
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
    console.log('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json');
    addressRequest.open("GET", 'https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json', true);
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

// Manages manually picking a location by clikcing the map
function pickManualLocation(location) {
    if (pickingLocation) {
        handleLocation(location.latlng.lat, location.latlng.lng);
        openAddView(false);
    }
}

// Set the picking state
function setPicker(state) {
    pickingLocation = state;
    if (state) 
        closeAddView(false);
}
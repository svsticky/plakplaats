// *****LOCATION

let pickingLocation = false;
let statePicked = false;

function getLocation() {
    //Get the permissions
    setLocationContainer("Please grant location permission...");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(handleGeoLocation, (error) => { setLocationContainer(getError(error) + ", please press to add manually."); });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function handleGeoLocation(location) {
    if (!pickingLocation && !statePicked)
        handleLocation(location.coords.latitude, location.coords.longitude);
}

async function handleLocation(lat, lon) {
    //Set the values in the inputs
    setLocationContainer("Loading location...");
    setPicker(false)
    statePicked = true;
    latitudeInput.value = lat;
    longitudeInput.value = lon;

    //Retrieve estimated address
    try {
        const response = await fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json')
            .then(response => {
                if (!response.ok)
                    throw new Error('Network response was not ok');
                else
                    return response.json();
            }
            );

        var text = "Location: <i>nearby ";
        if (response['address']['road'] != undefined) {
            text += response['address']['road'];
            if (response['address']['house_number'] != undefined) {
                text += ' ' + response['address']['house_number'];
            }
        }
        text += "</i><br>Press to pick manually."
        setLocationContainer(text, true);
    } catch (error) {
        alert("Error retrieving address information.", error);
    }
}

function getError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            return "Location permission denied";
        case error.POSITION_UNAVAILABLE:
            return "Location information is unavailable"
        case error.TIMEOUT:
            return "The request to get user location timed out"
        case error.UNKNOWN_ERROR:
            return "An unknown error occurred"
    }
}

function setLocationContainer(text, found = false) {
    locationContainerText.innerHTML = text;
    if (found == true) {
        locationContainerSpinner.style.display = "none";
        locationIcon.style.display = "block";
    } else {
        locationContainerSpinner.style.display = "block";
        locationIcon.style.display = "none";
    }
}

function setManualLocationInput(state) {
    if (state == true) {
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

// Manages manually picking a location, called by clikcing the map
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
    if (statePicked)
        statePicked = false;
    setOverlay(state);
    if (state)
        closeAddView(false);
}
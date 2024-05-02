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

var imageFile;
var selectedLogo;
var selectedLogoId;
var emailCode;

var pointersOnMap = [];
var logoIcons = [];

// ****LOGO ADDER
//Load the logo for the add view and the icons
var logoSourceRequest = new XMLHttpRequest();
logoSourceRequest.open('GET', 'static/logo.svg', true);
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
//Create a map
var mymap = L.map('map').setView([52.087299, 5.165430], 13);

//Give the map a source
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
}).addTo(mymap);

//Update the pointers
mymap.on('moveend', updateMap);

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
                        const pointer = {
                            id: results[x][0],
                            lat: results[x][1],
                            lon: results[x][2],
                           // pointer: L.marker([results[x][1], results[x][2]], {icon: logoIcons.filter(logo => logo.id == results[x][5])[0].icon}).addTo(mymap)
                            pointer: L.marker([results[x][1], results[x][2]]).addTo(mymap)
                        }
                        //Add a popup
                        pointer.pointer.bindPopup("<img width='200px' src='" + results[x][4] + "'>");
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

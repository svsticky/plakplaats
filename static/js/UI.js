//Add view
var addIsOpen = false;
addIcon.addEventListener('click', function(){
    if(!addIsOpen){
        //Open add view
        openAddView(true);
        addIsOpen = true;
        //Change icon
        addIcon.classList.add('addIconClose');
    } else {
        //Close add view
        closeAddView(true);
        closeSuccessView();
        addIsOpen = false;
        addIcon.classList.remove('addIconClose');
        
    }
});
//Open view
function openAddView(reset){
    if (reset) {
        resetView();
        setTimeout(function(){
            getLocation();
        }, 500);
    }
    addView.classList.add('openView');
}

function closeAddView(reset){
    addView.classList.remove('openView');
    if (reset)
        resetView();
}

function setOverlay(state){
    if (state)
        document.getElementById("mapOverlay").style.display = "block";
    else
        document.getElementById("mapOverlay").style.display = "none";
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
    setPicker(false);
    closeAddView();
    closeSuccessView();
    addIcon.classList.remove('addIconClose');
    overlay.toggleOverlay({ isOpen: false, isMobile: false });
    setManualLocationInput(false);
}
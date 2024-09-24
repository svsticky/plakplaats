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
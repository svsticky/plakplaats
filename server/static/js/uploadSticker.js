// *****IMAGE UPLOAD
function onClickImage() {
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
function preventDefaults(e) {
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
function previewImage() {
    let reader = new FileReader()
    reader.readAsDataURL(imageFile)
    reader.onloadend = function () {
        //Hide the text
        imageText.classList.add('addImageTextHidden');
        //Set image
        imagePreview.src = reader.result;
        //Show image element
        imagePreview.classList.add('addImagePreviewShow');
    }
}

//Upload function
async function submit() {
    latitudeInput.disabled = true;
    longitudeInput.disabled = true;
    submitButton.classList.add('addSubmitButtonPressed');

    try {
        var formdata = new FormData();
        formdata.append('image', imageFile);
        formdata.append('lat', latitudeInput.value);
        formdata.append('lon', longitudeInput.value);
        formdata.append('logoId', selectedLogoId);
        formdata.append('boardYear', boardYearInput.value);

        const response = await fetch("/upload", { method: 'post', body: formdata }).then(async resp => {
            const json = await resp.json();
            if (resp.ok) return json
            else throw json;
        });

        dropArea.classList.remove('invalid');
        closeAddView();
        resetView();
        setTimeout(function () {
            openSuccessView();
            emailCode = response['emailCode'];
        }, 500);
    } catch (error) {
        if (error['error'] == "You must upload a picture.") {
            dropArea.classList.add('invalid');
        } else if (error['error'] == "Unsupported file type.") {
            dropArea.classList.add('invalid');
            alert('File type not supported.');
        } else {
            alert("Error: " + error['error']);
        }
        latitudeInput.disabled = false;
        longitudeInput.disabled = false;
        submitButton.classList.remove('addSubmitButtonPressed');
    }
}
//Update email
function updateEmail() {
    if (emailInput.value != '') {
        //Check if email is valid
        if (checkEmail(emailInput.value)) {
            //Update email
            emailInput.classList.remove('invalid');
            var request = new XMLHttpRequest();
            request.open('PATCH', 'addEmail', true);
            var formData = new FormData();
            formData.append('email', emailInput.value);
            formData.append('token', emailCode);
            request.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200) {
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


function checkEmail(email) {
    if (email.includes('@') && email.includes('.')) {
        return true;
    }
    else {
        return false;
    }
}

//Close all menus when the escape key is pressed
function escapeKey() {
    document.addEventListener("keydown", (event) => {
        if (event.key == "Escape")
            resetView();
    });
}

escapeKey();
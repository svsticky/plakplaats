// ****LOGO ADDER
//Load the logo for the add view and the icons
// var logoSourceRequest = new XMLHttpRequest();
// logoSourceRequest.open('GET', 'static/img/logo.svg', true);
// logoSourceRequest.onreadystatechange = function(){
//     if(this.readyState == 4 && this.status == 200){
//         //Get the logo
//         const logo = this.responseText;
//         // Make request to server to get all logos
//         var logoRequest = new XMLHttpRequest();
//         logoRequest.open('GET', 'logos', true);

//         logoRequest.onreadystatechange = function() {
//             if(this.readyState == 4 && this.status == 200){
//                 //Create JSON object of response
//                 var logoJson = JSON.parse(this.responseText);
//                 for(var i = 0; i < logoJson.length; i ++){
//                     const color = logoJson[i][2];
//                     const logoId = logoJson[i][0];
//                     const title = logoJson[i][1];
//                     //Create the object
//                     const logoElement = document.createElement('div');
//                     logoElement.classList.add('logoElement');
//                     logoElement.innerHTML = logo.replaceAll('COLORPLACE', color);
//                     logoElement.style.width = '50px';

//                     //Handle selection
//                     logoElement.addEventListener('click', function(){
//                         if(selectedLogo != null){
//                             selectedLogo.classList.remove('logoElementSelected');
//                         }
//                         logoElement.classList.add('logoElementSelected');
//                         selectedLogo = logoElement;
//                         selectedLogoId = logoId;
//                     });

//                     //Select if first one
//                     if(i == 0){
//                         logoElement.classList.add('logoElementSelected');
//                         selectedLogo = logoElement;
//                         selectedLogoId = logoId;
//                     }

//                     addLogoSelector.appendChild(logoElement);

//                     //Create icon for map
//                     const logoIcon = {
//                         id: logoId,
//                         icon: L.divIcon({
//                             className: 'customDivIcon',
//                             html: logo.replaceAll('COLORPLACE', color),
//                             iconSize: [40, 40],
//                             iconAnchor: [24, 24]
//                         })
//                     }
//                     logoIcons.push(logoIcon);
//                 } 
//                 //Logo's ready, map ready
//                 updateMap();
//             }
//         }
//         logoRequest.send();
//     }
// }
// logoSourceRequest.send();


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
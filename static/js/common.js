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
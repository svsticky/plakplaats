const cardHolder = document.getElementsByClassName('cardHolder')[0];

var maxRotation = 30;
var maxRotationIn = 200;
var pivotOn = 100;
var maxCardsPerLoad = 5;

var token = '123';

loadCards();

function loadCards(){
    //Check if there are 0 cards in the holder
    if(cardHolder.children.length == 0){
        //Create request to server
        var cardRequest = new XMLHttpRequest();
        var url = "getUnverifiedStickers?";
        url += "token=" + token;
        cardRequest.open('GET', url);
        cardRequest.onreadystatechange = function(){
            if(this.readyState == 4){
                if(this.status == 200){
                    var results = JSON.parse(this.responseText);
                    var maxX = results.length;
                    if(maxX > 5){
                        maxX = 5;
                    }
                    for(var x = 0; x < maxX;x++){
                        createCard(results[x][0], results[x][4]);
                    }
                } else {
                    //HANDLE ERRORS
                    alert(this.responseText);
                }
            }
        }
        //Send the request
        cardRequest.send();
    }
}

function createCard(id, imagesrc){
    //Create card
    var card = document.createElement('div');
    card.classList.add('card');

    //Create sticker image
    var image = document.createElement('img');
    image.classList.add('stickerImage');
    image.alt = 'Image of sticker';
    image.src = imagesrc;

    //Create the button area
    var buttonArea = document.createElement('div');
    buttonArea.classList.add('buttonArea');

    //Create reject button
    var rejectButton = document.createElement('div');
    rejectButton.classList.add("cardButton");
    rejectButton.classList.add("reject");
    rejectButton.addEventListener('click', function(){
        //Animate card
        card.style.animation = "cardSwipeLeft 0.3s";
        setTimeout(function (){
            //Start reject function
            rejectCard();
        }, 300);
    });

    //Create accept button
    var acceptButton = document.createElement('div');
    acceptButton.classList.add("cardButton");
    acceptButton.classList.add("accept");
    acceptButton.addEventListener('click', function(){
        //Animate card
        card.style.animation = "cardSwipeRight 0.3s";
        setTimeout(function (){
            //Start accept function
            acceptCard();
        }, 300);
    });


    card.appendChild(image);
    card.appendChild(buttonArea);
    buttonArea.appendChild(rejectButton);
    buttonArea.appendChild(acceptButton);


    //Touch actions
    card.addEventListener('touchstart', onTouchStart);
    card.addEventListener('touchmove', onTouchMove);
    card.addEventListener('touchend', onTouchEnd);
    card.addEventListener('mousedown', onTouchStart);
    card.addEventListener('mousemove', onTouchMove);
    card.addEventListener('mouseup', onTouchEnd);

    var startX, objectX = 0, dragging;

    function onTouchStart(e){
        e.preventDefault();
        card.style.transition = "";
        //Save start cursor position
        if(e.pageX == null){
            startX = e.touches[0].pageX;
        } else {
            startX = e.pageX;
        }
        dragging = true;
    }

    function onTouchMove(e){
        e.preventDefault();
        if(dragging == true){
            //Calculate difference X
            if(e.pageX == null){
                deltaX = (startX - e.touches[0].pageX) * -1;
            } else {
                deltaX = (startX - e.pageX) * -1;
            }
            moveCard(deltaX);
        }
    }

    function onTouchEnd(e){
        dragging = false;
        if(e.pageX == null){
            objectX -= (startX - e.changedTouches[0].pageX);
        } else {
            objectX -= (startX - e.pageX);
        }

        moveCardOnDrop();
    }

    //Function to animate the card movement
    function moveCard(deltaX){
        if(objectX + deltaX > (-1 * maxRotationIn) && objectX + deltaX < maxRotationIn){
            var rotation = maxRotation / maxRotationIn * (objectX + deltaX);
            card.style.transform =  "translate(" + (objectX + deltaX) + "px, 0) rotate(" + rotation + "deg)";
            var opacity = 1 / 200 * (objectX + deltaX);
            if(opacity < 0){
                opacity *= -1;
            }
            card.style.opacity = 1 - opacity;
        }
    }

    function moveCardOnDrop(){
        if(!dragging){
            var acceptSate = 0;
            if(objectX > pivotOn){
                acceptSate = 1;
            } else if (objectX < (pivotOn * -1)){
                acceptSate = -1;
            }
            if(acceptSate == 0){
                //Move card back to center
                objectX = 0;
                card.style.transition = "transform 0.5s, opacity 0.5s";
                card.style.transform = "translate(0px,0px) rotate(0deg)";
                card.style.opacity = 1;
                setTimeout(function(){
                    card.style.transition = '';
                }, 500);
            } else if (acceptSate == 1){
                 //Move card to right and accept
                 objectX = 0;
                 card.style.transition = "transform 0.5s, opacity 0.5s";
                 card.style.transform = "translate(200px,0px) rotate(30deg)";
                 card.style.opacity = 0;
                 setTimeout(function(){
                     card.style.transition = '';
                     //Accept
                     acceptCard();
                 }, 500);
            } else if (acceptSate == -1){
                //Move card to right and accept
                objectX = 0;
                card.style.transition = "transform 0.5s, opacity 0.5s";
                card.style.transform = "translate(-200px,0px) rotate(-30deg)";
                card.style.opacity = 0;
                setTimeout(function(){
                    card.style.transition = '';
                    //Decline
                    rejectCard();
                }, 500);
            }
        }
    }

    function acceptCard(){
        //update sticker
        var updateRequest = new XMLHttpRequest()
        updateRequest.open('GET', '/setSticker?id=' + id + '&state=Verify');
        updateRequest.onreadystatechange = function(){
            if(this.readyState == 4 && this.status == 400){
                alert(this.responseText);
            }
        };
        updateRequest.send();
        if(cardHolder.children.length == 0){
            loadCards();
        }
        card.remove();
    }

    function rejectCard(){
        //update sticker
        var updateRequest = new XMLHttpRequest()
        updateRequest.open('GET', '/setSticker?id=' + id + '&state=Reject');
        updateRequest.onreadystatechange = function(){
            if(this.readyState == 4 && this.status == 400){
                alert(this.responseText);
            }
        };
        updateRequest.send();
        //Check if new stickers have to be loaded
        if(cardHolder.children.length == 0){
            loadCards();
        }
        card.remove();
    }
    cardHolder.appendChild(card);
}


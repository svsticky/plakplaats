// ***** MAP
// Create a map
var mymap = L.map('map').setView([52.087299, 5.165430], 13);

// Give the map a source
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
}).addTo(mymap);

// Update the pointers
mymap.on('moveend', updateMap);

// Add a button for the current location
L.control.locate().addTo(mymap);

// Update the map so it always renders the markers on page load 
updateMap();

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
                        var stickyIcon = L.icon({
                            iconUrl: '/static/img/marker.png',
                            shadowUrl: '/static/img/markerShadow.png',
                            iconSize: [38, 52],
                            shadowSize: [52, 52],
                            shadowAnchor: [19, 25],
                        });

                        const pointer = {
                            id: results[x][0],
                            lat: results[x][1],
                            lon: results[x][2],
                            pointer: L.marker([results[x][1], results[x][2]], {icon: stickyIcon}).addTo(mymap)
                        }

                        //Add a popup
                        let spotText = "";
                        if (results[x][7] === 1) {
                            spotText = "spot";
                        } 
                        else {
                            spotText = "spots";
                        }

                        pointer.pointer.bindPopup(`
                        <h1>Sticker ${results[x][0]}</h1>
                        <h2>Sticked by ???</h2>
                        <img width='200px' src='${results[x][4]}'>
                        <h2>${results[x][7]} ${spotText}</h2>
                        <h2>Posted ${dayjs().to(dayjs(results[x][6]))}</h2>
                        <button class='leafletMarkerButton' id='spotButton-${pointer.id}' data-stickerID='${results[x][0]}'>I've spotted this sticker</button>`)
                    
                        pointer.pointer.on('popupopen', function (e) {                         
                            document.getElementById('spotButton-' + pointer.id).addEventListener('click', async (e) => {
                                
                                const button = document.getElementById('spotButton-' + pointer.id);
                                const stickerID = button.getAttribute('data-stickerID');

                                // Post to updateStickerSpots to update spots value for the sticker
                                try {
                                    const response = await fetch('updateStickerSpots', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ stickerID: stickerID })
                                    });
                                    if (response.ok) {
                                        console.log('Spot value updated successfully for sticker ID: ' + stickerID);
                                        alert('Added a spot successfully!')
                                        // Optionally, you can reload the map or perform any other action here
                                    } else {
                                        console.error('Failed to update spot value for sticker ID: ' + stickerID);
                                    }
                                } catch (error) {
                                    console.error('Error updating spot value:', error);
                                }
                            });
                        });


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
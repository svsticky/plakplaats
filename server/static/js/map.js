// ***** MAP
// Create a map
var mymap = L.map("map").setView([52.087299, 5.16543], 13);

// Give the map a source
L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    "© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France",
}).addTo(mymap);

// Update the pointers
mymap.on("moveend", updateMap);

// Add a button for the current location
L.control.locate().addTo(mymap);

// Update the map so it always renders the markers on page load
updateMap();

async function updateMap() {
  //Remove pointers that fell of the map
  pointersOnMap = pointersOnMap.filter(function (pointer) {
    if (
      pointer.lat < mymap.getBounds().getSouth() ||
      pointer.lat > mymap.getBounds().getNorth() ||
      pointer.lon < mymap.getBounds().getWest() ||
      pointer.lon > mymap.getBounds().getEast()
    ) {
      mymap.removeLayer(pointer.pointer);
      return false;
    }
    return true;
  });

  //Add new pointers on the map
  try {
    var url = "getStickers?north=" + mymap.getBounds().getNorth();
    url += "&south=" + mymap.getBounds().getSouth();
    url += "&west=" + mymap.getBounds().getWest();
    url += "&east=" + mymap.getBounds().getEast();
    const response = await fetch(url).then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      else return response.json();
    });

    placePointers(response);
  } catch (error) {
    console.log("Error while loading map pointers!", error);
  }
}

function placePointers(response) {
  for (var x = 0; x < response.length; x++) {
    //Check if the pointer already exists on map
    var isNotOnMap = true;
    for (var y = 0; y < pointersOnMap.length; y++) {
      if (response[x].id == pointersOnMap[y].id) {
        isNotOnMap = false;
      }
    }
    if (isNotOnMap) {
      //Not on map, add the pointer
      var stickyIcon = L.icon({
        iconUrl: `/static/img/markers/marker-${response[x].boardyear}.svg`,
        shadowUrl: "/static/img/markerShadow.png",
        iconSize: [38, 52],
        shadowSize: [52, 52],
        shadowAnchor: [19, 25],
      });

      const pointer = {
        id: response[x].id,
        lat: response[x].latitude,
        lon: response[x].longitude,
        pointer: L.marker([response[x].latitude, response[x].longitude], {
          icon: stickyIcon,
        }).addTo(mymap),
      };

      //Add a popup
      let spotText = "";
      if (response[x].spots === 1) {
        spotText = "spot";
      } else {
        spotText = "spots";
      }

      pointer.pointer.bindPopup(`
                        <h1>Sticker ${response[x].id}</h1>
                        <h2>Sticked by ???</h2>
                        <img width='200px' src='${response[x].picture}'>
                        <h2>${response[x].spots} ${spotText}</h2>
                        <h2>Posted ${dayjs().to(dayjs(response[x].posttime))}</h2>
                        <div class='markerBoardYearDiv'>
                        <h2 class='markerBoardYearText'>Board year:</h2><h2 class='marker-B${response[x].boardyear} markerBoardYear'>${response[x].boardyear}</h2>
                        </div>
                        <button class='leafletMarkerButton' id='spotButton-${pointer.id}' data-stickerID='${response[x].id}'>I've spotted this sticker</button>`);

      pointer.pointer.on("popupopen", function (e) {
        document
          .getElementById("spotButton-" + pointer.id)
          .addEventListener("click", async (e) => {
            const button = document.getElementById("spotButton-" + pointer.id);
            const stickerID = button.getAttribute("data-stickerID");

            // Post to updateStickerSpots to update spots value for the sticker
            try {
              const response = await fetch("updateStickerSpots", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ stickerID: stickerID }),
              });
              if (response.ok) {
                console.log(
                  "Spot value updated successfully for sticker ID: " +
                    stickerID,
                );
                alert("Added a spot successfully!");
                // Optionally, you can reload the map or perform any other action here
              } else {
                console.error(
                  "Failed to update spot value for sticker ID: " + stickerID,
                );
              }
            } catch (error) {
              console.error("Error updating spot value:", error);
            }
          });
      });

      //Add pointer object to array
      pointersOnMap.push(pointer);
    }
  }
}

function flyToSticker(lat, lon, id) {
  // TODO: close the overlay (at least on mobile), line below is not working
  // document.getElementById("nearYouOverlay").__x.$data.open = false;
  mymap.flyTo([lat, lon], 18);

  function openPopup() {
    for (let p of pointersOnMap) {
      if (p.id == id) {
        p.pointer.openPopup();
        return;
      }
    }
    setTimeout(openPopup, 100);
  }
  openPopup();
}

mymap.on("click", (e) => pickManualLocation(e));

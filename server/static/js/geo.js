window.userGeo = { lat: null, lon: null };

navigator.geolocation.getCurrentPosition((p) => {
  userGeo.lat = p.coords.latitude;
  userGeo.lon = p.coords.longitude;

  document.getElementById("geo-lat").value = userGeo.lat;
  document.getElementById("geo-lon").value = userGeo.lon;
});

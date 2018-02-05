/* SET A DEFAULT LANDING MAP */

/* API credentails saved server-side */
var credFile = "/static/assets/docs/credentials";
var gmapUrlBase = "http://maps.googleapis.com/maps/api/js?key=APIKEY&v=3&callback=loadMap&onerror=gmLoadError";

/* Map Style: we use a variant of Sarah Frisk's Assassin's Creed IV map
   with place and street names visible. 
   See: https://snazzymaps.com/style/72543/assassins-creed-iv */
var defMapStyle = "/static/assets/json/vegMapStyle.json";


/* Set default Google Mpas marker pin icon */
var defIcon = {   
   url: 'http://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi-dotless_hdpi.png'   
 };


/* Other map inputs: set default landing map coordinates: NY */
var defCity = "New York";
var LAT_DEF = 40.7413549;
var LNG_DEF = -73.9980244;
var ZOOM = 13;

var map;
var mapStyle = [];


function initMap() {  
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: LAT_DEF, lng: LNG_DEF},
    zoom: ZOOM,
    styles: mapStyle
  });
  defIcon.scaledSize = new google.maps.Size(22,40);
}   


/* load map style */
function loadMap() {
  $.ajax({
    dataType: "json",
    url: defMapStyle
  }).done(function(styleCfg) {
      mapStyle=styleCfg;
      initMap();
  }).fail(function(err) {
      console.log(err);
      alert("Error attempting to load map style file - returned status: " + err.status);
  });
}


/* Google Maps standard authorization error callback */
function gm_authFailure() { 
  alert("Google Maps authentication failure occured: Please ensure " + 
         "a valid API key is used for the Google Maps request.");
  console.log("Google Maps authentication failure occured. " + 
              " Please check your API key credentials.");
}


/* Google Maps error handler (non-auth errors) */
function gmLoadError(err) {  
  alert("Error attempting to load Google Maps: " + err );  
  console.log("Error attempting to load Google Maps: " + err );  // specify gmLoadErr in url
}


/*
  Using knockout to bind & init Google Maps, thus
  avoiding exposure of our API key.    
*/
function launchMap(KEY) {   
   var initMapUrl = gmapUrlBase.replace("APIKEY",KEY);
   var ViewModel = { url: ko.observable(initMapUrl) };   
   ko.applyBindings(ViewModel,document.getElementById("map"));   
}


/* credentials file read error handler */
function credErr(status) {
  alert("Error attempting to access credentials file - " + 
        " returned status: " + status);
}

/* read credentials file to access Google Maps */
function getCred(url,callback) {
  var xhr = new XMLHttpRequest();  
  /* xaction-based error handler */
  xhr.onerror = function() {
    alert("Error: Transaction error while attempting to read " + 
          "credentials file on server.");
  };
  xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && xhr.status == 200) {            
          var cred = JSON.parse(xhr.responseText);
          callback(cred.GOOGLE_MAPS_API_KEY);
      } else if ( xhr.readyState == 4 && xhr.status != 200 ) {
        console.log(xhr.responseText);        
        credErr(xhr.status);
      }
  };
  xhr.open('GET', url, true);
  xhr.send();
}


function landingMap() {  
  getCred(credFile, launchMap);  
}


landingMap();

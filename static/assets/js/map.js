/* 
   Notes: 

   1). CREDENTIALS FILE:
   The credentials file for Google Maps & 3rd party APIs are saved
   server-side. Unlike my initial submission where I used a knockout
   attr binding for the constructed url in index.html, invocation of 
   Google Maps via the <script> tag as suggested for speed purposes
   exposes our API key, although this may be mitigated by
   Google's dashboard management tools. The trade-off is of speed vs
   *some* security here.
 

  2). GEOCODING SERVICE:
  As it now stands, the lat/lngs need decoding from a human-readable
  address to send to Yelp for querying to avoid the potential for different
  location interpretations between the two services (e.g. a *hypothetical*
  example could be Portland,OR vs Portland,ME) which we avoid by sourcing this
  to *one service*. I did not find a method (callback) by which to return 
  latlngs as decoded by the Google Maps call via <script> tags otherwise I would
  have piggybacked the Yelp call on that. 

*/
 
var credFile = "/static/assets/docs/credentials"; 
var geoCodeUrlBase = "https://maps.googleapis.com/maps/api/geocode/json?address=ADDRESS&key=APIKEY"; 
var raiseMsg;


/* GUIDE USER INTERACTION WITH NAV SEARCH OPTIONS */

// enable address bar when applicable
function resetSearchLoc() {  
  viewModelLoc.useGPS(false);
  viewModelLoc.searchLoc("");
}


function checkGeolocation() {
  if (! navigator.geolocation) {
      alert("GPS must be enabled to find locations nearby.  Please turn on GPS "
          +" or search by location in the address bar.");      
      resetSearchLoc();
  }
}


// get user coordinates once user grants permisson
function getUserCoordinates(position) {
  
  lat = position.coords.latitude;
  lng = position.coords.longitude;

  // proceed to launch map
  renderMap(lat,lng);

  // record current state
  viewModelLoc.qryGPS(true);  
  viewModelLoc.manRun(false);

}


function renderMap(lat,lng) { 
  
  runFusionQuery(lat,lng);  // fire Yelp query as our map initializes
  
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: lat, lng: lng},
    zoom: refZoom,
    styles: mapStyle
  });

}


function getGeolocation() { 
  if ( ! navigator.geolocation ) {
    alert("GPS must be enabled to find locations nearby.  Please turn on GPS "
          +" or search by location in the address bar.");    
    resetSearchLoc();
  } else {
    navigator.geolocation.getCurrentPosition(getUserCoordinates);
  }
}


// app-level error handler in case of read failure
function credErr(status) {
  alert("Error attempting to access credentials file - " + 
        " returned status: " + status);
}


function getCred(url,callback) {

  // fetch Google Maps API key for authentication with Geocoding service
  var xhr = new XMLHttpRequest();
  // network/transaction-level error alert:
  xhr.onerror = function(){   
    alert("Error: Transaction error while attempting to read " + 
           "credentials file on server.");
  };
  xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && xhr.status == 200) {            
          var cred = JSON.parse(xhr.responseText);            
          callback(cred.GOOGLE_MAPS_API_KEY,renderMap); // launchMap
      } else if ( xhr.readyState == 4 && xhr.status != 200 ){
        console.log(xhr.responseText);
        credErr(xhr.status); // our error-handler
      }
  };
  xhr.open('GET', url, true);
  xhr.send();

}


function geoCode(MAPKEY,callback) {

  /* UI control functionality: update address-based search for GPS toggling */
  viewModelLoc.qryGPS(false);
  prevLoc = viewModelLoc.searchLoc(); 

  /* GET request to geocode user-entered location as read from our view */
  var geoCodeUrl = geoCodeUrlBase.replace("ADDRESS",viewModelLoc.searchLoc());
  geoCodeUrl = geoCodeUrl.replace("APIKEY",MAPKEY);
  $.getJSON({    
      url: geoCodeUrl,        
    }).done(function(res){
        if ( res.results.length > 0 ) {
          var lat = res.results[0].geometry.location.lat;
          var lng = res.results[0].geometry.location.lng; 
          renderMap(lat,lng);
      } else {
          viewModelMsg.msg(mapError);
          document.getElementById("map").style.opacity = "0.5"; // non-ko purely-cosmetic change
      }
    }).fail(function(err){
        console.log(err);
        alert("Error attempting to geocode and load map"
          +" - returned status: " + err.status);
    });    

}


/* Knockout governs navigation options */

var viewModelMsg = {
  msg: ko.observable(raiseMsg)
};


var viewModelLoc = {
  searchLoc: ko.observable(defCity),
  manRun: ko.observable(true),
  useGPS: ko.observable(false),
  qryGPS: ko.observable(false),  
  gpsMsg: function() {    
    if ( this.useGPS() ) {
      this.msg = "GPS: using current location...";
    } else {
      if ( ! this.manRun() ) {
        if ( this.qryGPS() ) {
          this.msg = '';          
          this.searchLoc('');
        } else {
          this.msg = prevLoc;
        }
      } else {
        this.msg = this.searchLoc();
      }
    }
    return this.msg;
  },
  confirmGPS: function(data, event) {
      if ( ! this.useGPS() ) {
        if ( confirm("CONFIRM GPS: Use your current position to identify "
                    + "locations nearby?") ) {
          return true;
        } else {          
          event.stopImmediatePropagation();
          return false;
        }
      } else {        
        return true;
      }    
  },
  manAdd: function() {
    this.manRun(true);
  }

};
    
ko.applyBindings(viewModelLoc,document.getElementById("target-loc"));
ko.applyBindings(viewModelMsg,document.getElementById("msg-area"));

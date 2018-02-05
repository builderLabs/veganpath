var refZoom = 14;
var map = document.getElementById('map');


// set marker for user-specified origin address/location
function setOriginMarker(origin) {
  var originMrk = new google.maps.Marker({
        map: map,
        position: origin,        
        icon: "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|000066"
      });
}


function getYelpId(content) {
  // assumes last two html element ids: yelp-id and launch_detail in marker content
  var beg = content.indexOf("yelp-id") + content.substring(content.indexOf("yelp-id"),content.length).indexOf(">")+1;
  var end = beg+content.substring(beg,content.length).indexOf("<");
  return content.substring(beg,end);
}


function populateInfoWindow(marker, infowindow, idx ) {
  // Check to make sure the infowindow is not already opened on this marker.
  if (infowindow.marker != marker) {
    if ( infowindow.marker != null ) {
      
      var icon = {        
        url: 'http://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi-dotless_hdpi.png',
        scaledSize: new google.maps.Size(22,40)
      }
      infowindow.marker.setIcon(icon);  
      infowindow.marker.infowindow.close();
    }
    infowindow.marker = marker;
    infowindow.setContent('<div>' + marker.content + '</div>'); // pass content here
  
    var yelpid = getYelpId(marker.content);

      google.maps.event.addListener(infowindow, 'domready', function() {      
          document.getElementById("launch_detail").addEventListener("click", function() {
            getBusInfo(yelpid);
          });             
      });   

    infowindow.open(map, marker);

    // Make sure the marker property is cleared if the infowindow is closed.
    infowindow.addListener('closeclick',function(){
      document.getElementById('detail-pane').style.visibility = 'hidden';
      document.getElementById("map").style.height = "100vh";
      // set marker back to original 
      var icon = {        
        url: 'http://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi-dotless_hdpi.png',
        scaledSize: new google.maps.Size(22,40)
      }
      marker.setIcon(icon);      
      infowindow.setMarker = null;
    });    
  }  
}

function setMarkers(locations,origin) {

  setOriginMarker(origin);

  var markers = [];  
  var largeInfowindow = new google.maps.InfoWindow();
  var bounds = new google.maps.LatLngBounds();

  for (var i = 0; i < locations.length; i++) {
       
    var marker = new google.maps.Marker({
      map: map,      
      position: locations[i].location,
      label: locations[i].label,
      title: locations[i].title,
      content: locations[i].iwcontent,
      animation: google.maps.Animation.DROP,
      id: i
    });

    var infowindow = new google.maps.InfoWindow();
    infowindow.setContent('<div>' + marker.content + '</div>');    
    infowindow.addListener('closeclick',function(){
      infowindow.setMarker = null;
    });
    marker['infowindow'] = infowindow;


    marker.addListener('click', function() {

      var label = this.getLabel();            
      // animation: change marker color when clicked
      var icon = {        
        url: 'http://maps.google.com/mapfiles/kml/paddle/grn-blank.png',
        scaledSize: new google.maps.Size(40,40)
      }   
      this.setIcon(icon);      
      this.setLabel(label);
      populateInfoWindow(this, largeInfowindow, i);
    });
    
    markers.push(marker); 

    // extend the boundaries of the map for each marker
    bounds.extend(markers[i].position);     

  }
  
  bounds.extend(origin);
  map.fitBounds(bounds);

  // resize map to reflect populated markers
  google.maps.event.trigger(map, 'resize');

  google.maps.event.addDomListener(window,'resize',function(){
    map.fitBounds(bounds);
  })

  return markers;

}

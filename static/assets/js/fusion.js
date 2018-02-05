/* key urls */
var cors_anywhere_url 	= 'https://cors-anywhere.herokuapp.com/';
var yelp_search_url 	= cors_anywhere_url + "https://api.yelp.com/v3/businesses/search?"
                      	  + "latitude=LATITUDE&longitude=LONGITUDE&term=vegan,All&open_now=OPEN_NOW";
var yelp_business_url 	= cors_anywhere_url + "https://api.yelp.com/v3/businesses/BUSINESS_ID";
var google_maps_dir_url = "https://www.google.com/maps/dir/ORIGIN/DESTINATION";
var search_url 			= yelp_search_url;

/* msg area user messages */
var msg_requery = "(Rerun Required)";
var locError = "Required: address/loc or GPS.";
var mapError = "Location not found.";
var listError = "No results returned.";
var mobScroll = "(Scroll list for all results & click number.)";
var clearMsg = "";

var yelpList;
var origin;
var markers = [];
var vegList = [];
var busDetail = [];

/* utility constants */
var MOB_WIDTH = 600;
var M2FT = 3.28084;
var MIFEET = 5280;
var MTKM = 1000;
var QRYLAPSE = 2000; // min millisecs between API queries


/* set sort direction for key criteria */
var sortRef = {};
sortRef["price"] = "asc";
sortRef["dist"] = "asc";
sortRef["rating"] = "desc";


var detDone = document.getElementById('done'); 


// application-level error handler:
function yelpQueryErr(err){
	alert("Error executing Yelp query - returned status code: " + err);
}

/* AJAX Yelp Fusion Query */
function queryFusion(search_url,inputs,postProc) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', search_url, true);
	// error function in case of failure (xaction/network-level)
	xhr.onerror = function(){		
		alert("Error: Transaction error occured while executing Yelp query.");
	};
	// bearer token is evaluated and sent off immediately in our query request to Yelp
	xhr.setRequestHeader("Authorization", "Bearer " + inputs[0].term1.replace(inputs[1].term2,""));		
  	xhr.onreadystatechange = function() {
  	   console.log(xhr.responseText);
	   if (xhr.readyState == 4 && xhr.status == 200) {
	   	
	   	if ( postProc.name == "procResults" ) {
	   		yelpList = xhr.responseText;
	   	}
	   	postProc(xhr.responseText);

        } else if ( xhr.readyState == 4 && xhr.status !=200 ) {
        	yelpQueryErr(xhr.status);
        }
  	};
	xhr.send();
}


/* error handler/alert for credentials read failure */
function yelpReadError(status,error){
	var errMsg = "Error attempting to read yelp credentials - got: "+status+ " " + error;
	console.log(errMsg);
	alert(errMsg);
}


function fetchTerms(callback) {
	
	// exercise call limit to avoid gateway timeout:
	if ( sessionStorage.getItem("lastCall") != null ) {
		if ( (Date.now() - sessionStorage.getItem("lastCall")) < QRYLAPSE ) {
			return;
		}
	}
	sessionStorage.setItem("lastCall",Date.now());

    // request Yelp Fusion API credentials
	$.ajax({
		type: "POST",
		url: "/saltydog",
		success: callback,
		error: function(request, status, error) {
			yelpReadError(status,error);
		}
	});
}


function runBusQuery(terms) {
	var inputs = JSON.parse(terms);	
	queryFusion(search_url,inputs,procBusResults);
}


function runQuery(terms) {
	if ( screen.width > MOB_WIDTH ) {		
		viewModelMsg.msg(clearMsg);
	}
	document.getElementById('map').style.height = "100vh";
    var inputs = JSON.parse(terms);
	queryFusion(search_url,inputs,procResults);
}


function runFusionQuery(lat,lng) {	
	origin = { lat: lat, lng: lng};
	search_url = yelp_search_url.replace("LATITUDE",lat);
    search_url = search_url.replace("LONGITUDE",lng);
    search_url = search_url.replace("OPEN_NOW",viewModelOpenNowQuery.openNow());
	fetchTerms(runQuery);
}


function formatDist(dist) {
	if ( viewModelListDisplay.maxDistUnits() == "mi" ) {
		dist = (dist * M2FT) / MIFEET;
		return dist.toFixed(1)+" mi";
    } else {
    	dist = dist / MTKM;
    	return dist.toFixed(1)+" km";
    }
}


function getBusDistance(info) {	
	for ( mki=0; mki<markers.length; mki++) {
		var markerId = getYelpId(markers[mki].content); // showMarkers.js

		if ( markerId == info.id ) {
			var content = markers[mki].content;
			var beg = content.indexOf("Distance:")+10;
			var end = beg+content.substring(beg,content.length).indexOf("<br>");
		  	return content.substring(beg,end);
		}
	}
}


function getDirUrl(info) {
	var dirUrl = google_maps_dir_url;
	for ( mki=0; mki<vegList.length; mki++) {
		if ( vegList[mki].id == info.id ) {
			var dest = vegList[mki].location;
			dirUrl = dirUrl.replace("ORIGIN",origin.lat+","+origin.lng);
			dirUrl = dirUrl.replace("DESTINATION",dest.lat+","+dest.lng);
			return dirUrl;
		}
	}
}

/* our data model for results obtained from querying business-specific details from Yelp search API  */
function procBusResults(info) {
	
	busDetail = [];
	info = JSON.parse(info);

    var open_now = "OPEN NOW";
    if ( info.hours ) {
	    if ( ! info.hours[0].is_open_now ) {
	    	open_now = "CLOSED NOW";
	    }
	} else {
		open_now = "UNKNOWN";
	}

    var photos = [];
    for ( phi = 0; phi < info.photos.length; phi++ ){
    	photos.push(info.photos[phi]);
    }
	
	// distance not part of Yelp business query so we strip it from marker info
    var detDist = getBusDistance(info);

    // construct Google Maps Directions url
    var dirUrl = getDirUrl(info);

    busDetail = {
    				name: info.name,
    				url: info.url,
    				dir_url: dirUrl,
    				yelpLink: info.name + " (Yelp)",
    				phone: info.display_phone,
    				address: info.location.display_address,
    				price: info.price,
    				rating: info.rating,
    				dist: detDist,
    				review_count: info.review_count,
    				distance: detDist,
    				cross_st: info.location.cross_streets,
    				status: open_now,
    				mob_stats: info.price + " / " + info.rating + " ("+info.review_count+" reviews) / " + detDist,
    				photos: photos
    };

	viewModelDet.runQuery(busDetail);
}


function procSkey(skey) {
	switch (viewModelListDisplay.rankSort()) {
		case "dist": // asc
			skey = Number(skey.split(" ")[0]);
			return skey;
		case "price": // asc
			skey = skey.length;
			return skey;
		case "rating": // desc
			skey = Number(skey);
			return skey;
	}	
}


/* our data model for results obtained from Yelp search API  */
function procResults(info) {

	info = JSON.parse(info);
	
	vegList = {};
	var label = 1;
  	for ( var loc = 0; loc < info.businesses.length; loc++) {

  		var title   = info.businesses[loc].name;
  		var lat     = parseFloat(info.businesses[loc].coordinates.latitude);
	  	var lng     = parseFloat(info.businesses[loc].coordinates.longitude);
	  	var price   = info.businesses[loc].price;
	  	var rating  = info.businesses[loc].rating;
	  	var dist    = formatDist(info.businesses[loc].distance);
	  	var id      = info.businesses[loc].id;
	  	var address = info.businesses[loc].location.display_address;

	  	var skey = eval(viewModelListDisplay.rankSort());
	  	skey = procSkey(skey);
	  	

	  	if ( isNaN(lat) || isNaN(lng) || lat == null || lng == null ) {
	  		continue;
	  	}

	  	var content = "	Price: " + price + " Rating: " + rating + " Distance: " + dist;
	  	var iwcontent = '<div id="mrkheader">'+title+'</div>'+'<hr>'+'<div id = "mrkinfo">' + content + '<br>'+address+'</div>'
	  	                + '<br>' + '<span id="yelp-id">'+ id +'</span>' + '<button id="launch_detail">Details</button>'
	  	                + '<span><img class="iw-yelp-logo" src="static/assets/img/logos/yelp_logo.png") }}" alt="yelp-logo"></span>';

	  	
		if ( ! ( skey in vegList) ) {
			vegList[skey] = {};
		}		
		vegList[skey][id] = {
				  				title: info.businesses[loc].name,
			   	          		location: {lat:lat, lng:lng},
			   	          		dist: dist,			   	          		
			   	          		content: content,
			   	          		iwcontent: iwcontent,
			   	          		address: address,
			   	          		id: id
		   	      	  	  };

 	}

 	viewModelListDisplay.applyFilter(); 	
 	viewModelListDisplay.applySort();
 	console.log(vegList);
 	markers = setMarkers(vegList,origin);
	viewModel.runQuery(vegList);
	
}


function resetMarkers() {
    for (var iwn = 0; iwn < markers.length; iwn++){
    	markers[iwn].setIcon(defIcon);
		markers[iwn]['infowindow'].close(map,markers[iwn]);
	}
}


function getInfoWindow(idx) {

	var marker = markers[idx];

	resetMarkers();
	
	/* change marker color when clicked/selected */
	var label = marker.getLabel();
  	var icon = {
        url: 'http://maps.google.com/mapfiles/kml/paddle/grn-blank.png',
        scaledSize: new google.maps.Size(40,40)
    }
	marker.setIcon(icon);
    marker.setLabel(label);
	marker['infowindow'].open(map,marker);
  	
	marker['infowindow'].addListener('closeclick',function(){
		document.getElementById('detail-pane').style.visibility = 'hidden';
		document.getElementById("map").style.height = "100vh";
		marker.setIcon(defIcon);
		marker.setLabel(label);
      	marker['infowindow'].close(map,marker);
	});
}


function getBusInfo(idx) {
	if ( Number.isInteger(idx)) {
		search_url = yelp_business_url.replace("BUSINESS_ID",vegList[idx].id);
	} else {
		search_url = yelp_business_url.replace("BUSINESS_ID",idx);
	}	
	fetchTerms(runBusQuery);
}


function adjustView() {
	if ( screen.width < MOB_WIDTH ) {
		document.getElementById("map").style.height = "45vh";
		document.getElementById('detail-pane').style.height = "25vh";		
	} else {
		document.getElementById("map").style.height = "75vh";
	}
	document.getElementById('detail-pane').style.visibility = 'visible';
}


detDone.addEventListener('click',function(){
	document.getElementById('detail-pane').style.visibility = "hidden";
	document.getElementById('map').style.height = "100vh";
})



var viewModelOpenNowQuery = {
	openNow: ko.observable(false),
	toggleOpenNow: function(){
		if ( screen.width < MOB_WIDTH ) {
			alert(msg_requery);
		} else {				
			viewModelMsg.msg(msg_requery);
		}		
	}
}


var viewModelListDisplay = {
	rankSort: ko.observable("dist"),
	maxDist: ko.observable("Max"),
	maxDistUnits: ko.observable("mi"),

	toggleMarkers: function(mode) {
		for (mki=0; mki<markers.length; mki++) {
			markers[mki].setVisible(mode);
		}
	},

	/* 
		Note: our filter is a unidirectional *numerical* filter meant to 
		constrain display results to a maximum distance. I have not seen any
		documentation on native knockout methods which address this specific 
		use-case scenario, unlike the many versatile string-based filtration
		methods for which many demonstrations exist.
	*/

	applyFilter: function() {
		if ( this.maxDist() == "all") {
			return;
		}
		var fvegList = {};
		var sKeys = Object.keys(vegList);
		for ( ski=0; ski < sKeys.length; ski++ ){
			var idKeys = Object.keys(vegList[sKeys[ski]]);
			for ( idi=0; idi < idKeys.length; idi++) {
				if ( Number(vegList[sKeys[ski]][idKeys[idi]].dist.split(" ",1)) <= Number(this.maxDist()) ) {
					if ( ! ( sKeys[ski] in fvegList) ) {
						fvegList[sKeys[ski]] = {};
					}
					fvegList[sKeys[ski]][idKeys[idi]] = vegList[sKeys[ski]][idKeys[idi]];
				}
			}
		}
		vegList = {};
		vegList = fvegList;
	},

	applySort: function() {

		var sortDir = sortRef[this.rankSort()];		
		var sKeys = Object.keys(vegList);		

		if ( sortDir == "desc" ) {
			sKeys = sKeys.sort(function(a, b){return b - a});
		} else {
			sKeys = sKeys.sort(function(a, b){return a - b});
		}

		var svegList = [];
		var label = 1;
		for ( var kyi = 0; kyi < sKeys.length; kyi++ ) {
			idKeys = Object.keys(vegList[sKeys[kyi]]);
			for ( var kid = 0; kid < idKeys.length; kid++ ) {
				var rec = vegList[sKeys[kyi]][idKeys[kid]];
				rec["label"] = label.toString();
				svegList.push(rec);
				label++;
			}
		}
		vegList = [];
		vegList = svegList;
	},	

	reformat: function() {
		this.toggleMarkers(false);		
		procResults(yelpList);
		this.toggleMarkers(true);
	}

};


$( "#map" ).click(function() {
   $("#floating-listings").css("height","12vh");
   $("#floating-listings").css("opacity","0.7");
});


function viewModelQuery() {	
	var self = this;
	self.launchQuery = function(){

		if (viewModelLoc.useGPS()) {    
	    		getGeolocation();    
	   	} else {    
	      if ( ! viewModelLoc.searchLoc() ) {
	        if ( screen.width < MOB_WIDTH ) {
	          alert(locError);
	        } else {
	          viewModelMsg.msg(locError);
	        }
	      } else {
	        getCred(credFile,geoCode);
	      }
	  }	  
	}
	
}


/* view for our list */
function viewModel() {
	
	var self = this;
	self.myList = ko.observableArray(vegList);	
	self.runQuery = function (listData) {

		// reset map & clear errors/msgs from previous xaction
		viewModelMsg.msg(clearMsg); 
		document.getElementById("map").style.opacity = 1; // cosmetic change
		
		self.myList(vegList);
		if (vegList.length == 0) {
			if ( screen.width < MOB_WIDTH ) {
				alert(listError);
			} else {				
				viewModelMsg.msg(listError);
			}
		} else if ( vegList.length > 1 && screen.width < MOB_WIDTH) {
			viewModelMsg.msg(mobScroll);
		} else {
			viewModelMsg.msg(clearMsg);
		}
		$('#spots li').on('click', function() {
			var idx = $(this).index();
		    map.panTo(new google.maps.LatLng(vegList[idx].location.lat,vegList[idx].location.lng));
		    getInfoWindow(idx);
		    getBusInfo(idx);
		});
	}	

}


/* view for business-specific detail data */
function viewModelDet() {
	var self = this;
	self.myDetail = ko.observableArray(busDetail);
	self.runQuery = function(busData) {
		self.myDetail(busDetail);
		adjustView();
	}

}

var viewModelQuery = new viewModelQuery();
ko.applyBindings(viewModelQuery, document.getElementById("find"));

var viewModel = new viewModel();
ko.applyBindings(viewModel, document.getElementById("listings"));
ko.applyBindings(viewModel, document.getElementById("floating-listings"));

var viewModelDet = new viewModelDet();
ko.applyBindings(viewModelDet, document.getElementById("detail-pane"));

ko.applyBindings(viewModelOpenNowQuery,document.getElementById("filt-open-now"));
ko.applyBindings(viewModelListDisplay, document.getElementById("opt-rank-by"));
ko.applyBindings(viewModelListDisplay, document.getElementById("filt-max-dist"));
ko.applyBindings(viewModelListDisplay, document.getElementById("filt-max-dist-unit"));

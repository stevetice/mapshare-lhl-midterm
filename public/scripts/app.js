var map;
var markerCount = [];
var infos = [];
var textBox = [];
var markerArray = [];
var editElement = '';

// Infos refers to map markers
function closeInfos() {
  if (infos.length > 0) {
    infos[0].set("marker", null);
    infos[0].close();
    infos.length = 0;
  }
}
// textBox refers to the form for new list items
function closeTextBox(){

  if(textBox.length > 0){

    /* detach the info-window from the marker ... undocumented in the API docs */
    textBox[0].set("marker", null);

    /* and close it */
    textBox[0].close();

    /* blank the array */
    textBox.length = 0;
  }
}

function setMarkers(map, items) {
  if (!items) {
    return;
  }


  var bounds = new google.maps.LatLngBounds();
  for (var i = 0; i < items.length; i++) {
    var infowindow = new google.maps.InfoWindow();
    var item = items[i];
    var content = item.name;
    var marker = new google.maps.Marker({
      position: {lat: item.latitude, lng: item.longitude},
      map: map
    });
    markerCount.push(marker);
    bounds.extend(marker.position);



    var contentString = `<p>${item.name}</p><p>${item.description}</p><img src='${item.image_url}'><p class='modify-item' style='visibility: hidden;'>${item.id}</p><button class='editMe' type='button'>Edit</button><button class='deleteMe' type='button'>Delete</button><p class='hidden'>${item.latitude}</p><p class='hidden'>${item.longitude}</p>`;
    marker.setMap(map);
    infowindow.setContent(contentString);
    google.maps.event.addListener(marker, 'click', (function(marker, infowindow){
      return function() {
        closeInfos();
        infowindow.open(map, marker);
        infos[0] = infowindow;

        // Set all html info to 'content', use 'el' to hold html info then target .modify-item to extract item ID. editElement stores the item ID of the last clicked item in a global variable
        var content = infowindow.content;
        var el = $('<div></div>');
        el.html(content);
        var $edit = $('.modify-item', el).text();
        editElement = $edit;

        $('.editMe').click(function() {
          var editString = `<form action='/items/edit' method='POST' id='edit-item'><input name='name' type='name' id='markerName' placeholder='Name:'><br><input name='description' type='text' id='markerDescription' placeholder='Description:'><br><input name='img' type='url' id='markerImage' placeholder='http://imgurl.com'><br><input type='submit' value='Submit'/></form>`;
          infowindow.setContent(editString);

          google.maps.event.addListener(infowindow, 'closeclick', function() {
            event.preventDefault();
            infowindow.setContent(content);
          });

          $('#edit-item').on('submit', function(event) {
            event.preventDefault();
            closeTextBox();
            var $protoForm = $(this).serialize();
            var $form = $protoForm + '&id=' + editElement;
            var markers = markerArray[0];
            var listId = markers[0].list_id;
            var link = '/lists/' + listId;
            utils.request("POST", "/items/edit", $form)
              .then(function(response) {
                if (response.message) {
                  $.flash(response.message);
                }
              }).then(closeInfos())
              .then(utils.request("GET", link).then(function(items) {
                initMap(items);
              }));
          });
        });

        $('.deleteMe').click(function() {
          event.preventDefault();
          infowindow.close();
          var deleteUrl = '/items/' + editElement + '/delete';
          utils.request("GET", deleteUrl)
            .then(function(response) {
              if (response.message) {
                $.flash(response.message);
              }
            }).then(closeInfos());
        });
      };
    }(marker, infowindow)));
  }
  map.fitBounds(bounds);
}

function initMap(items) {
  var victoriaBc = {lat: 48.428, lng: -123.365};
  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: victoriaBc
  });
  setMarkers(map, items);

  google.maps.event.addListener(map, "rightclick", function (event) {
    // if (markerCount.length === 0) { return; }
    closeTextBox();
    var infowindow = new google.maps.InfoWindow();
    var latitude = event.latLng.lat();
    var longitude = event.latLng.lng();
    var formStr = `<form action='/items/new' method='POST' id='new-item'><input type='text' name='list_id' id='listId' style='display: none;'value='${items[0].list_id}'><input name='name' type='name' id='markerName' placeholder='Name:'><br><input name='description' type='text' id='markerDescription' placeholder='Description:'><br><input name='img' type='url' id='markerImage' placeholder='http://imgurl.com'><br><input type='text' name='lat' value=${latitude} style='display: none;' readonly><input type='text' name='long' value=${longitude} style='display: none;' readonly><input type='submit' value='Submit'/></form>`;

    infowindow.setContent(formStr);
    infowindow.setPosition(event.latLng);
    infowindow.open(map);
    textBox[0] = infowindow;
    $("#new-item").on("submit", handleNewItem);
  });
}

function handleNewItem(event) {
  event.preventDefault();
  var serialArray = $(this).serializeArray();
  var list_id = serialArray[0].value;
  var $form = $(this).serialize();
  var link = "/lists/";
  var listUrl = link + list_id;
  utils.request("POST", "/items/new", $form)
    .then(function(response) {
      if (response.message) {
        $.flash(response.message);
      }
    }).then(closeTextBox())
    .then( utils.request("GET", listUrl).then(function (items) {
      initMap(items);
    }));
}


// Document Ready
$( function () {
  var listsUrl = "/lists/";
  utils.request("GET", "/lists").then(function (lists) {
    for(list of lists) {
      $("<a>").text(list.name).attr('class', 'list-item').attr('id', list.id).append("<br>").appendTo($("#list-container"));
      $('#left-col').on('click', '.list-item', function (event) {
        markerArray = [];
        event.preventDefault();
        event.stopImmediatePropagation();
        var id = listsUrl + $(this).attr('id');
        utils.request("GET", id).then(function (items) {
          markerArray.push(items);
          initMap(items);
        });
      });
    }
  });
  initMap();
});



// ----------- State ------------

let poi = [] // Set of markers
let position = null
let nearbyPosition = null
let currentMarkerIndex = null

// ----------- Map Configuration ------------

const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 16,
    mapTypeId: google.maps.MapTypeId.TERRAIN,
    disableDefaultUI: true,
    styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] }
    ]
})

const bikeLayer = new google.maps.BicyclingLayer()
bikeLayer.setMap(map)

const positionMarker = new google.maps.Marker({ map: map })

// ----------- COBI.Bike DevKit Hooks ------------

COBI.init("token — can by anything right now")

COBI.mobile.location.subscribe(function(location) {
    $("#simulator-overlay").fadeOut(300)
    updatePosition(location)
    updateNearbyPlaces()
})

COBI.hub.externalInterfaceAction.subscribe(function(action) {
    switch (action) {
        case "RIGHT":
            return updateSelectedMarker(currentMarkerIndex === null ? 0 : currentMarkerIndex + 1)
        case "LEFT":
            return updateSelectedMarker(currentMarkerIndex === null ? poi.length - 1 : currentMarkerIndex - 1)
        case "UP":
            return map.setZoom(map.getZoom() + 1)
        case "DOWN":
            return map.setZoom(map.getZoom() - 1)
        case "SELECT":
            return toggleRouting()
    }
})

// ----------- Logic ------------

const updatePosition = function(location) {
    position = new google.maps.LatLng(location.coordinate.latitude, location.coordinate.longitude)
    positionMarker.setPosition(position)
    if (currentMarkerIndex === null) {
        map.panTo(position)
    }
}

const updateSelectedMarker = function(index) {
    // Reset icon of last selected marker
    if (currentMarkerIndex !== null) {
        poi[currentMarkerIndex].setIcon(markerIcon)
    }

    // Update index
    currentMarkerIndex = index
    if (currentMarkerIndex >= poi.length || currentMarkerIndex < 0) {
        resetSelectedMarker()
        return
    }

    // Set hilighted icon and scroll to marker
    poi[currentMarkerIndex].setIcon(selectdMarkerIcon)
    map.panTo(poi[currentMarkerIndex].getPosition())

    // Show POI name in info bar 
    $("#bar").fadeIn(300)
    $("#bar").html(poi[currentMarkerIndex].getTitle() + " (press ⊙ to navigate)")
}

const resetSelectedMarker = function() {
    if (currentMarkerIndex !== null) {
        currentMarkerIndex = null
        navigationMarkerIndex = null
        map.panTo(position)
        $("#bar").fadeOut(300)
    }
}

const toggleRouting = function() {
    if (currentMarkerIndex !== null) {
        $("#navigation-destination").html("📍 " + poi[currentMarkerIndex].getTitle())
    }
    $("#navigation-overlay").fadeToggle(300)
}

// ----------- Points of Interest ------------

const service = new google.maps.places.PlacesService(map)
const updateNearbyPlaces = function radar() {
    if (!position) {
        return
    }

    // Only update when position is not too close to the last nearby location
    if (nearbyPosition) {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(position, nearbyPosition)
        if (distance < 50) {
            return
        }
    }

    console.log("🚲 Updating nearby points of interest")
    nearbyPosition = position

    resetSelectedMarker()
    poi.map(marker => marker.setMap(null)) // remove previous markers

    const callback = function(results, status) {
        if (status != google.maps.places.PlacesServiceStatus.OK) {
            console.log("⚠️ Received no results: " + status)
            return
        }

        console.log("🚲 Received " + results.length + " nearby results")

        poi = results.slice(0, 5).map(result => new google.maps.Marker({
            position: result.geometry.location,
            map: map,
            icon: markerIcon,
            title: result.name
        }))
    }

    service.nearbySearch({
        location: position,
        rankBy: google.maps.places.RankBy.DISTANCE,
        type: ["bar"],
        openNow: true
    }, callback)
}

// ----------- Assets ------------

const markerIcon = {
    url: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgd2lkdGg9IjQ2cHgiIGhlaWdodD0iNjBweCIgdmlld0JveD0iMCAwIDQ2IDYwIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPg0KICAgIDwhLS0gR2VuZXJhdG9yOiBTa2V0Y2ggNDYuMiAoNDQ0OTYpIC0gaHR0cDovL3d3dy5ib2hlbWlhbmNvZGluZy5jb20vc2tldGNoIC0tPg0KICAgIDx0aXRsZT5tYXJrZXItYmx1ZTwvdGl0bGU+DQogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+DQogICAgPGRlZnM+PC9kZWZzPg0KICAgIDxnIGlkPSJQYWdlLTEiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPg0KICAgICAgICA8ZyBpZD0ibWFya2VyLWJsdWUiIGZpbGwtcnVsZT0ibm9uemVybyI+DQogICAgICAgICAgICA8cGF0aCBkPSJNMjIuOCw2MCBDMzgsNDMuNTk0NzI4MiA0NS42LDMxLjE5NDcyODIgNDUuNiwyMi44IEM0NS42LDEwLjIwNzkwNzcgMzUuMzkyMDkyMywwIDIyLjgsMCBDMTAuMjA3OTA3NywwIDAsMTAuMjA3OTA3NyAwLDIyLjggQzAsMzEuMTk0NzI4MiA3LjYwMDAwMDAyLDQzLjU5NDcyODIgMjIuOCw2MCBaIiBpZD0iT3ZhbCIgZmlsbD0iIzAwQzhFNiI+PC9wYXRoPg0KICAgICAgICAgICAgPHBhdGggZD0iTTI3LjQzMjc1NTgsMTguMjg2Njg5OSBMMjIuMzI2MzA3MywxOC4yODY2ODk5IEwyMS41ODg4MTU5LDEzLjI4MTk5ODggQzIxLjUzMTMyOCwxMi44OTAzMDc4IDIxLjE5NTI1NDMsMTIuNiAyMC43OTkxOTg3LDEyLjYgTDEyLjYsMTIuNiBMMTIuNiwxNC4xOTYzMTg1IEwyMC4xMTA0NjYsMTQuMTk2MzE4NSBMMjAuNzEzMDI5MiwxOC4yODY2ODk5IEwxNS4xOTc4MDU0LDE4LjI4NjY4OTkgTDIzLjI3NDc5NTYsMzAuMzc3ODU4MSBMMjMuMjc0Nzk1NiwzOC4wMzkzMzkgTDIwLjc4MDc0MjcsMzguMDM5MzM5IEwyMC43ODA3NDI3LDM5LjczNTU0NDQgTDI3LjM2NDU0MzQsMzkuNzM1NTQ0NCBMMjcuMzY0NTQzNCwzOC4wMzkzMzkgTDI0Ljg3MDQ5MDYsMzguMDM5MzM5IEwyNC44NzA0OTA2LDMwLjM3Nzg1ODEgTDI5LjYxOTkxNTQsMjMuMjYxMDc4MyBMMzIuNzYyOTY5NywxOC4yODY2ODk5IEwyNy40MzI3NTU4LDE4LjI4NjY4OTkgWiBNMjkuOTU0MTE4NSwxOS44ODIzODQ5IEwyOC44MjIwNjc5LDIxLjU3ODU5MDMgTDIyLjgxMTUyNTMsMjEuNTc4NTkwMyBMMjIuNTYxNjIxMSwxOS44ODIzODQ5IEwyOS45NTQxMTg1LDE5Ljg4MjM4NDkgWiBNMjAuOTQ4MjE4NCwxOS44ODIzODQ5IEwyMS4xOTgxMjI1LDIxLjU3ODU5MDMgTDE5LjMxNDk4NzksMjEuNTc4NTkwMyBMMTguMTgyOTM3MywxOS44ODIzODQ5IEwyMC45NDgyMTg0LDE5Ljg4MjM4NDkgWiIgaWQ9ImNvY2t0YWlsIiBmaWxsPSIjRkZGRkZGIj48L3BhdGg+DQogICAgICAgIDwvZz4NCiAgICA8L2c+DQo8L3N2Zz4="
}
const selectdMarkerIcon = {
    url: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgd2lkdGg9IjQ2cHgiIGhlaWdodD0iNjBweCIgdmlld0JveD0iMCAwIDQ2IDYwIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPg0KICAgIDwhLS0gR2VuZXJhdG9yOiBTa2V0Y2ggNDYuMiAoNDQ0OTYpIC0gaHR0cDovL3d3dy5ib2hlbWlhbmNvZGluZy5jb20vc2tldGNoIC0tPg0KICAgIDx0aXRsZT5tYXJrZXItY29yYWw8L3RpdGxlPg0KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPg0KICAgIDxkZWZzPjwvZGVmcz4NCiAgICA8ZyBpZD0iUGFnZS0xIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4NCiAgICAgICAgPGcgaWQ9Im1hcmtlci1jb3JhbCIgZmlsbC1ydWxlPSJub256ZXJvIj4NCiAgICAgICAgICAgIDxwYXRoIGQ9Ik0yMi44LDYwIEMzOCw0My41OTQ3MjgyIDQ1LjYsMzEuMTk0NzI4MiA0NS42LDIyLjggQzQ1LjYsMTAuMjA3OTA3NyAzNS4zOTIwOTIzLDAgMjIuOCwwIEMxMC4yMDc5MDc3LDAgMCwxMC4yMDc5MDc3IDAsMjIuOCBDMCwzMS4xOTQ3MjgyIDcuNjAwMDAwMDIsNDMuNTk0NzI4MiAyMi44LDYwIFoiIGlkPSJPdmFsLUNvcHkiIGZpbGw9IiNGQTRCNjkiPjwvcGF0aD4NCiAgICAgICAgICAgIDxwYXRoIGQ9Ik0yNi44MzI3NTU4LDE4LjI4NjY4OTkgTDIxLjcyNjMwNzMsMTguMjg2Njg5OSBMMjAuOTg4ODE1OSwxMy4yODE5OTg4IEMyMC45MzEzMjgsMTIuODkwMzA3OCAyMC41OTUyNTQzLDEyLjYgMjAuMTk5MTk4NywxMi42IEwxMiwxMi42IEwxMiwxNC4xOTYzMTg1IEwxOS41MTA0NjYsMTQuMTk2MzE4NSBMMjAuMTEzMDI5MiwxOC4yODY2ODk5IEwxNC41OTc4MDU0LDE4LjI4NjY4OTkgTDIyLjY3NDc5NTYsMzAuMzc3ODU4MSBMMjIuNjc0Nzk1NiwzOC4wMzkzMzkgTDIwLjE4MDc0MjcsMzguMDM5MzM5IEwyMC4xODA3NDI3LDM5LjczNTU0NDQgTDI2Ljc2NDU0MzQsMzkuNzM1NTQ0NCBMMjYuNzY0NTQzNCwzOC4wMzkzMzkgTDI0LjI3MDQ5MDYsMzguMDM5MzM5IEwyNC4yNzA0OTA2LDMwLjM3Nzg1ODEgTDI5LjAxOTkxNTQsMjMuMjYxMDc4MyBMMzIuMTYyOTY5NywxOC4yODY2ODk5IEwyNi44MzI3NTU4LDE4LjI4NjY4OTkgWiBNMjkuMzU0MTE4NSwxOS44ODIzODQ5IEwyOC4yMjIwNjc5LDIxLjU3ODU5MDMgTDIyLjIxMTUyNTMsMjEuNTc4NTkwMyBMMjEuOTYxNjIxMSwxOS44ODIzODQ5IEwyOS4zNTQxMTg1LDE5Ljg4MjM4NDkgWiBNMjAuMzQ4MjE4NCwxOS44ODIzODQ5IEwyMC41OTgxMjI1LDIxLjU3ODU5MDMgTDE4LjcxNDk4NzksMjEuNTc4NTkwMyBMMTcuNTgyOTM3MywxOS44ODIzODQ5IEwyMC4zNDgyMTg0LDE5Ljg4MjM4NDkgWiIgaWQ9ImNvY2t0YWlsLWNvcHkiIGZpbGw9IiNGRkZGRkYiPjwvcGF0aD4NCiAgICAgICAgPC9nPg0KICAgIDwvZz4NCjwvc3ZnPg=="
}
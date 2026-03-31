let currentMapRequestId = null;
let currentMapVolunteerData = null;


function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initializeLocationMap() {
    const mapClose = document.getElementById('location-map-close');
    const refreshLocationBtn = document.getElementById('refresh-location-btn');
    const openInMapsBtn = document.getElementById('open-in-maps-btn');
    
    if (mapClose) {
        mapClose.addEventListener('click', closeLocationMap);
    }
    
    if (refreshLocationBtn) {
        refreshLocationBtn.addEventListener('click', () => {
            if (currentMapRequestId) {
                loadVolunteerLocation(currentMapRequestId);
            }
        });
    }
    
    if (openInMapsBtn) {
        openInMapsBtn.addEventListener('click', openInGoogleMaps);
    }
    
    // Close map when clicking outside
    const mapModal = document.getElementById('location-map-modal');
    if (mapModal) {
        mapModal.addEventListener('click', (e) => {
            if (e.target === mapModal) {
                closeLocationMap();
            }
        });
    }
}

// Open location map for accepted offer
async function openLocationMap(requestId) {
    console.log('📍 Opening location map for request:', requestId);
    
    if (!currentUser || currentUser.role !== 'requester') {
        showNotification('Only requesters can view volunteer locations', 'error');
        return;
    }
    
    currentMapRequestId = requestId;
    
    const mapModal = document.getElementById('location-map-modal');
    if (mapModal) {
        mapModal.style.display = 'flex';
    }
    
    // Show loading state
    const mapDisplay = document.getElementById('map-display');
    if (mapDisplay) {
        mapDisplay.innerHTML = `
            <div class="map-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading location...</p>
            </div>
        `;
    }
    
    // Load volunteer location
    await loadVolunteerLocation(requestId);
}

// Close location map
function closeLocationMap() {
    const mapModal = document.getElementById('location-map-modal');
    if (mapModal) {
        mapModal.style.display = 'none';
    }
    
    currentMapRequestId = null;
    currentMapVolunteerData = null;
}

// Load volunteer location from server - FIXED VERSION
async function loadVolunteerLocation(requestId) {
    console.log('🔍 Loading volunteer location for request:', requestId);
    
    const mapDisplay = document.getElementById('map-display');
    
    try {
        const response = await fetch(`${API_URL}/requests/${requestId}/volunteer-location`, {
            credentials: 'include'
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 404) {
                console.warn('❌ Volunteer location not found (404)');
                displayLocationUnavailable();
                return;
            } else if (response.status === 403) {
                console.error('❌ Access denied (403)');
                displayLocationError('Access denied. You do not have permission to view this location.');
                return;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Server error:', errorData);
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
        }
        
        const volunteerData = await response.json();
        console.log('✅ Volunteer data received:', volunteerData);
        
        currentMapVolunteerData = volunteerData;
        displayVolunteerLocation(volunteerData);
        
    } catch (error) {
        console.error('❌ Load location error:', error);
        displayLocationError('Failed to load volunteer location. The volunteer may not have shared their location yet.');
    }
}

// Display volunteer location on map
function displayVolunteerLocation(volunteer) {
    console.log('🗺️ Displaying volunteer location:', volunteer);
    
    const mapVolunteerName = document.getElementById('map-volunteer-name');
    const mapVolunteerAvatar = document.getElementById('map-volunteer-avatar');
    const mapLocationTime = document.getElementById('map-location-time');
    
    // Update volunteer info
    if (mapVolunteerName) {
        mapVolunteerName.textContent = volunteer.name;
    }
    
    if (mapVolunteerAvatar) {
        mapVolunteerAvatar.textContent = getInitials(volunteer.name);
    }
    
    if (mapLocationTime) {
        if (volunteer.location_updated_at) {
            const updatedTime = new Date(volunteer.location_updated_at);
            mapLocationTime.textContent = updatedTime.toLocaleString();
        } else {
            mapLocationTime.textContent = 'Not available';
        }
    }
    
    // Check if location data is available
    if (!volunteer.current_latitude || !volunteer.current_longitude) {
        console.warn('⚠️ Location coordinates not available');
        displayLocationUnavailable();
        return;
    }
    
    const lat = parseFloat(volunteer.current_latitude);
    const lon = parseFloat(volunteer.current_longitude);
    
    console.log('📍 Coordinates:', { lat, lon });
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lon)) {
        console.error('❌ Invalid coordinates:', { lat, lon });
        displayLocationError('Invalid location coordinates received');
        return;
    }
    
    // Update coordinates display
    const locationCoordinates = document.getElementById('location-coordinates');
    if (locationCoordinates) {
        locationCoordinates.innerHTML = `
            <p>
                <i class="fas fa-map-pin"></i>
                Latitude: ${lat.toFixed(6)}, Longitude: ${lon.toFixed(6)}
            </p>
        `;
    }
    
    // Display map using OpenStreetMap
    displayOpenStreetMap(lat, lon, volunteer.name);
    
    // Show "Open in Google Maps" button
    const openInMapsBtn = document.getElementById('open-in-maps-btn');
    if (openInMapsBtn) {
        openInMapsBtn.style.display = 'block';
    }
}

// Display map using OpenStreetMap - FIXED VERSION
function displayOpenStreetMap(lat, lon, name) {
    console.log('🗺️ Creating map with Leaflet:', { lat, lon, name });
    
    const mapDisplay = document.getElementById('map-display');
    if (!mapDisplay) return;
    
    // Validate coordinates
    const validLat = parseFloat(lat);
    const validLon = parseFloat(lon);
    
    if (isNaN(validLat) || isNaN(validLon) || 
        validLat < -90 || validLat > 90 || 
        validLon < -180 || validLon > 180) {
        console.error('❌ Invalid coordinates:', { validLat, validLon });
        displayLocationError('Invalid coordinates received');
        return;
    }
    
    const safeName = escapeHtml(name);
    mapDisplay.innerHTML = ''; // Clear previous map
    
    try {
        // Check if Leaflet is loaded
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet library not loaded');
            displayLocationError('Map library not loaded. Please refresh the page.');
            return;
        }
        
        // Create the map
        const map = L.map(mapDisplay).setView([validLat, validLon], 15);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(map);
        
        // Add marker
        const marker = L.marker([validLat, validLon]).addTo(map);
        marker.bindPopup(`<b>${safeName}</b><br>Volunteer Location`).openPopup();
        
        console.log('✅ Map created successfully');
        
    } catch (error) {
        console.error('❌ Error creating map:', error);
        displayLocationError('Failed to create map: ' + error.message);
    }
}

// Display location unavailable message
function displayLocationUnavailable() {
    const mapDisplay = document.getElementById('map-display');
    if (!mapDisplay) return;
    
    mapDisplay.innerHTML = `
        <div class="location-unavailable">
            <i class="fas fa-map-marked-alt"></i>
            <h3>Location Not Available</h3>
            <p>The volunteer hasn't shared their location yet. They can enable location sharing from their dashboard.</p>
        </div>
    `;
    
    // Hide "Open in Google Maps" button
    const openInMapsBtn = document.getElementById('open-in-maps-btn');
    if (openInMapsBtn) {
        openInMapsBtn.style.display = 'none';
    }
}

// Display error message
function displayLocationError(message) {
    const mapDisplay = document.getElementById('map-display');
    if (!mapDisplay) return;
    
    mapDisplay.innerHTML = `
        <div class="location-error">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error</h3>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    
    // Hide "Open in Google Maps" button
    const openInMapsBtn = document.getElementById('open-in-maps-btn');
    if (openInMapsBtn) {
        openInMapsBtn.style.display = 'none';
    }
}

// Open location in Google Maps
function openInGoogleMaps() {
    if (!currentMapVolunteerData || 
        !currentMapVolunteerData.current_latitude || 
        !currentMapVolunteerData.current_longitude) {
        showNotification('Location not available', 'error');
        return;
    }
    
    const lat = currentMapVolunteerData.current_latitude;
    const lon = currentMapVolunteerData.current_longitude;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    
    window.open(url, '_blank');
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLocationMap);
} else {
    initializeLocationMap();
}
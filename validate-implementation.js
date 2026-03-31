// Validation script for chatbox and location features
const fs = require('fs');
const path = require('path');

console.log('\n🔍 Validating Chatbox and Location Implementation...\n');

let passed = 0;
let failed = 0;

function checkFile(filepath, description) {
    const exists = fs.existsSync(filepath);
    if (exists) {
        console.log(`✅ ${description}`);
        passed++;
        return true;
    } else {
        console.log(`❌ ${description} - File not found: ${filepath}`);
        failed++;
        return false;
    }
}

function checkFileContent(filepath, searchString, description) {
    if (!fs.existsSync(filepath)) {
        console.log(`❌ ${description} - File not found: ${filepath}`);
        failed++;
        return false;
    }
    
    const content = fs.readFileSync(filepath, 'utf8');
    if (content.includes(searchString)) {
        console.log(`✅ ${description}`);
        passed++;
        return true;
    } else {
        console.log(`❌ ${description} - Content not found: ${searchString}`);
        failed++;
        return false;
    }
}

console.log('📋 Checking Database Schema Updates...');
checkFileContent('whatyaneed-database.sql', 'chat_messages', 'Database has chat_messages table');
checkFileContent('whatyaneed-database.sql', 'current_latitude', 'Database has location columns');
checkFileContent('whatyaneed-database.sql', 'current_longitude', 'Database has longitude column');

console.log('\n📋 Checking Frontend Components...');
checkFile('chatbox.html', 'Chatbox HTML component exists');
checkFile('chatbox.css', 'Chatbox CSS component exists');
checkFile('chatbox.js', 'Chatbox JavaScript component exists');
checkFile('location-map.html', 'Location Map HTML component exists');
checkFile('location-map.css', 'Location Map CSS component exists');
checkFile('location-map.js', 'Location Map JavaScript component exists');

console.log('\n📋 Checking Frontend Integration...');
checkFileContent('whatyaneed-frontend.html', 'chatbox.css', 'Chatbox CSS included in main HTML');
checkFileContent('whatyaneed-frontend.html', 'location-map.css', 'Location Map CSS included in main HTML');
checkFileContent('whatyaneed-frontend.html', 'chatbox.js', 'Chatbox JS included in main HTML');
checkFileContent('whatyaneed-frontend.html', 'location-map.js', 'Location Map JS included in main HTML');
checkFileContent('whatyaneed-frontend.html', 'chatbox-modal', 'Chatbox modal added to HTML');
checkFileContent('whatyaneed-frontend.html', 'location-map-modal', 'Location Map modal added to HTML');
checkFileContent('whatyaneed-frontend.html', 'offers-modal', 'Offers modal added to HTML');

console.log('\n📋 Checking Server Routes...');
checkFileContent('server.js', 'app.get(\'/api/chats/:requestId\'', 'Chat GET route exists');
checkFileContent('server.js', 'app.post(\'/api/chats/:requestId\'', 'Chat POST route exists');
checkFileContent('server.js', 'app.put(\'/api/user/location\'', 'Location update route exists');
checkFileContent('server.js', 'app.get(\'/api/requests/:requestId/volunteer-location\'', 'Get volunteer location route exists');
checkFileContent('server.js', 'app.patch(\'/api/offers/:offerId/accept\'', 'Accept offer route exists');
checkFileContent('server.js', 'app.get(\'/api/requests/:requestId/offers\'', 'Get offers route exists');

console.log('\n📋 Checking Frontend JavaScript Functions...');
checkFileContent('whatyaneed-frontend.js', 'handleViewOffers', 'handleViewOffers function exists');
checkFileContent('whatyaneed-frontend.js', 'handleAcceptOffer', 'handleAcceptOffer function exists');
checkFileContent('whatyaneed-frontend.js', 'view-offers-btn', 'View offers button event handler');
checkFileContent('whatyaneed-frontend.js', 'open-chat-btn', 'Open chat button event handler');
checkFileContent('whatyaneed-frontend.js', 'view-location-btn', 'View location button event handler');
checkFileContent('whatyaneed-frontend.js', 'share-location-btn', 'Share location button event handler');

console.log('\n📋 Checking Chatbox Functions...');
checkFileContent('chatbox.js', 'openChatbox', 'openChatbox function exists');
checkFileContent('chatbox.js', 'closeChatbox', 'closeChatbox function exists');
checkFileContent('chatbox.js', 'sendChatMessage', 'sendChatMessage function exists');
checkFileContent('chatbox.js', 'loadChatMessages', 'loadChatMessages function exists');

console.log('\n📋 Checking Location Map Functions...');
checkFileContent('location-map.js', 'openLocationMap', 'openLocationMap function exists');
checkFileContent('location-map.js', 'closeLocationMap', 'closeLocationMap function exists');
checkFileContent('location-map.js', 'loadVolunteerLocation', 'loadVolunteerLocation function exists');
checkFileContent('location-map.js', 'requestGeolocation', 'requestGeolocation function exists');
checkFileContent('location-map.js', 'displayOpenStreetMap', 'displayOpenStreetMap function exists');

console.log('\n📋 Checking CSS Styles...');
checkFileContent('chatbox.css', '.chatbox-modal', 'Chatbox modal styles exist');
checkFileContent('chatbox.css', '.chat-message', 'Chat message styles exist');
checkFileContent('location-map.css', '.location-map-modal', 'Location map modal styles exist');
checkFileContent('location-map.css', '.map-display', 'Map display styles exist');
checkFileContent('whatyaneed-frontend.css', '.offers-list', 'Offers list styles exist');
checkFileContent('whatyaneed-frontend.css', '.offer-item', 'Offer item styles exist');

console.log('\n' + '='.repeat(60));
console.log(`📊 Validation Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed === 0) {
    console.log('✅ All checks passed! Implementation is complete.\n');
    process.exit(0);
} else {
    console.log(`⚠️  ${failed} check(s) failed. Please review the implementation.\n`);
    process.exit(1);
}

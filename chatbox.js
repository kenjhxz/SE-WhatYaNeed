let currentChatRequestId = null;
let chatPollingInterval = null;
let lastMessageId = 0;

function initializeChatbox() {
    const chatboxClose = document.getElementById('chatbox-close');
    const chatboxSend = document.getElementById('chatbox-send');
    const chatboxInput = document.getElementById('chatbox-input');
    
    if (chatboxClose) {
        chatboxClose.addEventListener('click', closeChatbox);
    }
    
    if (chatboxSend) {
        chatboxSend.addEventListener('click', sendChatMessage);
    }
    
    if (chatboxInput) {
        chatboxInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    const chatboxModal = document.getElementById('chatbox-modal');
    if (chatboxModal) {
        chatboxModal.addEventListener('click', (e) => {
            if (e.target === chatboxModal) {
                closeChatbox();
            }
        });
    }
}


async function openChatbox(requestId, requestTitle) {
    if (!currentUser) {
        showNotification('Please login to use chat', 'error');
        return;
    }
    
    currentChatRequestId = requestId;
    lastMessageId = 0;
    
    const chatboxModal = document.getElementById('chatbox-modal');
    const chatboxTitle = document.getElementById('chatbox-title');
    const chatboxMessages = document.getElementById('chatbox-messages');
    
    if (chatboxTitle) {
        chatboxTitle.textContent = requestTitle || 'Chat';
    }
    
    if (chatboxModal) {
        chatboxModal.style.display = 'flex';
    }
    
    // Show loading state
    if (chatboxMessages) {
        chatboxMessages.innerHTML = `
            <div class="chatbox-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading messages...</p>
            </div>
        `;
    }
    
    // Load initial messages
    await loadChatMessages();
    
    // Start polling for new messages every 3 seconds
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
    }
    chatPollingInterval = setInterval(loadChatMessages, 3000);
    
    // Focus input
    const chatboxInput = document.getElementById('chatbox-input');
    if (chatboxInput) {
        chatboxInput.focus();
    }
}

// Close chatbox
function closeChatbox() {
    const chatboxModal = document.getElementById('chatbox-modal');
    if (chatboxModal) {
        chatboxModal.style.display = 'none';
    }
    
    // Stop polling
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
    }
    
    currentChatRequestId = null;
    lastMessageId = 0;
    
    // Clear input
    const chatboxInput = document.getElementById('chatbox-input');
    if (chatboxInput) {
        chatboxInput.value = '';
    }
}

// Load chat messages from server
async function loadChatMessages() {
    if (!currentChatRequestId) return;
    
    try {
        const response = await fetch(`${API_URL}/chats/${currentChatRequestId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                closeChatbox();
                showNotification('Please login to continue', 'error');
                return;
            }
            throw new Error('Failed to load messages');
        }
        
        const data = await response.json();
        displayChatMessages(data.messages || []);
        
    } catch (error) {
        console.error('Load messages error:', error);
        const chatboxMessages = document.getElementById('chatbox-messages');
        if (chatboxMessages && chatboxMessages.querySelector('.chatbox-loading')) {
            chatboxMessages.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load messages</p>
                </div>
            `;
        }
    }
}

// Display chat messages
function displayChatMessages(messages) {
    const chatboxMessages = document.getElementById('chatbox-messages');
    if (!chatboxMessages) return;
    
    // Check if there are new messages
    const hasNewMessages = messages.length > 0 && 
        (!lastMessageId || messages[messages.length - 1].message_id > lastMessageId);
    
    if (messages.length === 0) {
        chatboxMessages.innerHTML = `
            <div class="no-messages">
                <i class="fas fa-comments"></i>
                <p>No messages yet. Start the conversation!</p>
            </div>
        `;
        return;
    }
    
    // Store current scroll position
    const wasScrolledToBottom = chatboxMessages.scrollHeight - chatboxMessages.scrollTop <= chatboxMessages.clientHeight + 50;
    
    // Build messages HTML
    const messagesHTML = messages.map(msg => {
        const isOwnMessage = currentUser && msg.sender_id === currentUser.id;
        const timestamp = new Date(msg.sent_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const initials = getInitials(msg.sender_name);
        
        return `
            <div class="chat-message ${isOwnMessage ? 'own-message' : ''}">
                <div class="chat-avatar">${initials}</div>
                <div class="chat-message-content">
                    <div class="chat-message-header">
                        <span class="chat-sender-name">${escapeHtml(msg.sender_name)}</span>
                        <span class="chat-timestamp">${timestamp}</span>
                    </div>
                    <div class="chat-message-bubble">
                        ${escapeHtml(msg.message)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    chatboxMessages.innerHTML = messagesHTML;
    
    // Update last message ID
    if (messages.length > 0) {
        lastMessageId = messages[messages.length - 1].message_id;
    }
    
    // Scroll to bottom if was already at bottom or if new messages
    if (wasScrolledToBottom || hasNewMessages) {
        chatboxMessages.scrollTop = chatboxMessages.scrollHeight;
    }
}

// Send chat message
async function sendChatMessage() {
    if (!currentChatRequestId) return;
    
    const chatboxInput = document.getElementById('chatbox-input');
    const chatboxSend = document.getElementById('chatbox-send');
    
    if (!chatboxInput || !chatboxSend) return;
    
    const message = chatboxInput.value.trim();
    
    if (!message) {
        return;
    }
    
    // Disable input and button while sending
    chatboxInput.disabled = true;
    chatboxSend.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/chats/${currentChatRequestId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                closeChatbox();
                showNotification('Please login to continue', 'error');
                return;
            }
            throw new Error('Failed to send message');
        }
        
        // Clear input
        chatboxInput.value = '';
        
        // Reload messages immediately
        await loadChatMessages();
        
    } catch (error) {
        console.error('Send message error:', error);
        showNotification('Failed to send message', 'error');
    } finally {
        chatboxInput.disabled = false;
        chatboxSend.disabled = false;
        chatboxInput.focus();
    }
}

// Helper function to get initials from name
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChatbox);
} else {
    initializeChatbox();
}

import { initializeContextMenu, handleContextMenuClick } from './contextMenu.js';
import { handleContentRequest, handleSaveSummary, handleFloatingBallRequest } from './messageHandler.js';
import { getSummaryState, clearSummaryState } from './summaryState.js';

// Initialize right-click context menu
initializeContextMenu();

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getContent") {
        // Directly process, no need for response
        handleContentRequest(request);
        sendResponse({ received: true });
        return false;  // No need to keep the message channel open
    }

    if (request.action === "saveSummary") {
        // Process immediately and return response
        handleSaveSummary(request).then(response => {
            try {
                chrome.runtime.sendMessage({
                    action: 'saveSummaryResponse',
                    response: response
                }).catch(() => {
                    // Ignore error, popup may have closed
                });
            } catch (error) {
                console.log('Popup may have closed');
            }
        });
        // Return an initial response
        sendResponse({ success: true });
        return false;
    }

    if (request.action === "processAndSendContent") {
        // Immediately send processing response
        sendResponse({ processing: true });

        // Asynchronous request processing
        handleFloatingBallRequest(request).then(response => {
            // Try to update floating ball state
            if (sender.tab && sender.tab.id) {
                try {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: 'updateFloatingBallState',
                        success: response.success,
                        error: response.error
                    }).catch(() => {
                        console.log('Unable to update floating ball state');
                    });
                } catch (error) {
                    console.log('Failed to send state update message');
                }
            }
        }).catch(error => {
            console.error('Failed to process floating ball request:', error);
            // Try to update floating ball state
            if (sender.tab && sender.tab.id) {
                try {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: 'updateFloatingBallState',
                        success: false,
                        error: error.message || 'Request processing failed'
                    }).catch(() => {
                        console.log('Unable to update floating ball state');
                    });
                } catch (error) {
                    console.log('Failed to send state update message');
                }
            }
        });

        return true; // Keep the message channel open
    }

    if (request.action === "showNotification") {
        // Show system notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('images/icon128.png'),
            title: request.title || 'Notification',
            message: request.message || '',
            priority: 2
        });
        sendResponse({ received: true });
        return false;
    }

    if (request.action === "getSummaryState") {
        // Synchronous response
        sendResponse(getSummaryState());
        return false;
    }

    if (request.action === "clearSummary") {
        // Immediately send response to avoid closing the channel
        clearSummaryState().then(() => {
            try {
                chrome.runtime.sendMessage({
                    action: 'clearSummaryResponse',
                    success: true
                }).catch(() => {
                    // Ignore error, popup may have closed
                });
            } catch (error) {
                console.log('Popup may have closed');
            }
        });
        sendResponse({ processing: true });
        return false;
    }

    return false;  // Default to not keeping the message channel open
});

// Listen for right-click menu clicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Listen for notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            // Set flag
            await chrome.storage.local.set({
                notificationClicked: true,
                notificationTabId: tab.id
            });
            // Clear notification
            chrome.notifications.clear(notificationId);
        }
    } catch (error) {
        console.error('Failed to handle notification click:', error);
    }
}); 

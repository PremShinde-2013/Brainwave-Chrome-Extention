// Initialize floating ball
initialize();

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getContent') {
        try {
            const content = extractPageContent();
            const metadata = getPageMetadata();
            sendResponse({
                success: true,
                content: content,
                url: metadata.url,
                title: metadata.title
            });
        } catch (error) {
            console.error('Error getting content:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
    return true;  // Keep the message channel open
});

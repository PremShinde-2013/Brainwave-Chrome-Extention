import { sendToBlinko, uploadFile } from './api.js';
import { showSuccessIcon } from './ui.js';
import { handleContentRequest } from './messageHandler.js';

// Initialize right-click menu
function initializeContextMenu() {
    chrome.runtime.onInstalled.addListener(() => {
        // Create parent menu
        chrome.contextMenus.create({
            id: "blinkoExtension",
            title: chrome.i18n.getMessage("extensionName"),
            contexts: ["all"]
        });

        // Create menu for selected text
        chrome.contextMenus.create({
            id: "sendSelectedText",
            title: chrome.i18n.getMessage("sendSelectedText"),
            contexts: ["selection"],
            parentId: "blinkoExtension"
        });

        // Add save to quick notes menu (text)
        chrome.contextMenus.create({
            id: "saveToQuickNote",
            title: chrome.i18n.getMessage("saveToQuickNote"),
            contexts: ["selection"],
            parentId: "blinkoExtension"
        });

        // Add save to quick notes menu (image)
        chrome.contextMenus.create({
            id: "saveImageToQuickNote",
            title: chrome.i18n.getMessage("saveImageToQuickNote"),
            contexts: ["image"],
            parentId: "blinkoExtension"
        });

        // Create image right-click menu
        chrome.contextMenus.create({
            id: 'saveImageToBlinko',
            title: chrome.i18n.getMessage("saveImageToBlinko"),
            contexts: ['image'],
            parentId: "blinkoExtension"
        });

        // Create summarize page content menu
        chrome.contextMenus.create({
            id: 'summarizePageContent',
            title: chrome.i18n.getMessage("summarizePageContent"),
            contexts: ['page'],
            parentId: "blinkoExtension"
        });

        // Create extract page content menu
        chrome.contextMenus.create({
            id: 'extractPageContent',
            title: chrome.i18n.getMessage("extractPageContent"),
            contexts: ['page'],
            parentId: "blinkoExtension"
        });
    });
}

// Handle right-click menu click
async function handleContextMenuClick(info, tab) {
    if (info.menuItemId === "sendSelectedText") {
        try {
            const result = await chrome.storage.sync.get('settings');
            const settings = result.settings;

            if (!settings) {
                throw new Error('Settings not found');
            }

            // Prepare content
            let content = info.selectionText.trim();

            // Send to Blinko
            const response = await sendToBlinko(
                content,
                tab.url,
                tab.title,
                null,
                'extract'  // Use 'extract' type for selected text saving
            );

            if (response.success) {
                showSuccessIcon();
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'images/icon128.png',
                    title: 'Sent Successfully',
                    message: 'Selected text has been successfully sent to Brainwave.ai'
                });
            } else {
                throw new Error(response.error || 'Failed to send selected text');
            }
        } catch (error) {
            console.error('Failed to send selected text:', error);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon128.png',
                title: 'Send Failed',
                message: error.message
            });
        }
    }

    if (info.menuItemId === "saveToQuickNote") {
        try {
            // Get current quick note content
            const result = await chrome.storage.local.get('quickNote');
            let currentContent = result.quickNote || '';

            // Add new selected content
            if (currentContent) {
                currentContent += '\n\n'; // Add two new lines if there's existing content
            }
            currentContent += info.selectionText.trim();

            // Save updated content
            await chrome.storage.local.set({ 'quickNote': currentContent });

            // Show success notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon128.png',
                title: 'Added to Quick Note',
                message: 'Selected text has been added to Quick Notes'
            });
        } catch (error) {
            console.error('Failed to save to Quick Notes:', error);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon128.png',
                title: 'Save Failed',
                message: error.message
            });
        }
    }

    if (info.menuItemId === "saveImageToQuickNote") {
        try {
            // Get settings
            const result = await chrome.storage.sync.get('settings');
            const settings = result.settings;

            if (!settings) {
                throw new Error('Settings not found');
            }

            // Get image file
            const imageResponse = await fetch(info.srcUrl);
            const blob = await imageResponse.blob();
            const file = new File([blob], 'image.png', { type: blob.type });

            // Upload image file
            const imageAttachment = await uploadFile(file, settings);

            // Get current attachments list from quick notes
            const quickNoteResult = await chrome.storage.local.get(['quickNoteAttachments']);
            let attachments = quickNoteResult.quickNoteAttachments || [];

            // Add new attachment, saving the original URL
            attachments.push({
                ...imageAttachment,
                originalUrl: info.srcUrl // Save original URL for creating local URL in popup
            });

            // Save updated attachment list
            await chrome.storage.local.set({ 'quickNoteAttachments': attachments });

            // Show success notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon128.png',
                title: 'Added to Quick Note',
                message: 'Image has been added to Quick Notes'
            });
        } catch (error) {
            console.error('Failed to save image to Quick Notes:', error);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon128.png',
                title: 'Save Failed',
                message: error.message
            });
        }
    }

    if (info.menuItemId === 'saveImageToBlinko') {
        try {
            // Get settings
            const result = await chrome.storage.sync.get('settings');
            const settings = result.settings;

            if (!settings) {
                throw new Error('Settings not found');
            }

            // Get image file
            const imageResponse = await fetch(info.srcUrl);
            const blob = await imageResponse.blob();
            const file = new File([blob], 'image.png', { type: blob.type });

            // Upload image file
            const imageAttachment = await uploadFile(file, settings);

            // Send to Blinko, including image attachment
            const response = await sendToBlinko('', tab.url, tab.title, imageAttachment, 'image');

            if (response.success) {
                // Notify user about successful save
                showSuccessIcon();
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'images/icon128.png',
                    title: 'Save Successful',
                    message: 'Image has been successfully saved to Brainwave.ai'
                });
            } else {
                throw new Error(response.error || 'Save failed');
            }
        } catch (error) {
            console.error('Failed to save image:', error);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon128.png',
                title: 'Save Failed',
                message: error.message
            });
        }
    }

    // Handle summarize and extract page content
    if (info.menuItemId === 'summarizePageContent' || info.menuItemId === 'extractPageContent') {
        try {
            // Get page content
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getContent'
            });

            if (!response || !response.success) {
                throw new Error(response.error || 'Failed to get content');
            }

            // Directly process and save content
            await handleContentRequest({
                content: response.content,
                url: response.url,
                title: response.title,
                isExtractOnly: info.menuItemId === 'extractPageContent',
                directSave: true  // Mark as direct save
            });

            // Success notification will be handled in handleContentRequest
        } catch (error) {
            console.error('Failed to process page content:', error);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon128.png',
                title: info.menuItemId === 'summarizePageContent' ? 'Summarize Failed' : 'Extract Failed',
                message: error.message
            });
        }
    }

}
export {
    initializeContextMenu,
    handleContextMenuClick
};

import { loadSettings, saveSettings, resetSettings, fetchAiConfig } from './settings.js';
import { initializeUIListeners, showStatus, hideStatus } from './ui.js';
import { loadQuickNote, initializeQuickNoteListeners } from './quickNote.js';
import { checkSummaryState, initializeSummaryListeners, handleSummaryResponse } from './summary.js';

// Initialize internationalized text
function initializeI18n() {
    // Replace all text with the __MSG_ prefix
    document.querySelectorAll('*').forEach(element => {
        // Handle text content
        if (element.childNodes && element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
            const text = element.textContent;
            if (text.includes('__MSG_')) {
                const msgName = text.match(/__MSG_(\w+)__/)[1];
                element.textContent = chrome.i18n.getMessage(msgName);
            }
        }

        // Handle placeholder attribute
        if (element.hasAttribute('placeholder')) {
            const placeholder = element.getAttribute('placeholder');
            if (placeholder.includes('__MSG_')) {
                const msgName = placeholder.match(/__MSG_(\w+)__/)[1];
                element.setAttribute('placeholder', chrome.i18n.getMessage(msgName));
            }
        }

        // Handle title attribute
        if (element.hasAttribute('title')) {
            const title = element.getAttribute('title');
            if (title.includes('__MSG_')) {
                const msgName = title.match(/__MSG_(\w+)__/)[1];
                element.setAttribute('title', chrome.i18n.getMessage(msgName));
            }
        }
    });
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Initialize internationalized text
        initializeI18n();

        // Check if it was opened through a notification click
        const result = await chrome.storage.local.get(['notificationClicked', 'notificationTabId', 'quickNote', 'quickNoteAttachments']);

        // Load settings
        await loadSettings();

        // Check summary state
        await checkSummaryState();

        // Load quick note content
        await loadQuickNote();

        // Decide which tab to display
        let defaultTab = 'common';
        if (result.notificationClicked) {
            // Check if the current tab matches
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id === result.notificationTabId) {
                // Clear flag
                await chrome.storage.local.remove(['notificationClicked', 'notificationTabId']);
                defaultTab = 'quicknote';
            }
        } else if ((result.quickNote && result.quickNote.trim()) ||
            (result.quickNoteAttachments && result.quickNoteAttachments.length > 0)) {
            // If quick note has content or attachments, show the quick note tab
            defaultTab = 'quicknote';
        }

        // Hide all tab content
        document.querySelectorAll('.tabcontent').forEach(content => {
            content.style.display = 'none';
        });

        // Remove active state from all tabs
        document.querySelectorAll('.tablinks').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show the default tab and activate the corresponding tab
        document.getElementById(defaultTab).style.display = 'block';
        document.querySelector(`.tablinks[data-tab="${defaultTab}"]`).classList.add('active');

        // Initialize all event listeners
        initializeUIListeners();
        initializeQuickNoteListeners();
        initializeSummaryListeners();

        // Bind event for extracting webpage content
        document.getElementById('extractContent').addEventListener('click', async () => {
            try {
                showStatus(chrome.i18n.getMessage('extractingContent'), 'loading');
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab) {
                    throw new Error(chrome.i18n.getMessage('cannotGetTab'));
                }

                // Send message to content script to get content
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'getContent'
                });

                if (!response || !response.success) {
                    throw new Error(response.error || 'Failed to get content');
                }

                // Send to background for processing
                await chrome.runtime.sendMessage({
                    action: 'getContent',
                    content: response.content,
                    url: response.url,
                    title: response.title,
                    isExtractOnly: true
                });

            } catch (error) {
                console.error('Failed to extract webpage content:', error);
                showStatus(chrome.i18n.getMessage('settingsSaveError', [error.message]), 'error');
            }
        });

        // Bind events for settings
        document.getElementById('saveSettings').addEventListener('click', async () => {
            try {
                await saveSettings();
                showStatus(chrome.i18n.getMessage('settingsSaved'), 'success');
                setTimeout(hideStatus, 2000);
            } catch (error) {
                showStatus(chrome.i18n.getMessage('settingsSaveError', [error.message]), 'error');
            }
        });

        document.getElementById('resetSettings').addEventListener('click', async () => {
            try {
                await resetSettings();
                showStatus(chrome.i18n.getMessage('settingsReset'), 'success');
                setTimeout(hideStatus, 2000);
            } catch (error) {
                showStatus(chrome.i18n.getMessage('settingsResetError', [error.message]), 'error');
            }
        });

        // Bind event for getting AI configuration
        document.getElementById('fetchAiConfig').addEventListener('click', fetchAiConfig);

    } catch (error) {
        console.error('Initialization failed:', error);
        showStatus(chrome.i18n.getMessage('initializationError', [error.message]), 'error');
    }
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === 'handleSummaryResponse') {
        handleSummaryResponse(request);
        sendResponse({ received: true });
    } else if (request && request.action === 'saveSummaryResponse') {
        if (request.response.success) {
            showStatus('Save successful', 'success');
            setTimeout(hideStatus, 2000);
        } else {
            showStatus('Save failed: ' + request.response.error, 'error');
        }
        sendResponse({ received: true });
    } else if (request && request.action === 'floatingBallResponse') {
        if (request.response.success) {
            showStatus(request.response.isExtractOnly ? 'Extraction successful' : 'Summary successful', 'success');
            setTimeout(hideStatus, 2000);
        } else {
            showStatus((request.response.isExtractOnly ? 'Extraction' : 'Summary') + ' failed: ' + request.response.error, 'error');
        }
        sendResponse({ received: true });
    } else if (request && request.action === 'clearSummaryResponse') {
        if (request.success) {
            showStatus('Clear successful', 'success');
            setTimeout(hideStatus, 2000);
        }
        sendResponse({ received: true });
    }
    return false;  // Do not keep the message channel open
});

// Notify background when the popup is closed
window.addEventListener('unload', async () => {
    try {
        // If the summaryPreview is hidden, it means the user has canceled or saved content, we need to clean up storage
        const summaryPreview = document.getElementById('summaryPreview');
        if (summaryPreview && summaryPreview.style.display === 'none') {
            await chrome.storage.local.remove('currentSummary');
        }

        chrome.runtime.sendMessage({ action: "popupClosed" }).catch(() => {
            // Ignore errors, there might be a connection error when closing the popup
        });
    } catch (error) {
        // Ignore errors
    }
});

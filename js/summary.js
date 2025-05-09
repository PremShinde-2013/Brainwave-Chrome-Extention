import { showStatus, hideStatus, showSummaryPreview, clearSummaryPreview } from './ui.js';
import { saveTempSummaryData, clearTempSummaryData } from './storage.js';

async function checkSummaryState() {
    try {
        const currentSummary = await chrome.storage.local.get('currentSummary');
        if (currentSummary.currentSummary) {
            await showSummaryPreview(currentSummary.currentSummary);
        }
    } catch (error) {
        console.error('Failed to check summary state:', error);
    }
}

function handleSummaryResponse(response) {
    if (response.success) {
        showStatus(response.isExtractOnly ? 'Extraction Successful' : 'Summary Generated Successfully', 'success');
        setTimeout(hideStatus, 2000);
        showSummaryPreview({
            summary: response.summary,
            title: response.title,
            url: response.url
        });
    } else {
        showStatus((response.isExtractOnly ? 'Extraction' : 'Summary') + ' Failed: ' + response.error, 'error');
    }
}

function initializeSummaryListeners() {
    document.getElementById('extract').addEventListener('click', async () => {
        try {
            showStatus('Generating summary...', 'loading');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('Unable to get current tab');
            }

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getContent'
            });

            if (!response || !response.success) {
                throw new Error(response.error || 'Failed to get content');
            }

            await chrome.runtime.sendMessage({
                action: 'getContent',
                content: response.content,
                url: response.url,
                title: response.title,
                isExtractOnly: false
            });

        } catch (error) {
            console.error('Failed to generate summary:', error);
            showStatus('Summary failed: ' + error.message, 'error');
        }
    });

    document.getElementById('cancelEdit').addEventListener('click', async () => {
        try {
            await clearTempSummaryData();
            await chrome.storage.local.remove('currentSummary');
            clearSummaryPreview();
            showStatus('Cancelled', 'success');
            setTimeout(hideStatus, 2000);
        } catch (error) {
            console.error('Failed to cancel editing:', error);
            showStatus('Cancel failed: ' + error.message, 'error');
        }
    });

    document.getElementById('editSummary').addEventListener('click', async () => {
        try {
            const summaryText = document.getElementById('summaryText').value;
            if (!summaryText.trim()) {
                throw new Error('Content cannot be empty');
            }

            const currentSummary = await chrome.storage.local.get('currentSummary');
            const isExtractOnly = currentSummary.currentSummary?.isExtractOnly;
            const url = currentSummary.currentSummary?.url;
            const title = currentSummary.currentSummary?.title;

            const response = await chrome.runtime.sendMessage({
                action: 'saveSummary',
                content: summaryText,
                type: isExtractOnly ? 'extract' : 'summary',
                url: url,
                title: title
            });

            if (response && response.success) {
                clearSummaryPreview();
                showStatus('Saved successfully', 'success');
                setTimeout(hideStatus, 2000);
            } else {
                throw new Error(response.error || 'Save failed');
            }
        } catch (error) {
            console.error('Failed to save summary:', error);
            showStatus('Save failed: ' + error.message, 'error');
        }
    });
}

export {
    checkSummaryState,
    handleSummaryResponse,
    initializeSummaryListeners
};

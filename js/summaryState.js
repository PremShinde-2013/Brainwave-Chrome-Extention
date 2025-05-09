let summaryState = {
    status: 'none',
    summary: null,
    url: null,
    title: null
};

function getSummaryState() {
    return summaryState;
}

function updateSummaryState(newState) {
    summaryState = { ...summaryState, ...newState };
    return summaryState;
}

async function clearSummaryState() {
    summaryState = {
        status: 'none',
        summary: null,
        url: null,
        title: null
    };
    await chrome.storage.local.remove('currentSummary');
    return summaryState;
}

async function saveSummaryToStorage(summary, url, title) {
    await chrome.storage.local.set({
        currentSummary: {
            summary,
            url,
            title,
            timestamp: Date.now()
        }
    });
}

async function loadSummaryFromStorage() {
    const result = await chrome.storage.local.get('currentSummary');
    return result.currentSummary;
}

export {
    getSummaryState,
    updateSummaryState,
    clearSummaryState,
    saveSummaryToStorage,
    loadSummaryFromStorage
}; 
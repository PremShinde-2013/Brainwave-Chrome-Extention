// Temporary storage key
const TEMP_STORAGE_KEY = 'tempSummaryData';

// Save temporary summary data
async function saveTempSummaryData(data) {
    try {
        await chrome.storage.local.set({ [TEMP_STORAGE_KEY]: data });
        console.log('Temporary data saved:', data);
    } catch (error) {
        console.error('Failed to save temporary data:', error);
    }
}

// Clear temporary summary data
async function clearTempSummaryData() {
    try {
        await chrome.storage.local.remove(TEMP_STORAGE_KEY);
        console.log('Temporary data cleared');
    } catch (error) {
        console.error('Failed to clear temporary data:', error);
    }
}

// Load temporary summary data
async function loadTempSummaryData() {
    try {
        const result = await chrome.storage.local.get(TEMP_STORAGE_KEY);
        return result[TEMP_STORAGE_KEY];
    } catch (error) {
        console.error('Failed to load temporary data:', error);
        return null;
    }
}

export {
    TEMP_STORAGE_KEY,
    saveTempSummaryData,
    clearTempSummaryData,
    loadTempSummaryData
};

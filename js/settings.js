import { showStatus } from './ui.js';

// Default settings
const defaultSettings = {
    targetUrl: '',
    authKey: '',
    modelUrl: '',
    apiKey: '',
    modelName: 'gpt-4o-mini',
    temperature: 0.5,
    promptTemplate: `Please write a clear and concise summary based on the provided webpage content, highlighting the key points without missing any important details.

Requirements:
1. **Summary Structure:**
    *   The first line should be in the format '# Title', giving a brief main title.
    *   A one-sentence summary: Provide a concise and precise statement summarizing the core content of the entire webpage.
    *   Summarize the key points of each major section in the order they appear in the webpage.

2. **Highlight Key Points:** Please identify and emphasize the critical information, themes, key arguments, and conclusions in the webpage. If the content contains important data or conclusions, make sure to include them in the summary.
3. **Cover All Important Aspects:** Ensure that all significant aspects of the webpage are covered, avoiding omission of any key information.

Please note:
*   The summary should be objective and neutral, avoiding personal opinions or emotional tones.
*   The language of the summary should be simple and clear, avoiding overly technical or obscure terms, and the summary should be in English.
*   The length of the summary should be moderate, covering the important content while avoiding being overly long or verbose.
*   Do not provide a concluding statement at the end of the summary, but instead, include a single sentence summarizing it.
Here is the webpage content: {content}`,
    includeSummaryUrl: true,    // Whether the summary note includes the URL
    includeSelectionUrl: true,  // Whether the selected text saving includes the URL
    includeImageUrl: true,      // Whether the image saving includes the URL
    includeQuickNoteUrl: false, // Whether the quick note includes the URL
    summaryTag: '#Web/Summary',   // Tag for webpage summary
    selectionTag: '#Web/Excerpt', // Tag for selected text saving
    imageTag: '#Web/Image',     // Tag for image saving
    extractTag: '#Web/Clip',   // Tag for webpage clipping
    enableFloatingBall: true,   // Whether to enable the floating ball
    jinaApiKey: '',            // Jina Reader API Key
    useJinaApiKey: false,      // Whether to use API Key for acceleration
    saveWebImages: false       // Whether to save webpage image links
};

// Load settings
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get('settings');
        let settings = result.settings;

        // If no saved settings, use default values
        if (!settings) {
            settings = { ...defaultSettings };
        } else {
            // Only provide default values for required settings
            settings.modelName = settings.modelName || defaultSettings.modelName;
            settings.temperature = settings.temperature || defaultSettings.temperature;
            settings.promptTemplate = settings.promptTemplate || defaultSettings.promptTemplate;
            settings.includeSummaryUrl = settings.includeSummaryUrl !== undefined ? settings.includeSummaryUrl : defaultSettings.includeSummaryUrl;
            settings.includeSelectionUrl = settings.includeSelectionUrl !== undefined ? settings.includeSelectionUrl : defaultSettings.includeSelectionUrl;
            settings.includeImageUrl = settings.includeImageUrl !== undefined ? settings.includeImageUrl : defaultSettings.includeImageUrl;
            settings.includeQuickNoteUrl = settings.includeQuickNoteUrl !== undefined ? settings.includeQuickNoteUrl : defaultSettings.includeQuickNoteUrl;
            settings.enableFloatingBall = settings.enableFloatingBall !== undefined ? settings.enableFloatingBall : defaultSettings.enableFloatingBall;
            settings.jinaApiKey = settings.jinaApiKey || defaultSettings.jinaApiKey;
            settings.useJinaApiKey = settings.useJinaApiKey !== undefined ? settings.useJinaApiKey : defaultSettings.useJinaApiKey;
            settings.saveWebImages = settings.saveWebImages !== undefined ? settings.saveWebImages : defaultSettings.saveWebImages;
            settings.extractTag = settings.extractTag !== undefined ? settings.extractTag : defaultSettings.extractTag;
            // Keep tag settings as they are, do not use default values
        }

        console.log('Loaded settings:', settings);

        // Update UI
        const elements = {
            'targetUrl': settings.targetUrl || '',
            'authKey': settings.authKey || '',
            'modelUrl': settings.modelUrl || '',
            'apiKey': settings.apiKey || '',
            'modelName': settings.modelName || '',
            'temperature': settings.temperature || '0.7',
            'promptTemplate': settings.promptTemplate || '',
            'includeSummaryUrl': settings.includeSummaryUrl !== false,
            'includeSelectionUrl': settings.includeSelectionUrl !== false,
            'includeImageUrl': settings.includeImageUrl !== false,
            'includeQuickNoteUrl': settings.includeQuickNoteUrl !== false,
            'summaryTag': settings.summaryTag || '',
            'selectionTag': settings.selectionTag || '',
            'imageTag': settings.imageTag || '',
            'enableFloatingBall': settings.enableFloatingBall !== false,
            'jinaApiKey': settings.jinaApiKey || '',
            'useJinaApiKey': settings.useJinaApiKey !== false,
            'saveWebImages': settings.saveWebImages !== false,
            'extractTag': settings.extractTag || ''
        };

        // Safely update each element
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus('Failed to load settings: ' + error.message, 'error');
        return defaultSettings;
    }
}

// Save settings
async function saveSettings() {
    try {
        const settings = {
            targetUrl: document.getElementById('targetUrl').value.trim(),
            authKey: document.getElementById('authKey').value.trim(),
            modelUrl: document.getElementById('modelUrl').value.trim(),
            apiKey: document.getElementById('apiKey').value.trim(),
            modelName: document.getElementById('modelName').value.trim() || defaultSettings.modelName,
            temperature: parseFloat(document.getElementById('temperature').value) || defaultSettings.temperature,
            promptTemplate: document.getElementById('promptTemplate').value || defaultSettings.promptTemplate,
            includeSummaryUrl: document.getElementById('includeSummaryUrl').checked,
            includeSelectionUrl: document.getElementById('includeSelectionUrl').checked,
            includeImageUrl: document.getElementById('includeImageUrl').checked,
            includeQuickNoteUrl: document.getElementById('includeQuickNoteUrl').checked,
            summaryTag: document.getElementById('summaryTag').value,  // Do not use trim(), allow empty values
            selectionTag: document.getElementById('selectionTag').value,  // Do not use trim(), allow empty values
            imageTag: document.getElementById('imageTag').value,  // Do not use trim(), allow empty values
            enableFloatingBall: document.getElementById('enableFloatingBall').checked,
            jinaApiKey: document.getElementById('jinaApiKey').value.trim(),
            useJinaApiKey: document.getElementById('useJinaApiKey').checked,
            saveWebImages: document.getElementById('saveWebImages').checked,
            extractTag: document.getElementById('extractTag').value  // Do not use trim(), allow empty values
        };

        // Save to chrome.storage
        await chrome.storage.sync.set({ settings });

        // Notify all tabs to update the floating ball state
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'updateFloatingBallState',
                    enabled: settings.enableFloatingBall
                });
            } catch (error) {
                console.log('Tab not ready:', tab.id);
            }
        }

        console.log('Settings saved:', settings);
        showStatus('Settings saved', 'success');
        return settings;
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus('Failed to save settings: ' + error.message, 'error');
        throw error;
    }
}
// Reset Settings
async function resetSettings() {
    try {
        await chrome.storage.sync.remove('settings');
        const settings = { ...defaultSettings };

        // Update UI
        document.getElementById('targetUrl').value = settings.targetUrl;
        document.getElementById('authKey').value = settings.authKey;
        document.getElementById('modelUrl').value = settings.modelUrl;
        document.getElementById('apiKey').value = settings.apiKey;
        document.getElementById('modelName').value = settings.modelName;
        document.getElementById('temperature').value = settings.temperature;
        document.getElementById('promptTemplate').value = settings.promptTemplate;
        document.getElementById('includeSummaryUrl').checked = settings.includeSummaryUrl;
        document.getElementById('includeSelectionUrl').checked = settings.includeSelectionUrl;
        document.getElementById('includeImageUrl').checked = settings.includeImageUrl;
        document.getElementById('summaryTag').value = settings.summaryTag;
        document.getElementById('selectionTag').value = settings.selectionTag;
        document.getElementById('imageTag').value = settings.imageTag;
        document.getElementById('enableFloatingBall').checked = settings.enableFloatingBall;
        document.getElementById('jinaApiKey').value = settings.jinaApiKey;
        document.getElementById('useJinaApiKey').checked = settings.useJinaApiKey;
        document.getElementById('saveWebImages').checked = settings.saveWebImages;
        document.getElementById('extractTag').value = settings.extractTag;

        console.log('Settings have been reset to default values:', settings);
        showStatus('Settings have been reset to default values', 'success');
    } catch (error) {
        console.error('Error resetting settings:', error);
        showStatus('Failed to reset settings: ' + error.message, 'error');
    }
}

// Fetch AI configuration from Blinko
async function fetchAiConfig() {
    try {
        const targetUrl = document.getElementById('targetUrl').value.trim();
        const authKey = document.getElementById('authKey').value.trim();

        if (!targetUrl || !authKey) {
            showStatus('Please fill in the Blinko API URL and authentication key first', 'error');
            return;
        }

        // Construct request URL, ensuring no duplicate 'v1' is added
        const baseUrl = targetUrl.replace(/\/+$/, ''); // Remove trailing slashes
        const configUrl = `${baseUrl}/config/list`;

        showStatus('Fetching configuration...', 'loading');

        const response = await fetch(configUrl, {
            method: 'GET',
            headers: {
                'Authorization': authKey
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch configuration: ${response.status}`);
        }

        const config = await response.json();

        if (config.aiModelProvider === 'OpenAI') {
            // Update UI
            document.getElementById('modelUrl').value = config.aiApiEndpoint || '';
            document.getElementById('apiKey').value = config.aiApiKey || '';
            document.getElementById('modelName').value = config.aiModel || '';

            showStatus('AI configuration successfully fetched', 'success');
        } else {
            showStatus('Currently unsupported AI provider: ' + config.aiModelProvider, 'error');
        }
    } catch (error) {
        console.error('Error fetching AI configuration:', error);
        showStatus('Failed to fetch AI configuration: ' + error.message, 'error');
    }
}

export {
    defaultSettings,
    loadSettings,
    saveSettings,
    resetSettings,
    fetchAiConfig
};

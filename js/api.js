/// Get the full API URL
function getFullApiUrl(baseUrl, endpoint) {
    try {
        const url = new URL(baseUrl);
        // Check if the complete API path is already included
        if (baseUrl.includes('/v1/chat/completions')) {
            return baseUrl;
        }
        // If the URL contains /v1, use the part before it as the base URL
        if (baseUrl.includes('/v1')) {
            return baseUrl.split('/v1')[0] + '/v1' + endpoint;
        }
        // If the URL doesn't contain /v1, just add it
        return baseUrl.replace(/\/+$/, '') + '/v1' + endpoint;
    } catch (error) {
        console.error('Error parsing URL:', error);
        throw new Error('Invalid URL format: ' + error.message);
    }
}

// Get summary from model
async function getSummaryFromModel(content, settings) {
    try {
        const prompt = settings.promptTemplate.replace('{content}', content);

        // Get the full API URL
        const fullUrl = getFullApiUrl(settings.modelUrl, '/chat/completions');

        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: settings.temperature
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API request failed: ${response.status} ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('API response error');
        }

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error getting summary:', error);
        throw error;
    }
}

// Upload image file to Blinko
async function uploadFile(file, settings) {
    try {
        if (!settings.targetUrl || !settings.authKey) {
            throw new Error('Please configure the Brainwave.ai API URL and authentication key first');
        }

        // Build the upload URL
        const baseUrl = settings.targetUrl.replace(/\/v1\/*$/, '');
        const uploadUrl = `${baseUrl}/file/upload`;

        // Create FormData object
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': settings.authKey
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Image upload failed: ${response.status}`);
        }

        const data = await response.json();
        if (data.status !== 200 || !data.filePath) {
            throw new Error('Image upload response format error');
        }

        return {
            name: data.fileName,
            path: data.filePath,
            size: data.size,
            type: data.type
        };
    } catch (error) {
        console.error('Image upload failed:', error);
        throw error;
    }
}
// Send content to Blinko
async function sendToBlinko(content, url, title, imageAttachment = null, type = 'summary') {
    try {
        // Get settings
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;

        if (!settings || !settings.targetUrl || !settings.authKey) {
            throw new Error('Please configure the Brainwave.ai API URL and authentication key first');
        }

        // Build the request URL, ensuring no duplicate '/v1' is added
        const baseUrl = settings.targetUrl.replace(/\/+$/, '');
        const requestUrl = `${baseUrl}/note/upsert`;

        // Add different labels and URLs based on type
        let finalContent = content;

        // Add URL based on settings and type
        if (url && (
            (type === 'summary' && settings.includeSummaryUrl) ||
            (type === 'extract' && settings.includeSelectionUrl) ||
            (type === 'image' && settings.includeImageUrl) ||
            // For quick notes, only add the link if it's not already included
            (type === 'quickNote' && settings.includeQuickNoteUrl &&
                !finalContent.includes(`Original link: [${title || url}](${url})`))
        )) {
            // For image types, use a different link format
            if (type === 'image') {
                finalContent = finalContent || '';  // Ensure finalContent is not undefined
                finalContent = `${finalContent}${finalContent ? '\n\n' : ''}> Source: [${title || url}](${url})`;
            } else {
                finalContent = `${finalContent}\n\nOriginal link: [${title || url}](${url})`;
            }
        }

        // Add tags
        if (type === 'summary' && settings.summaryTag) {
            finalContent = `${finalContent}\n\n${settings.summaryTag}`;
        } else if (type === 'extract' && settings.extractTag) {
            finalContent = `${finalContent}\n\n${settings.extractTag}`;
        } else if (type === 'image' && settings.imageTag) {
            finalContent = finalContent ? `${finalContent}\n\n${settings.imageTag}` : settings.imageTag;
        }

        // Build the request body
        const requestBody = {
            content: finalContent,
            type: 0
        };

        // Handle attachments
        if (Array.isArray(imageAttachment)) {
            // If it's an array, use it directly
            requestBody.attachments = imageAttachment;
        } else if (imageAttachment) {
            // If it's a single attachment, convert it to an array
            requestBody.attachments = [imageAttachment];
        }

        // Send the request
        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': settings.authKey
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        // Check the HTTP status code
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${data.message || response.statusText}`);
        }

        // If the response data can be parsed, consider the request successful
        // Blinko API may not return a specific status field on success
        return { success: true, data };
    } catch (error) {
        console.error('Failed to send to Brainwave.ai:', error);
        return { success: false, error: error.message };
    }
}

export {
    getFullApiUrl,
    getSummaryFromModel,
    sendToBlinko,
    uploadFile
};

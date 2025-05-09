// Get webpage content from Jina Reader API
async function getWebContent(url, settings) {
    try {
        const headers = {
            "Accept": "application/json"
        };

        // Decide whether to include images and API key-related headers based on settings
        if (!settings.saveWebImages) {
            headers["X-Retain-Images"] = "none";
        }

        if (settings.useJinaApiKey && settings.jinaApiKey) {
            headers["Authorization"] = `Bearer ${settings.jinaApiKey}`;
        }

        const response = await fetch(`https://r.jina.ai/${url}`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.code !== 200 || !data.data) {
            throw new Error('API response format error');
        }

        // Organize the returned content, excluding links
        let content = `# ${data.data.title}\n\n`;
        content += data.data.content;

        return {
            success: true,
            content: content,
            title: data.data.title,
            url: data.data.url
        };
    } catch (error) {
        console.error('Failed to get webpage content:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export {
    getWebContent
};

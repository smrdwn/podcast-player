const CryptoJS = require('crypto-js');
const fetch = require('node-fetch');

function generateAuthHeaders() {
    const authKey = process.env.AUTH_KEY;
    const secretKey = process.env.SECRET_KEY;
    const userAgent = process.env.USER_AGENT;

    const apiHeaderTime = Math.floor(Date.now() / 1000);
    const hash = CryptoJS.SHA1(authKey + secretKey + apiHeaderTime).toString(CryptoJS.enc.Hex);

    return {
        'User-Agent': userAgent,
        'X-Auth-Key': authKey,
        'X-Auth-Date': apiHeaderTime.toString(),
        'Authorization': hash
    };
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const feedId = event.queryStringParameters?.feedId;
    const max = event.queryStringParameters?.max;
    if (!feedId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Feed ID parameter is required' }) };
    }

    const apiEndpoint = process.env.API_ENDPOINT || 'https://api.podcastindex.org/api/1.0';

    if (!process.env.AUTH_KEY || !process.env.SECRET_KEY || !process.env.USER_AGENT) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Missing required API credentials' }) };
    }

    try {
        const response = await fetch(`${apiEndpoint}/episodes/byitunesid?id=${encodeURIComponent(feedId)}&max=${max}`, {
            method: 'GET',
            headers: generateAuthHeaders()
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
            const data = await response.json();
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            };
        }

        const rawText = await response.text();
        return {
            statusCode: 502,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Invalid response from API', rawText })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message })
        };
    }
};

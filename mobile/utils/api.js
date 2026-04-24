export const fetchJson = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    const text = await response.text();

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.log('JSON PARSE ERROR:', text);
      return { ok: false, data: { error: 'Invalid server response' } };
    }

    return {
      ok: response.ok,
      data,
    };
  } catch (error) {
    console.log('FETCH ERROR:', error);
    return { ok: false, data: { error: 'Network error' } };
  }
};
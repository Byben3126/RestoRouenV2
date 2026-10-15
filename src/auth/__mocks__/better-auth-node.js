module.exports = {
  // Même conversion que better-auth : headers Node -> Headers web
  fromNodeHeaders: (nodeHeaders) => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(nodeHeaders)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
      else headers.set(key, String(value));
    }
    return headers;
  },
  toNodeHandler: () => (_req, res) => {
    res.statusCode = 404;
    res.end();
  },
};

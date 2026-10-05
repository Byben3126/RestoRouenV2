module.exports = {
  fromNodeHeaders: (headers) => headers,
  toNodeHandler: () => (_req, res) => {
    res.statusCode = 404;
    res.end();
  },
};

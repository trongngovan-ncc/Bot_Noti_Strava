module.exports = function registerHealthApi(app) {
  app.get('/health', (req, res) => res.json({ ok: true }));
};

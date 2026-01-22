/**
 * Allow passing JWT access token via query string.
 *
 * Supported query keys:
 *  - access_token
 *  - accessToken
 *  - token
 *
 * If Authorization header is already present, it is not overwritten.
 */
module.exports = function tokenFromQuery(req, res, next) {
  const token =
    req.query.access_token || req.query.accessToken || req.query.token;

  if (!req.headers.authorization && token) {
    req.headers.authorization = `Bearer ${token}`;
  }

  next();
};

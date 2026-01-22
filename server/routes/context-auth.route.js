const router = require("express").Router();
const passport = require("passport");
const useragent = require("express-useragent");

const {
  addContextData,
  getAuthContextData,
  getTrustedAuthContextData,
  getUserPreferences,
  getBlockedAuthContextData,
  deleteContextAuthData,
  blockContextAuthData,
  unblockContextAuthData,
} = require("../controllers/auth.controller");

const {
  verifyEmailValidation,
  verifyEmail,
} = require("../middlewares/users/verifyEmail");

const {
  verifyLoginValidation,
  verifyLogin,
  blockLogin,
} = require("../middlewares/users/verifyLogin");

const decodeToken = require("../middlewares/auth/decodeToken");
const tokenFromQuery = require("../middlewares/auth/tokenFromQuery");

// ✅ 1) Cho phép access token qua query string (?access_token=...)
router.use(tokenFromQuery);

const requireAuth = passport.authenticate("jwt", { session: false }, null);

/**
 * ✅ 2) Route mới gộp 3 loại context-data bằng query string:
 * GET /context-data?type=primary|trusted|blocked
 * (type mặc định = primary)
 */
router.get("/context-data", requireAuth, decodeToken, (req, res, next) => {
  const type = String(req.query.type || "primary").toLowerCase();

  if (type === "trusted") return getTrustedAuthContextData(req, res, next);
  if (type === "blocked") return getBlockedAuthContextData(req, res, next);
  return getAuthContextData(req, res, next);
});

/**
 * ✅ 3) Route mới dùng query string cho contextId:
 * DELETE /context-data?contextId=...
 * PATCH  /context-data/block?contextId=...
 * PATCH  /context-data/unblock?contextId=...
 */
router.delete("/context-data", requireAuth, (req, res, next) => {
  // controller đang đọc req.params.contextId => gán thêm để không phải sửa controller
  req.params.contextId = req.params.contextId || req.query.contextId;
  return deleteContextAuthData(req, res, next);
});

router.patch("/context-data/block", requireAuth, (req, res, next) => {
  req.params.contextId = req.params.contextId || req.query.contextId;
  return blockContextAuthData(req, res, next);
});

router.patch("/context-data/unblock", requireAuth, (req, res, next) => {
  req.params.contextId = req.params.contextId || req.query.contextId;
  return unblockContextAuthData(req, res, next);
});

// ✅ Giữ nguyên route cũ (để không hỏng code cũ/front-end cũ)
router.get(
  "/context-data/primary",
  requireAuth,
  decodeToken,
  getAuthContextData,
);
router.get(
  "/context-data/trusted",
  requireAuth,
  decodeToken,
  getTrustedAuthContextData,
);
router.get(
  "/context-data/blocked",
  requireAuth,
  decodeToken,
  getBlockedAuthContextData,
);

router.get("/user-preferences", requireAuth, decodeToken, getUserPreferences);

router.delete("/context-data/:contextId", requireAuth, deleteContextAuthData);

router.patch(
  "/context-data/block/:contextId",
  requireAuth,
  blockContextAuthData,
);
router.patch(
  "/context-data/unblock/:contextId",
  requireAuth,
  unblockContextAuthData,
);

router.use(useragent.express());

router.get("/verify", verifyEmailValidation, verifyEmail, addContextData);
router.get("/verify-login", verifyLoginValidation, verifyLogin);
router.get("/block-login", verifyLoginValidation, blockLogin);

module.exports = router;

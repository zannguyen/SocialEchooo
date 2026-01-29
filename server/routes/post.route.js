const router = require("express").Router();
const passport = require("passport");

const {
  getPublicPosts,
  getPosts,
  getPost,
  createPost,
  createPostByUrl,
  confirmPost,
  rejectPost,
  deletePost,
  getCommunityPosts,
  getFollowingUsersPosts,
  likePost,
  unlikePost,
  addComment,
  savePost,
  unsavePost,
  getSavedPosts,
  clearPendingPosts,
} = require("../controllers/post.controller");

const {
  postValidator,
  commentValidator,
  validatorHandler,
} = require("../middlewares/post/userInputValidator");

const {
  createPostLimiter,
  likeSaveLimiter,
  commentLimiter,
} = require("../middlewares/limiter/limiter");

const postConfirmation = require("../middlewares/post/postConfirmation");
const analyzeContent = require("../services/analyzeContent");
const processPost = require("../services/processPost");
const fileUpload = require("../middlewares/post/fileUpload");
const decodeToken = require("../middlewares/auth/decodeToken");
const tokenFromQuery = require("../middlewares/auth/tokenFromQuery");

const requireAuth = passport.authenticate("jwt", { session: false }, null);

// Allow: ?access_token=... (or ?accessToken=... / ?token=...)
router.use(tokenFromQuery);

router.use(requireAuth, decodeToken);

/**
 * =========================
 * GET ROUTES (ORDER MATTERS)
 * =========================
 */

// ✅ Route mới rõ ràng: lấy posts của 1 user bằng query
// GET /posts/public-user-posts?publicUserId=...&access_token=...
router.get("/public-user-posts", getPublicPosts);

// GET /posts/community/:communityId
router.get("/community/:communityId", getCommunityPosts);

// GET /posts/saved
router.get("/saved", getSavedPosts);

// GET /posts/:publicUserId/userPosts
router.get("/:publicUserId/userPosts", getPublicPosts);

// GET /posts/:id/following
router.get("/:id/following", getFollowingUsersPosts);

router.post("/create-by-url", createPostByUrl);

// ✅ Dispatcher cho query-string filter
// GET /posts?communityId=...&limit=10&skip=0
// GET /posts?saved=true
// GET /posts?publicUserId=...
// GET /posts?communityId=...&following=true
// GET /posts?postId=...
router.get("/", async (req, res, next) => {
  try {
    const { communityId, saved, publicUserId, following, postId } = req.query;

    if (postId) {
      req.params.id = postId;
      return getPost(req, res, next);
    }

    if (saved === "true" || saved === true) {
      return getSavedPosts(req, res, next);
    }

    if (publicUserId) {
      req.params.publicUserId = publicUserId;
      return getPublicPosts(req, res, next);
    }

    if (communityId && (following === "true" || following === true)) {
      req.params.id = communityId;
      return getFollowingUsersPosts(req, res, next);
    }

    if (communityId) {
      req.params.communityId = communityId;
      return getCommunityPosts(req, res, next);
    }

    return getPosts(req, res, next);
  } catch (err) {
    return next(err);
  }
});

// ✅ Route động /:id phải đặt SAU / và SAU các route cụ thể
// GET /posts/:id
router.get("/:id", getPost);

/**
 * ===========
 * POST ROUTES
 * ===========
 */

router.post("/confirm/:confirmationToken", confirmPost);
router.post("/reject/:confirmationToken", rejectPost);

router.post(
  "/:id/comment",
  commentLimiter,
  commentValidator,
  validatorHandler,
  analyzeContent,
  addComment,
);

router.post(
  "/",
  createPostLimiter,
  fileUpload,
  postValidator,
  validatorHandler,
  analyzeContent,
  processPost,
  postConfirmation,
  createPost,
);

/**
 * =============
 * DELETE ROUTES
 * =============
 */

router.delete("/pending", clearPendingPosts);
router.delete("/:id", deletePost);

/**
 * ============
 * PATCH ROUTES
 * ============
 */

router.use(likeSaveLimiter);

router.patch("/:id/save", savePost);
router.patch("/:id/unsave", unsavePost);
router.patch("/:id/like", likePost);
router.patch("/:id/unlike", unlikePost);

module.exports = router;

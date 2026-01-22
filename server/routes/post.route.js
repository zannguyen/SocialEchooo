const router = require("express").Router();
const passport = require("passport");

const {
  getPublicPosts,
  getPosts,
  getPost,
  createPost,
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

router.get("/community/:communityId", getCommunityPosts);
router.get("/saved", getSavedPosts);
router.get("/:publicUserId/userPosts", getPublicPosts);
router.get("/:id/following", getFollowingUsersPosts);
router.get("/:id", getPost);
// Query-string version (recommended):
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

router.delete("/pending", clearPendingPosts);
router.delete("/:id", deletePost);

router.use(likeSaveLimiter);

router.patch("/:id/save", savePost);
router.patch("/:id/unsave", unsavePost);
router.patch("/:id/like", likePost);
router.patch("/:id/unlike", unlikePost);

module.exports = router;

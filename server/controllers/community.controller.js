const Community = require("../models/community.model");
const Rule = require("../models/rule.model");
const User = require("../models/user.model");
const Report = require("../models/report.model");
const dayjs = require("dayjs");
const relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);

// Helpers: ưu tiên params, fallback qua query string
const getCommunityName = (req) => req.params?.name || req.query?.name;
const getUserIdParam = (req) =>
  req.params?.id || req.query?.id || req.query?.userId;
const getPostIdParam = (req) =>
  req.params?.postId || req.query?.postId || req.query?.id;

const getCommunities = async (req, res) => {
  try {
    const communities = await Community.find();
    res.status(200).json(communities);
  } catch (error) {
    res.status(404).json({
      message: "No communities found",
    });
  }
};

// Hỗ trợ: GET /communities/:name  và  GET /communities?name=abc
const getCommunity = async (req, res) => {
  try {
    const name = getCommunityName(req);
    if (!name) {
      return res.status(400).json({ message: "Missing community name" });
    }

    const community = await Community.findOne({ name })
      .populate("rules")
      .lean();

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    res.status(200).json(community);
  } catch (error) {
    res.status(404).json({
      message: "Community not found",
    });
  }
};

const createCommunity = async (req, res) => {
  try {
    const communities = req.body;
    const savedCommunities = await Community.insertMany(communities);
    res.status(201).json(savedCommunities);
  } catch (error) {
    res.status(409).json({
      message: "Error creating community",
    });
  }
};

const addRules = async (req, res) => {
  const rules = req.body;
  try {
    const savedRules = await Rule.insertMany(rules);
    res.status(201).json(savedRules);
  } catch (error) {
    res.status(409).json({
      message: "Error creating rules",
    });
  }
};

// Hỗ trợ: POST /communities/:name/rules  và  POST /communities/rules?name=abc
const addRulesToCommunity = async (req, res) => {
  try {
    const name = getCommunityName(req);
    if (!name) {
      return res.status(400).json({ message: "Missing community name" });
    }

    const rules = await Rule.find();

    const appliedRules = await Community.findOneAndUpdate(
      { name },
      { $push: { rules } },
      { new: true },
    );

    res.status(201).json(appliedRules);
  } catch (error) {
    res.status(409).json({
      message: "Error adding rules to community",
    });
  }
};

/**
 * @route GET /communities/member
 */
const getMemberCommunities = async (req, res) => {
  try {
    const communities = await Community.find({
      members: { $in: [req.userId] },
    })
      .select("_id name banner members description")
      .lean();

    res.status(200).json(communities);
  } catch (error) {
    res.status(500).json({
      message: "Error getting communities",
    });
  }
};

/**
 * @route GET /communities/not-member
 */
const getNotMemberCommunities = async (req, res) => {
  try {
    const communities = await Community.find({
      members: { $nin: [req.userId] },
      bannedUsers: { $nin: [req.userId] },
    })
      .select("_id name banner description members")
      .lean();

    res.status(200).json(communities);
  } catch (error) {
    res.status(500).json({
      message: "Error getting communities",
    });
  }
};

/**
 * @route POST /communities/:name/join
 * hỗ trợ thêm: POST /communities/join?name=abc
 */
const joinCommunity = async (req, res) => {
  try {
    const name = getCommunityName(req);
    if (!name) {
      return res.status(400).json({ message: "Missing community name" });
    }

    const community = await Community.findOneAndUpdate(
      { name },
      { $push: { members: req.userId } },
      { new: true },
    );

    res.status(200).json(community);
  } catch (error) {
    res.status(500).json({
      message: "Error joining community",
    });
  }
};

/**
 * @route POST /communities/:name/leave
 * hỗ trợ thêm: POST /communities/leave?name=abc
 */
const leaveCommunity = async (req, res) => {
  try {
    const name = getCommunityName(req);
    if (!name) {
      return res.status(400).json({ message: "Missing community name" });
    }

    const community = await Community.findOneAndUpdate(
      { name },
      { $pull: { members: req.userId } },
      { new: true },
    );

    res.status(200).json(community);
  } catch (error) {
    res.status(500).json({
      message: "Error leaving community",
    });
  }
};

/**
 * @route POST /communities/:name/ban/:id
 * hỗ trợ thêm: POST /communities/ban?name=abc&id=USER_ID
 */
const banUser = async (req, res) => {
  try {
    const name = getCommunityName(req);
    const id = getUserIdParam(req);

    if (!name || !id) {
      return res
        .status(400)
        .json({ message: "Missing community name or user id" });
    }

    const community = await Community.findOneAndUpdate(
      { name },
      {
        $pull: { members: id },
        $push: { bannedUsers: id },
      },
      { new: true },
    );

    res.status(200).json(community);
  } catch (error) {
    res.status(500).json({
      message: "Error banning user from community",
    });
  }
};

/**
 * @route POST /communities/:name/unban/:id
 * hỗ trợ thêm: POST /communities/unban?name=abc&id=USER_ID
 */
const unbanUser = async (req, res) => {
  try {
    const name = getCommunityName(req);
    const id = getUserIdParam(req);

    if (!name || !id) {
      return res
        .status(400)
        .json({ message: "Missing community name or user id" });
    }

    const community = await Community.findOneAndUpdate(
      { name },
      { $pull: { bannedUsers: id } },
      { new: true },
    );

    res.status(200).json(community);
  } catch (error) {
    res.status(500).json({
      message: "Error unbanning user from community",
    });
  }
};

const addModToCommunity = async (req, res) => {
  try {
    const userId = req.body.userId;
    const communityName = getCommunityName(req);

    if (!communityName) {
      return res.status(400).json({ message: "Missing community name" });
    }

    const currentUser = await User.findById(userId);

    if (!currentUser || currentUser.role !== "moderator") {
      return res.status(401).json({
        message: "Only moderators can be added.",
      });
    }

    await Community.findOneAndUpdate(
      { name: communityName },
      {
        $addToSet: {
          moderators: userId,
          members: userId,
        },
      },
      { new: true },
    );

    res
      .status(200)
      .json(`User was added as a moderator and member of ${communityName}`);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
    });
  }
};

const reportPost = async (req, res) => {
  try {
    const { postId, reportReason, communityId } = req.body.info || {};

    if (!postId || !reportReason) {
      return res.status(400).json({
        message: "Invalid data. postId and reportReason are required.",
      });
    }

    const reportedPost = await Report.findOne({
      post: { $eq: postId },
    });

    if (reportedPost) {
      if (reportedPost.reportedBy.includes(req.userId)) {
        return res.status(400).json({
          message: "You have already reported this post.",
        });
      }

      reportedPost.reportedBy.push(req.userId);
      await reportedPost.save();

      return res.status(200).json(reportedPost);
    }

    const report = {
      post: postId,
      community: communityId,
      reportedBy: [req.userId],
      reportReason,
      reportDate: new Date(),
    };

    await Report.create(report);

    res.status(200).json({ message: "Post reported successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Error reporting post",
    });
  }
};

/**
 * @route GET /communities/:name/reported-posts
 * hỗ trợ thêm: GET /communities/reported-posts?name=abc
 */
const getReportedPosts = async (req, res) => {
  try {
    const communityName = getCommunityName(req);
    if (!communityName) {
      return res.status(400).json({ message: "Missing community name" });
    }

    const community = await Community.findOne({ name: communityName })
      .select("_id")
      .lean();

    if (!community) {
      return res.status(404).json({
        message: "Community not found",
      });
    }

    const communityId = community._id;

    const reportedPosts = await Report.find({ community: communityId })
      .populate({
        path: "post",
        model: "Post",
        select: ["_id", "body", "fileUrl", "createdAt", "user"],
        populate: {
          path: "user",
          model: "User",
          select: ["name", "avatar"],
        },
      })
      .populate({
        path: "reportedBy",
        model: "User",
        select: ["name", "avatar"],
      })
      .sort({ reportDate: -1 })
      .lean();

    if (!reportedPosts || reportedPosts.length === 0) {
      return res.status(404).json({
        message: "Reported post not found",
      });
    }

    reportedPosts.forEach((post) => {
      post.reportDate = dayjs(post.reportDate).fromNow();
    });

    return res.status(200).json({ reportedPosts });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while retrieving the reported posts",
    });
  }
};

/**
 * @route DELETE /communities/reported-posts/:postId
 * hỗ trợ thêm: DELETE /communities/reported-posts?postId=...
 */
const removeReportedPost = async (req, res) => {
  try {
    const postId = getPostIdParam(req);
    if (!postId) {
      return res.status(400).json({ message: "Missing postId" });
    }

    await Report.findOneAndDelete({ post: postId });

    res.status(200).json({
      message: "Reported post removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
    });
  }
};

/**
 * @route GET /communities/:name/members
 * hỗ trợ thêm: GET /communities/members?name=abc
 */
const getCommunityMembers = async (req, res) => {
  try {
    const communityName = getCommunityName(req);
    if (!communityName) {
      return res.status(400).json({ message: "Missing community name" });
    }

    const community = await Community.findOne({ name: communityName })
      .populate({
        path: "members",
        model: "User",
        select: ["name", "avatar", "createdAt", "_id", "location"],
        match: { role: { $ne: "moderator" } },
      })
      .populate({
        path: "bannedUsers",
        model: "User",
        select: ["name", "avatar", "createdAt", "_id", "location"],
      })
      .lean();

    if (!community) {
      return res.status(404).json({
        message: "Community not found",
      });
    }

    const members = community.members;
    const bannedUsers = community.bannedUsers;

    return res.status(200).json({ members, bannedUsers });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * @route GET /communities/:name/moderators
 * hỗ trợ thêm: GET /communities/moderators?name=abc
 */
const getCommunityMods = async (req, res) => {
  try {
    const communityName = getCommunityName(req);
    if (!communityName) {
      return res.status(400).json({ message: "Missing community name" });
    }

    const community = await Community.findOne({ name: communityName })
      .populate({
        path: "moderators",
        model: "User",
        select: ["name", "avatar", "createdAt", "_id", "location"],
        match: { role: "moderator" },
      })
      .lean();

    if (!community) {
      return res.status(404).json({
        message: "Community not found",
      });
    }

    const moderators = community.moderators;

    return res.status(200).json(moderators);
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getCommunities,
  getCommunity,
  createCommunity,
  addRulesToCommunity,
  addRules,
  getNotMemberCommunities,
  getMemberCommunities,
  joinCommunity,
  leaveCommunity,
  addModToCommunity,
  reportPost,
  getReportedPosts,
  removeReportedPost,
  getCommunityMembers,
  getCommunityMods,
  banUser,
  unbanUser,
};

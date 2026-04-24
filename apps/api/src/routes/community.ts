import type { Request } from "express";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config.js";
import { NEWS_CATEGORIES, type NewsCategory, NewsItemModel } from "../models/news-item.js";
import { NewsReactionModel } from "../models/news-reaction.js";
import { NewsThoughtModel } from "../models/news-thought.js";
import { UserFeedPreferenceModel } from "../models/user-feed-preference.js";
import { UserModel } from "../models/user.js";
import { runNewsSync } from "../services/news-sync.js";

export const communityRouter = Router();

function readToken(req: Request): string | null {
  return req.cookies?.newslytic_token ?? null;
}

async function getOptionalUserId(req: Request): Promise<string | null> {
  const token = readToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

async function requireUser(req: Request): Promise<{ id: string; firstName: string; lastName: string; avatarUrl?: string } | null> {
  const userId = await getOptionalUserId(req);
  if (!userId) return null;
  const user = await UserModel.findById(userId).lean();
  if (!user) return null;
  return { id: userId, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl ?? "" };
}

communityRouter.get("/feed", async (req, res) => {
  const userId = await getOptionalUserId(req);
  const requested = String(req.query.category ?? "all");
  const limit = Math.min(30, Math.max(10, Number(req.query.limit ?? 20)));
  const before = req.query.before ? new Date(String(req.query.before)) : null;
  if (before && Number.isNaN(before.getTime())) return res.status(400).json({ error: "Invalid before cursor" });
  const category =
    requested === "all" ? "all" : (NEWS_CATEGORIES.find((value) => value === requested) as NewsCategory | undefined);
  if (!category) return res.status(400).json({ error: "Invalid category filter" });

  await runNewsSync({ force: false }).catch(() => undefined);

  let allowedCategories: string[] = [...NEWS_CATEGORIES];
  if (userId) {
    const preference = await UserFeedPreferenceModel.findOne({ userId }).lean();
    if (preference?.categories?.length) allowedCategories = preference.categories;
  }

  const categoryFilter = category === "all" ? allowedCategories : [category];
  const query: Record<string, unknown> = { category: { $in: categoryFilter } };
  if (before) query.publishedAt = { $lt: before };

  const items = await NewsItemModel.find(query)
    .sort({ publishedAt: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;

  const ids = pageItems.map((item) => String(item._id));
  const [commentAgg, likeAgg, myLikes, comments] = await Promise.all([
    NewsThoughtModel.aggregate([
      { $match: { newsItemId: { $in: ids } } },
      { $group: { _id: "$newsItemId", count: { $sum: 1 } } }
    ]),
    NewsReactionModel.aggregate([
      { $match: { newsItemId: { $in: ids }, type: "like" } },
      { $group: { _id: "$newsItemId", count: { $sum: 1 } } }
    ]),
    userId ? NewsReactionModel.find({ newsItemId: { $in: ids }, userId, type: "like" }).select({ newsItemId: 1 }).lean() : [],
    NewsThoughtModel.find({ newsItemId: { $in: ids } })
      .sort({ createdAt: -1 })
      .limit(300)
      .lean()
  ]);

  const commentMap = new Map<string, number>(commentAgg.map((row) => [String(row._id), Number(row.count || 0)]));
  const likeMap = new Map<string, number>(likeAgg.map((row) => [String(row._id), Number(row.count || 0)]));
  const likedSet = new Set((myLikes as Array<{ newsItemId: string }>).map((row) => row.newsItemId));

  const commentsMap = new Map<string, Array<{ _id: string; authorName: string; authorAvatar?: string; content: string; createdAt: string }>>();
  for (const comment of comments) {
    const newsId = String(comment.newsItemId);
    const list = commentsMap.get(newsId) ?? [];
    if (list.length < 4) {
      list.push({
        _id: String(comment._id),
        authorName: comment.authorName,
        authorAvatar: comment.authorAvatar ?? "",
        content: comment.content,
        createdAt: new Date(comment.createdAt).toISOString()
      });
      commentsMap.set(newsId, list);
    }
  }

  const feed = pageItems.map((item) => {
    const newsId = String(item._id);
    return {
      ...item,
      _id: newsId,
      interaction: {
        likeCount: likeMap.get(newsId) ?? 0,
        commentCount: commentMap.get(newsId) ?? 0,
        likedByMe: likedSet.has(newsId)
      },
      comments: commentsMap.get(newsId) ?? []
    };
  });

  const nextCursor = pageItems.length > 0 ? pageItems[pageItems.length - 1].publishedAt.toISOString() : null;
  return res.json({
    feed,
    categories: NEWS_CATEGORIES,
    selectedCategory: category,
    hasMore,
    nextCursor,
    appliedCategories: categoryFilter
  });
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(400)
});

communityRouter.post("/:newsId/comments", async (req, res) => {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid comment payload" });

  const newsExists = await NewsItemModel.exists({ _id: req.params.newsId });
  if (!newsExists) return res.status(404).json({ error: "News item not found" });

  const thought = await NewsThoughtModel.create({
    newsItemId: req.params.newsId,
    authorName: `${user.firstName} ${user.lastName}`.trim(),
    authorAvatar: user.avatarUrl ?? "",
    content: parsed.data.content
  });

  return res.status(201).json({
    comment: {
      _id: String(thought._id),
      newsItemId: thought.newsItemId,
      authorName: thought.authorName,
      authorAvatar: thought.authorAvatar ?? "",
      content: thought.content,
      createdAt: thought.createdAt.toISOString()
    }
  });
});

communityRouter.post("/:newsId/likes/toggle", async (req, res) => {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const newsExists = await NewsItemModel.exists({ _id: req.params.newsId });
  if (!newsExists) return res.status(404).json({ error: "News item not found" });

  const existing = await NewsReactionModel.findOne({ newsItemId: req.params.newsId, userId: user.id, type: "like" }).lean();
  if (existing) {
    await NewsReactionModel.deleteOne({ _id: existing._id });
  } else {
    await NewsReactionModel.create({ newsItemId: req.params.newsId, userId: user.id, type: "like" });
  }

  const likeCount = await NewsReactionModel.countDocuments({ newsItemId: req.params.newsId, type: "like" });
  return res.json({ likedByMe: !existing, likeCount });
});

const preferencesSchema = z.object({
  categories: z.array(z.enum(NEWS_CATEGORIES)).min(1)
});

communityRouter.get("/preferences/me", async (req, res) => {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const preference = await UserFeedPreferenceModel.findOne({ userId: user.id }).lean();
  return res.json({ categories: preference?.categories?.length ? preference.categories : [...NEWS_CATEGORIES] });
});

communityRouter.put("/preferences/me", async (req, res) => {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid category preferences" });

  const updated = await UserFeedPreferenceModel.findOneAndUpdate(
    { userId: user.id },
    { userId: user.id, categories: parsed.data.categories },
    { upsert: true, new: true }
  ).lean();

  return res.json({ categories: updated?.categories ?? parsed.data.categories });
});

import {
  type RequestEventLoader,
  type RequestEventAction,
} from "@builder.io/qwik-city";
import { and, eq, sql } from "drizzle-orm";
import { db } from "~/database/connection";
import { followers, followings } from "~/database/schema";
import type { AuthUser } from "~/types";
import { findUserByUsername } from "./users";

async function alreadyFollow(userId: number, otherUserId: number) {
  const data = await db.query.followings.findFirst({
    where(fields, { eq, and }) {
      return and(
        eq(fields.userId, userId),
        eq(fields.otherUserId, otherUserId)
      );
    },
  });
  if (data) return true;
  return false;
}

async function unfollowUser(userId: number, otherUserId: number) {
  return db.transaction(async (tx) => {
    // delete from following table of current user
    await tx
      .delete(followings)
      .where(
        and(
          eq(followings.userId, userId),
          eq(followings.otherUserId, otherUserId)
        )
      );

    // delete from followers table of other user
    await tx
      .delete(followers)
      .where(
        and(
          eq(followers.userId, otherUserId),
          eq(followers.otherUserId, userId)
        )
      );
  });
}

async function followUser(userId: number, otherUserId: number) {
  return db.transaction(async (tx) => {
    // add data in followings table of current user
    await tx.insert(followings).values({
      userId,
      otherUserId,
    });
    // add data in followers table of other user
    await tx.insert(followers).values({
      userId: otherUserId,
      otherUserId: userId,
    });
  });
}

async function handleFollowUnfollow(
  otherUserId: number,
  { redirect, url, sharedMap, error }: RequestEventAction
) {
  const user = sharedMap.get("user") as AuthUser | undefined;
  if (!user) throw error(403, "Unauthorized");
  const follow = await alreadyFollow(user.id, otherUserId);
  if (follow) {
    // handle unfollow user
    await unfollowUser(user.id, otherUserId);
  } else {
    // follow user
    await followUser(user.id, otherUserId);
  }
  throw redirect(302, url.pathname);
}

async function fetchFollowCount(userId: number) {
  const [followersCount] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(followers)
    .where(eq(followers.userId, userId));
  const [followingsCount] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(followings)
    .where(eq(followings.userId, userId));

  return {
    followersCount: followersCount.count,
    followingsCount: followingsCount.count,
  };
}

async function fetchFollowers({
  params,
  error,
  sharedMap,
}: RequestEventLoader) {
  const currentUser = sharedMap.get("user");
  const user = await findUserByUsername(params.username);
  if (!user) throw error(404, "User not found");
  const followers = await db.query.followers.findMany({
    where(fields, { eq }) {
      return eq(fields.userId, user.id);
    },
    with: {
      user: {
        columns: {
          id: true,
          username: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  const results = [];

  for (const follower of followers) {
    const isFollowing = currentUser
      ? await alreadyFollow(currentUser.id, user.id)
      : false;
    results.push({
      ...follower.user,
      isFollowing,
    });
  }
  return results;
}

export {
  handleFollowUnfollow,
  alreadyFollow,
  fetchFollowCount,
  fetchFollowers,
};

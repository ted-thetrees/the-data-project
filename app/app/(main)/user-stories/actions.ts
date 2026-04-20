"use server";

import { poolV002 } from "@/lib/db";
import { revalidatePath } from "next/cache";

function revalidateUserStoriesPage() {
  revalidatePath("/user-stories");
}

export async function updateUserStoryTitle(id: string, title: string) {
  await poolV002.query(
    `UPDATE user_stories SET title = $1 WHERE id = $2`,
    [title || "Untitled", id],
  );
  revalidateUserStoriesPage();
}

export async function updateUserStoryNarrative(id: string, narrative: string) {
  await poolV002.query(
    `UPDATE user_stories SET narrative = $1 WHERE id = $2`,
    [narrative || null, id],
  );
  revalidateUserStoriesPage();
}

export async function updateUserStoryCategory(id: string, categoryId: string) {
  const parsed = categoryId ? Number(categoryId) : null;
  await poolV002.query(
    `UPDATE user_stories SET category_id = $1 WHERE id = $2`,
    [parsed, id],
  );
  revalidateUserStoriesPage();
}

export async function addUserStoryRole(storyId: string, roleId: string) {
  await poolV002.query(
    `INSERT INTO user_story_role_links (user_story_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [storyId, Number(roleId)],
  );
  revalidateUserStoriesPage();
}

export async function removeUserStoryRole(storyId: string, roleId: string) {
  await poolV002.query(
    `DELETE FROM user_story_role_links
     WHERE user_story_id = $1 AND role_id = $2`,
    [storyId, Number(roleId)],
  );
  revalidateUserStoriesPage();
}

export async function createUserStory() {
  await poolV002.query(
    `INSERT INTO user_stories (title) VALUES ('Untitled')`,
  );
  revalidateUserStoriesPage();
}

export async function deleteUserStory(id: string) {
  await poolV002.query(`DELETE FROM user_stories WHERE id = $1`, [id]);
  revalidateUserStoriesPage();
}

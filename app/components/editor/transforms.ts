"use client";

import type { PlateEditor } from "platejs/react";
import { insertCodeBlock } from "@platejs/code-block";
import { KEYS, PathApi } from "platejs";

type InsertBlockOptions = {
  upsert?: boolean;
};

const insertList = (editor: PlateEditor, type: string) => {
  editor.tf.insertNodes(
    editor.api.create.block({
      indent: 1,
      listStyleType: type,
    }),
    { select: true }
  );
};

const insertBlockMap: Record<
  string,
  (editor: PlateEditor, type: string) => void
> = {
  [KEYS.ul]: insertList,
  [KEYS.ol]: insertList,
  [KEYS.codeBlock]: (editor) => insertCodeBlock(editor, { select: true }),
};

export const insertBlock = (
  editor: PlateEditor,
  type: string,
  options: InsertBlockOptions = {}
) => {
  const { upsert = false } = options;

  editor.tf.withoutNormalizing(() => {
    const block = editor.api.block();
    if (!block) return;

    const [currentNode, path] = block;
    const isCurrentBlockEmpty = editor.api.isEmpty(currentNode);
    const isSameBlockType = type === currentNode.type;

    if (upsert && isCurrentBlockEmpty && isSameBlockType) return;

    if (type in insertBlockMap) {
      insertBlockMap[type](editor, type);
    } else {
      editor.tf.insertNodes(editor.api.create.block({ type }), {
        at: PathApi.next(path),
        select: true,
      });
    }

    if (!isSameBlockType && isCurrentBlockEmpty) {
      editor.tf.removeNodes({ at: path });
    }
  });
};

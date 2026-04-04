"use client";

import { useState, useTransition } from "react";
import {
  Tree,
  Tag,
  Select,
  Input,
  DatePicker,
  Typography,
  Space,
  ConfigProvider,
  theme,
  Card,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import type { TreeDataNode } from "antd";
import dayjs from "dayjs";
import { updateTickleDate, updateTaskField } from "./actions";
import type { TreeTask } from "./page";

const { Text, Title } = Typography;

function tickleStatus(d: string | null | undefined): "error" | "warning" | "default" {
  if (!d) return "default";
  const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "error";
  if (diff < 3) return "warning";
  return "default";
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "No date";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function EditableField({
  value,
  recordId,
  field,
  style,
}: {
  value: string;
  recordId: string;
  field: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <Input
        size="small"
        defaultValue={value}
        autoFocus
        style={{ width: "100%", ...style }}
        onBlur={(e) => {
          setEditing(false);
          if (e.target.value !== value) {
            startTransition(() => updateTaskField(recordId, field, e.target.value));
          }
        }}
        onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <Text
      style={{ cursor: "text", opacity: isPending ? 0.5 : 1, ...style }}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {value || <Text type="secondary" italic>empty</Text>}
    </Text>
  );
}

function ProjectTitle({ node }: { node: TreeTask }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const status = tickleStatus(node.tickleDate);

  return (
    <Space size="middle" align="center">
      <Text strong>{node.name}</Text>
      {editing ? (
        <DatePicker
          size="small"
          defaultValue={node.tickleDate ? dayjs(node.tickleDate) : undefined}
          autoFocus
          onBlur={() => setEditing(false)}
          onChange={(date) => {
            setEditing(false);
            if (date && node.taskIds) {
              startTransition(() =>
                updateTickleDate(node.taskIds!, date.toISOString())
              );
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <Tag
          icon={<CalendarOutlined />}
          color={status === "error" ? "error" : status === "warning" ? "warning" : "default"}
          style={{ cursor: "pointer", opacity: isPending ? 0.5 : 1 }}
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          {formatDate(node.tickleDate)}
        </Tag>
      )}
      <Text type="secondary" style={{ fontSize: 12 }}>
        {node.children?.length} tasks
      </Text>
    </Space>
  );
}

function TaskTitle({ node }: { node: TreeTask }) {
  const [isPending, startTransition] = useTransition();
  const isDone = node.taskStatus === "Done";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        opacity: isPending ? 0.5 : 1,
      }}
    >
      <div style={{ width: 280, flexShrink: 0 }}>
        <EditableField
          value={node.name}
          recordId={node.key}
          field="task"
          style={isDone ? { textDecoration: "line-through", color: "rgba(0,0,0,0.45)" } : undefined}
        />
      </div>

      <div style={{ width: 117, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <Select
          size="small"
          value={node.taskStatus || "Tickled"}
          style={{ width: "100%" }}
          onChange={(v) => startTransition(() => updateTaskField(node.key, "taskStatus", v))}
          options={[
            {
              value: "Tickled",
              label: (
                <Space>
                  <ClockCircleOutlined style={{ color: "#faad14" }} />
                  Tickled
                </Space>
              ),
            },
            {
              value: "Done",
              label: (
                <Space>
                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                  Done
                </Space>
              ),
            },
          ]}
        />
      </div>

      <div style={{ width: 140, flexShrink: 0 }}>
        <EditableField value={node.taskResult || ""} recordId={node.key} field="taskResult" />
      </div>

      <div style={{ flex: 1 }}>
        <EditableField
          value={node.taskNotes || ""}
          recordId={node.key}
          field="taskNotes"
          style={{ fontStyle: "italic", color: "rgba(0,0,0,0.45)" }}
        />
      </div>
    </div>
  );
}

function UberTitle({ node }: { node: TreeTask }) {
  return (
    <Title level={5} style={{ margin: 0 }}>
      {node.name}
    </Title>
  );
}

function buildAntTreeData(nodes: TreeTask[]): TreeDataNode[] {
  return nodes.map((node) => {
    let title: React.ReactNode;

    if (node.nodeType === "uber") {
      title = <UberTitle node={node} />;
    } else if (node.nodeType === "project") {
      title = <ProjectTitle node={node} />;
    } else {
      title = <TaskTitle node={node} />;
    }

    return {
      key: node.key,
      title,
      children: node.children ? buildAntTreeData(node.children) : undefined,
      isLeaf: !node.children || node.children.length === 0,
    };
  });
}

function TypekitHead() {
  return (
    // eslint-disable-next-line @next/next/no-css-tags
    <link rel="stylesheet" href="https://use.typekit.net/qjz7hyx.css" />
  );
}

export function AntProjectTree({
  treeData,
  taskCount,
}: {
  treeData: TreeTask[];
  taskCount: number;
}) {
  const antTreeData = buildAntTreeData(treeData);
  const allKeys = treeData.flatMap((uber) => [
    uber.key,
    ...(uber.children?.map((p) => p.key) || []),
  ]);

  const [currentTheme, setCurrentTheme] = useState<"default" | "dark" | "compact">("default");

  const algorithms = {
    default: theme.defaultAlgorithm,
    dark: theme.darkAlgorithm,
    compact: theme.compactAlgorithm,
  };

  const isDark = currentTheme === "dark";

  return (
    <>
    <TypekitHead />
    <ConfigProvider
      theme={{
        algorithm: algorithms[currentTheme],
        token: {
          borderRadius: 6,
          fontFamily: '"roboto-condensed", "Roboto Condensed", sans-serif',
        },
      }}
    >
      <div
        style={{
          maxWidth: "100%",
          margin: "0 auto",
          padding: "24px 40px",
          minHeight: "100vh",
          background: isDark ? "#141414" : undefined,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0 }}>Projects</Title>
          <Space>
            <Text type="secondary">{taskCount} tasks</Text>
            <Select
              size="small"
              value={currentTheme}
              onChange={setCurrentTheme}
              style={{ width: 120 }}
              options={[
                { value: "default", label: "Default" },
                { value: "dark", label: "Dark" },
                { value: "compact", label: "Compact" },
              ]}
            />
          </Space>
        </div>

        {/* Column headers */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 12px 8px 68px",
            borderBottom: isDark ? "2px solid #303030" : "2px solid #f0f0f0",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
            color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
            background: isDark ? "#1f1f1f" : "#fafafa",
            borderRadius: "8px 8px 0 0",
          }}
        >
          <div style={{ width: 280, flexShrink: 0 }}>Task</div>
          <div style={{ width: 117, flexShrink: 0, textAlign: "center" }}>Status</div>
          <div style={{ width: 140, flexShrink: 0 }}>Result</div>
          <div style={{ flex: 1 }}>Notes</div>
        </div>

        <Card
          style={{ borderRadius: "0 0 8px 8px", borderTop: 0, background: isDark ? "#1f1f1f" : undefined }}
          styles={{ body: { padding: 0 } }}
        >
          <Tree
            treeData={antTreeData}
            defaultExpandedKeys={allKeys}
            showLine={{ showLeafIcon: false }}
            blockNode
            selectable={false}
            style={{ padding: "8px 0" }}
          />
        </Card>
      </div>
    </ConfigProvider>
    </>
  );
}

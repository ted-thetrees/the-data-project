"use client";

import { useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NewProjectPage() {
  const [project, setProject] = useState("");
  const [task, setTask] = useState("");
  const [tickleDate, setTickleDate] = useState("");
  const [uberProject, setUberProject] = useState("");
  const [copied, setCopied] = useState(false);

  const projectRef = useRef<HTMLInputElement>(null);

  const canSubmit = project.trim() && task.trim();

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    const lines = [
      "/new-project",
      `project: ${project.trim()}`,
      `task: ${task.trim()}`,
    ];
    if (tickleDate.trim()) lines.push(`tickle: ${tickleDate.trim()}`);
    if (uberProject.trim()) lines.push(`uber: ${uberProject.trim()}`);

    const text = lines.join("\n");
    await navigator.clipboard.writeText(text);

    // Trigger Keyboard Maestro to paste into iTerm2
    fetch(
      "https://trigger.keyboardmaestro.com/t/57BF8E52-4DC5-48B0-AA69-56B60FE6E916/CACDB70A-15B1-46C8-821B-90876D2EC01D?TriggerValue",
      { mode: "no-cors" }
    ).catch(() => {});

    setCopied(true);
    setProject("");
    setTask("");
    setTickleDate("");
    setUberProject("");
    projectRef.current?.focus();

    setTimeout(() => setCopied(false), 1500);
  }, [project, task, tickleDate, uberProject, canSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && e.metaKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm"
        onKeyDown={handleKeyDown}
      >
        <h1
          className="mb-8 text-foreground"
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-bold)",
            letterSpacing: "var(--letter-spacing-tight)",
          }}
        >
          New Project
        </h1>

        <div className="flex flex-col gap-5">
          <Field label="Project">
            <Input
              ref={projectRef}
              value={project}
              onChange={(e) => setProject(e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="Task">
            <Input
              value={task}
              onChange={(e) => setTask(e.target.value)}
            />
          </Field>

          <Field label="Tickle Date">
            <Input
              value={tickleDate}
              onChange={(e) => setTickleDate(e.target.value)}
              placeholder="tomorrow, +3, friday, apr 15"
            />
          </Field>

          <Field label="Uber Project">
            <Input
              value={uberProject}
              onChange={(e) => setUberProject(e.target.value)}
              placeholder="personal, if not for, wickercast"
            />
          </Field>

          <Button
            className="mt-2 w-full"
            size="lg"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {copied ? "Copied!" : "Copy & Clear"}
            {!copied && (
              <kbd className="ml-2 text-xs opacity-60">&#8984;&#9166;</kbd>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-muted-foreground"
        style={{
          fontSize: "var(--font-size-xs)",
          fontWeight: "var(--font-weight-semibold)",
          textTransform: "uppercase",
          letterSpacing: "var(--letter-spacing-wide)",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

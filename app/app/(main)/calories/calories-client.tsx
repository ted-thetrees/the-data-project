"use client";

import { useState, useTransition } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Subtitle } from "@/components/subtitle";
import { EditableText, EditableNumber } from "@/components/editable-text";
import {
  createLogEntry,
  createFood,
  updateLogItem,
  updateLogCalories,
  updateFoodName,
  updateFoodCalories,
  deleteLogEntry,
  deleteFood,
} from "./actions";

export interface LogRow {
  id: string;
  item: string;
  calories: number;
  food_name: string | null;
  created_at: string;
}

export interface FoodRow {
  id: string;
  name: string;
  calories: number;
}

export function CaloriesClient({
  log,
  foods,
  total,
  allowance,
}: {
  log: LogRow[];
  foods: FoodRow[];
  total: number;
  allowance: number;
}) {
  const remaining = allowance - total;
  const over = remaining < 0;

  const logColumns: Column<LogRow>[] = [
    {
      key: "item",
      header: "Item",
      width: 260,
      render: (row) => (
        <EditableText
          value={row.item}
          onSave={(v) => updateLogItem(row.id, v)}
        />
      ),
    },
    {
      key: "calories",
      header: "Calories",
      width: 100,
      align: "right",
      render: (row) => (
        <EditableNumber
          value={row.calories}
          onSave={(v) => updateLogCalories(row.id, v)}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      width: 80,
      render: (row) => <DeleteButton onDelete={() => deleteLogEntry(row.id)} />,
    },
  ];

  const foodColumns: Column<FoodRow>[] = [
    {
      key: "name",
      header: "Food",
      width: 260,
      render: (row) => (
        <EditableText
          value={row.name}
          onSave={(v) => updateFoodName(row.id, v)}
        />
      ),
    },
    {
      key: "calories",
      header: "Calories",
      width: 100,
      align: "right",
      render: (row) => (
        <EditableNumber
          value={row.calories}
          onSave={(v) => updateFoodCalories(row.id, v)}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      width: 80,
      render: (row) => <DeleteButton onDelete={() => deleteFood(row.id)} />,
    },
  ];

  return (
    <div className="space-y-10">
      <section>
        <TotalDisplay total={total} allowance={allowance} remaining={remaining} over={over} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">Today&apos;s Log</h2>
        <Subtitle>
          Click any cell to edit. Type a saved food name to auto-fill its calories.
        </Subtitle>
        <div className="mt-4">
          <DataTable
            columns={logColumns}
            rows={log}
            rowKey={(r) => r.id}
            fixedLayout
            storageKey="calories:log"
            onAddRow={createLogEntry}
            addRowLabel="+ Add entry"
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">Custom Foods</h2>
        <Subtitle>Saved foods with fixed calorie values. Click any cell to edit.</Subtitle>
        <div className="mt-4">
          <DataTable
            columns={foodColumns}
            rows={foods}
            rowKey={(r) => r.id}
            fixedLayout
            storageKey="calories:foods"
            onAddRow={createFood}
            addRowLabel="+ Add food"
          />
        </div>
      </section>
    </div>
  );
}

function TotalDisplay({
  total,
  allowance,
  remaining,
  over,
}: {
  total: number;
  allowance: number;
  remaining: number;
  over: boolean;
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--card)] p-6 flex items-baseline gap-6"
    >
      <div>
        <div className="text-[length:var(--font-size-xs)] uppercase tracking-[var(--letter-spacing-wide)] text-[color:var(--muted-foreground)]">
          Today
        </div>
        <div className="text-[length:var(--font-size-xl)] font-[number:var(--font-weight-bold)]">
          {total.toLocaleString()}
          <span className="text-[length:var(--font-size-base)] font-[number:var(--font-weight-normal)] text-[color:var(--muted-foreground)]">
            {" / "}
            {allowance.toLocaleString()} cal
          </span>
        </div>
      </div>
      <div>
        <div className="text-[length:var(--font-size-xs)] uppercase tracking-[var(--letter-spacing-wide)] text-[color:var(--muted-foreground)]">
          {over ? "Over" : "Remaining"}
        </div>
        <div
          className="text-[length:var(--font-size-xl)] font-[number:var(--font-weight-bold)]"
          style={{ color: over ? "var(--destructive)" : "var(--success)" }}
        >
          {Math.abs(remaining).toLocaleString()} cal
        </div>
      </div>
    </div>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="themed-button-sm ghost-danger"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await onDelete();
            setConfirming(false);
          })
        }
        className="themed-button-sm themed-button-danger"
      >
        {pending ? "…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="themed-button-sm"
      >
        Cancel
      </button>
    </div>
  );
}

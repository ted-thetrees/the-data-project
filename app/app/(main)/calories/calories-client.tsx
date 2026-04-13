"use client";

import { useId, useRef, useState, useTransition } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Subtitle } from "@/components/subtitle";
import {
  addLogEntry,
  addFood,
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
    { key: "item", header: "Item", width: 260 },
    {
      key: "calories",
      header: "Calories",
      width: 100,
      align: "right",
      render: (row) => row.calories.toLocaleString(),
    },
    {
      key: "actions",
      header: "",
      width: 80,
      render: (row) => <DeleteButton onDelete={() => deleteLogEntry(row.id)} />,
    },
  ];

  const foodColumns: Column<FoodRow>[] = [
    { key: "name", header: "Food", width: 260 },
    {
      key: "calories",
      header: "Calories",
      width: 100,
      align: "right",
      render: (row) => row.calories.toLocaleString(),
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
          Enter a saved food name to auto-use its calories, or add a new item with a custom value.
        </Subtitle>
        <AddLogForm foods={foods} />
        <div className="mt-4">
          <DataTable
            columns={logColumns}
            rows={log}
            rowKey={(r) => r.id}
            fixedLayout
            storageKey="calories:log"
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">Custom Foods</h2>
        <Subtitle>Saved foods with fixed calorie values.</Subtitle>
        <AddFoodForm />
        <div className="mt-4">
          <DataTable
            columns={foodColumns}
            rows={foods}
            rowKey={(r) => r.id}
            fixedLayout
            storageKey="calories:foods"
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

function AddLogForm({ foods }: { foods: FoodRow[] }) {
  const datalistId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await addLogEntry(formData);
          formRef.current?.reset();
          nameRef.current?.focus();
        });
      }}
      className="flex gap-2 items-center"
    >
      <input
        ref={nameRef}
        name="name"
        list={datalistId}
        placeholder="Food"
        autoComplete="off"
        required
        className="flex-1 max-w-[320px] h-9 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-[length:var(--font-size-base)] outline-none focus:border-[color:var(--ring)]"
      />
      <datalist id={datalistId}>
        {foods.map((f) => (
          <option key={f.id} value={f.name}>
            {f.calories} cal
          </option>
        ))}
      </datalist>
      <input
        name="calories"
        type="number"
        min="0"
        placeholder="Calories"
        className="w-32 h-9 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-[length:var(--font-size-base)] outline-none focus:border-[color:var(--ring)]"
      />
      <button
        type="submit"
        disabled={pending}
        className="themed-button themed-button-success"
      >
        {pending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}

function AddFoodForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await addFood(formData);
          formRef.current?.reset();
        });
      }}
      className="flex gap-2 items-center"
    >
      <input
        name="name"
        placeholder="Food name"
        autoComplete="off"
        required
        className="flex-1 max-w-[320px] h-9 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-[length:var(--font-size-base)] outline-none focus:border-[color:var(--ring)]"
      />
      <input
        name="calories"
        type="number"
        min="0"
        required
        placeholder="Calories"
        className="w-32 h-9 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-[length:var(--font-size-base)] outline-none focus:border-[color:var(--ring)]"
      />
      <button
        type="submit"
        disabled={pending}
        className="themed-button"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
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

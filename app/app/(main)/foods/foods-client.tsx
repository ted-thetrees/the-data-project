"use client";

import { DataTable, type Column } from "@/components/data-table";
import type { ViewParams } from "@/components/table-views";
import { EditableText, EditableNumber } from "@/components/editable-text";
import { FOODS_STORAGE_KEY } from "./config";
import {
  createFood,
  updateFoodName,
  updateFoodCalories,
  deleteFood,
} from "./actions";

export interface FoodRow {
  id: string;
  name: string;
  calories: number;
}

export function FoodsClient({
  foods,
  initialParams,
}: {
  foods: FoodRow[];
  initialParams?: ViewParams;
}) {
  const columns: Column<FoodRow>[] = [
    {
      key: "name",
      header: "Food",
      width: 280,
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
  ];

  return (
    <DataTable
      columns={columns}
      rows={foods}
      rowKey={(r) => r.id}
      fixedLayout
      storageKey={FOODS_STORAGE_KEY}
      initialParams={initialParams}
      onAddTopRow={createFood}
      addTopRowLabel="+ New food"
      onDeleteRow={(row) => deleteFood(row.id)}
      deleteItemLabel={(row) => `"${row.name}"`}
    />
  );
}

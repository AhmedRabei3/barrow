import Card from "@/app/components/card/Card";
import { toGrandItem } from "./profileHelper";
import { motion } from "framer-motion";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { GrandItem } from "../../types/index";

export const Stat = ({
  label,
  value,
  iconName,
  hint,
  tone = "default",
}: {
  label?: string;
  value: React.ReactNode;
  iconName?: string;
  hint?: React.ReactNode;
  tone?: "default" | "success" | "primary";
}) => (
  <div className="rounded-none border-y border-slate-200 bg-white px-4 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-xl sm:border sm:p-5">
    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className="font-semibold tracking-wide">{label}</span>
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${
          tone === "success"
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            : tone === "primary"
              ? "bg-primary/10 text-primary"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        <DynamicIcon iconName={iconName} />
      </span>
    </div>
    <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      {value}
    </div>
    {hint ? (
      <div
        className={`mt-2 text-xs font-semibold ${
          tone === "success"
            ? "text-emerald-500"
            : tone === "primary"
              ? "text-primary"
              : "text-slate-400 dark:text-slate-500"
        }`}
      >
        {hint}
      </div>
    ) : null}
  </div>
);

export const PreviewGrid = ({
  items,
  setItemIdToDelete,
  setItemIdToEdit,
  removingItemIds,
  onStatusChanged,
}: {
  items: Array<GrandItem | Record<string, unknown>>;
  setItemIdToDelete: React.Dispatch<React.SetStateAction<string | null>>;
  setItemIdToEdit: React.Dispatch<React.SetStateAction<string | null>>;
  removingItemIds: string[];
  onStatusChanged?: () => Promise<void> | void;
}) => (
  <motion.div
    layout
    className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
  >
    {items.map((it, idx: number) => (
      <motion.div
        key={(it as { id?: string; item?: { id?: string } })?.item?.id || (it as { id?: string })?.id || idx}
        layout
        animate={
          removingItemIds.includes(
            String(
              (it as { item?: { id?: string }; id?: string })?.item?.id ||
                (it as { id?: string })?.id ||
                "",
            ),
          )
            ? {
                opacity: 0,
                scale: 0.98,
                y: -12,
                filter: "blur(4px)",
              }
            : {
                opacity: 1,
                scale: 1,
                y: 0,
                filter: "blur(0px)",
              }
        }
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full"
      >
        <Card
          grandItem={
            "item" in (it as Record<string, unknown>)
              ? (it as GrandItem)
              : (toGrandItem(
                  it as Parameters<typeof toGrandItem>[0],
                ) as GrandItem)
          }
          setItemIdToDelete={setItemIdToDelete}
          setItemIdToEdit={setItemIdToEdit}
          onStatusChanged={onStatusChanged}
        />
      </motion.div>
    ))}
  </motion.div>
);

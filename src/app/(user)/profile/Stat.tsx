import Card from "@/app/components/card/Card";
import { toGrandItem } from "./profileHelper";
import { motion } from "framer-motion";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { GrandItem } from "../../types/index";

export const Stat = ({
  label,
  value,
  iconName,
}: {
  label?: string;
  value: React.ReactNode;
  iconName?: string;
}) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-900/80 px-3 py-2.5">
    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
      <DynamicIcon iconName={iconName} />
      {label}
    </div>
    <div className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
      {value}
    </div>
  </div>
);

export const PreviewGrid = ({
  items,
  setItemIdToDelete,
  setItemIdToEdit,
}: {
  items: Array<GrandItem | Record<string, unknown>>;
  setItemIdToDelete: React.Dispatch<React.SetStateAction<string | null>>;
  setItemIdToEdit: React.Dispatch<React.SetStateAction<string | null>>;
}) => (
  <motion.div
    layout
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
  >
    {items.map((it, idx: number) => (
      <div
        key={(it as { id?: string })?.id || idx}
        className="flex justify-center"
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
        />
      </div>
    ))}
  </motion.div>
);

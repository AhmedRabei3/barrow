"use client";

import { FormattedItem } from "./getItems";
import Card from "../card/Card";
import { memo } from "react";
import { motion } from "framer-motion";

interface CardListProps {
  items: FormattedItem[];
}

const getCardKey = (item: FormattedItem) => `${item.item.id}`;

const CardList = ({ items }: CardListProps) => {
  return (
    <div
      className="
        flex-1 w-full
        grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
        gap-x-5 gap-y-8 md:gap-x-6 md:gap-y-9 items-stretch
        "
    >
      {items.map((i, index) => (
        <motion.div
          key={getCardKey(i)}
          className="h-full w-full flex"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: Math.min(index * 0.02, 0.2) }}
        >
          <Card grandItem={i} />
        </motion.div>
      ))}
    </div>
  );
};

export default memo(CardList);

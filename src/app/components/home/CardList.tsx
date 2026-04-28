"use client";

import { FormattedItem } from "./getItems";
import Card from "../card/Card";
import { memo, useMemo } from "react";

interface CardListProps {
  items: FormattedItem[];
}

const getCardKey = (item: FormattedItem) => `${item.item.id}`;

const CardList = ({ items }: CardListProps) => {
  const renderedItems = useMemo(
    () =>
      items.map((item, index) => ({
        item,
        key: getCardKey(item),
        delay: Math.min(index * 0.02, 0.2),
        // Keep high priority for only one above-the-fold image to avoid network contention.
        priority: index === 0,
      })),
    [items],
  );

  return (
    <div
      className="
        flex-1 w-full
        grid
        lg:grid-cols-5
        min-[1680px]:grid-cols-6
        md:grid-cols-3
        sm:grid-cols-1
        gap-x-5 gap-y-8 md:gap-x-6 md:gap-y-9 items-stretch
        "
    >
      {renderedItems.map(({ item, key, delay, priority }) => (
        <div
          key={key}
          className="flex h-full w-full"
          style={{ transitionDelay: `${delay}s` }}
        >
          <Card grandItem={item} priority={priority} />
        </div>
      ))}
    </div>
  );
};

export default memo(CardList);

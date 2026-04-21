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
      })),
    [items],
  );

  return (
    <div
      className="
        flex-1 w-full
        grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] min-[1680px]:grid-cols-6
        gap-x-5 gap-y-8 md:gap-x-6 md:gap-y-9 items-stretch
        "
    >
      {renderedItems.map(({ item, key, delay }) => (
        <div
          key={key}
          className="flex h-full w-full"
          style={{ transitionDelay: `${delay}s` }}
        >
          <Card grandItem={item} />
        </div>
      ))}
    </div>
  );
};

export default memo(CardList);

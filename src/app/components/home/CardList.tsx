"use client";

import { FormattedItem } from "./getItems";
import Card from "../card/Card";
import { memo, useEffect, useMemo, useState } from "react";

interface CardListProps {
  items: FormattedItem[];
}

const getCardKey = (item: FormattedItem) => `${item.item.id}`;

const CardList = ({ items }: CardListProps) => {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(items.length, 10),
  );

  useEffect(() => {
    setVisibleCount(Math.min(items.length, 10));
  }, [items]);

  useEffect(() => {
    if (visibleCount >= items.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      setVisibleCount((current) => Math.min(current + 10, items.length));
    }, 140);

    return () => window.clearTimeout(timer);
  }, [items.length, visibleCount]);

  const renderedItems = useMemo(
    () =>
      items.slice(0, visibleCount).map((item, index) => ({
        item,
        key: getCardKey(item),
        delay: Math.min(index * 0.02, 0.2),
        priority: index < 4,
      })),
    [items, visibleCount],
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

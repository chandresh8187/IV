export const movePlanningItem = (items, from, to) => {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length ||
    from === to
  )
    return items;
  const reordered = [...items];
  const [item] = reordered.splice(from, 1);
  reordered.splice(to, 0, item);
  return reordered;
};

export const movedPlanningIndex = (index, from, to) => {
  if (index == null) return index;
  if (index === from) return to;
  if (from < to && index > from && index <= to) return index - 1;
  if (from > to && index >= to && index < from) return index + 1;
  return index;
};

export const closestPlanningPosition = (layouts, center, fallback) => {
  let target = fallback;
  let distance = Infinity;
  layouts.forEach((layout, index) => {
    if (!layout) return;
    const delta = Math.abs(center - layout.y - layout.height / 2);
    if (delta < distance) {
      distance = delta;
      target = index;
    }
  });
  return target;
};

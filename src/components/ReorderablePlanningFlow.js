import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GripVertical } from 'lucide-react-native';
import { COLORS, UI } from '../assets/Colors';
import { closestPlanningPosition } from '../utils/planningOrder';

function DragHandle({
  index,
  label,
  count,
  disabled,
  onStart,
  onMove,
  onEnd,
  onCancel,
  onReorder,
}) {
  const latest = useRef();
  latest.current = { index, disabled, onStart, onMove, onEnd, onCancel };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      onPanResponderGrant: (_, gesture) =>
        latest.current.onStart(latest.current.index, gesture.y0),
      onPanResponderMove: (_, gesture) =>
        latest.current.onMove(gesture.dy, gesture.moveY),
      onPanResponderRelease: () => latest.current.onEnd(),
      onPanResponderTerminate: () => latest.current.onCancel(),
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;
  return (
    <View
      {...responder.panHandlers}
      style={styles.handle}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Reorder ${label}`}
      accessibilityHint="Drag up or down. Accessibility actions move the item one position."
      accessibilityState={{ disabled }}
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
      accessibilityActions={[
        { name: 'increment', label: 'Move down' },
        { name: 'decrement', label: 'Move up' },
      ]}
      onAccessibilityAction={event => {
        if (disabled) return;
        const action = event.nativeEvent.actionName;
        if (action === 'increment' && index < count - 1)
          onReorder(index, index + 1);
        if (action === 'decrement' && index > 0) onReorder(index, index - 1);
      }}
    >
      <GripVertical size={22} color={disabled ? COLORS.muted : COLORS.accent} />
    </View>
  );
}

export default function ReorderablePlanningFlow({
  items,
  renderItem,
  onReorder,
  disabled = false,
  onDraggingChange,
  hint = 'Drag the grip to a new position. Other items shift automatically. Save planning to apply.',
  maxHeight = 480,
  showHandles = true,
}) {
  const scroll = useRef(null);
  const layouts = useRef([]);
  const metrics = useRef({ top: 0, height: 0, contentHeight: 0, offset: 0 });
  const drag = useRef(null);
  const frame = useRef(null);
  const translation = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(null);
  const [target, setTarget] = useState(null);
  const callbacks = useRef();
  callbacks.current = { onReorder, onDraggingChange };
  const displayItems = drag.current?.items || items;

  const measure = () =>
    scroll.current?.measureInWindow((x, y, width, height) => {
      metrics.current.top = y;
      metrics.current.height = height;
    });
  const updatePosition = () => {
    const current = drag.current;
    if (!current) return;
    const delta = current.dy + metrics.current.offset - current.offset;
    translation.setValue(delta);
    current.to = closestPlanningPosition(
      layouts.current,
      current.center + delta,
      current.from,
    );
    setTarget(current.to);
  };
  const autoScroll = () => {
    const current = drag.current;
    if (!current) return;
    const box = metrics.current;
    const localY = current.pointerY - box.top;
    const step = localY < 48 ? -7 : localY > box.height - 48 ? 7 : 0;
    const next = Math.max(
      0,
      Math.min(Math.max(0, box.contentHeight - box.height), box.offset + step),
    );
    if (step && next !== box.offset) {
      box.offset = next;
      scroll.current?.scrollTo({ y: next, animated: false });
      updatePosition();
    }
    frame.current = requestAnimationFrame(autoScroll);
  };
  const finish = (save = true) => {
    const current = drag.current;
    drag.current = null;
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
    translation.setValue(0);
    setActive(null);
    setTarget(null);
    callbacks.current.onDraggingChange?.(false);
    if (save && current && current.from !== current.to)
      callbacks.current.onReorder(current.from, current.to, current.items);
  };
  useEffect(
    () => () => {
      drag.current = null;
      if (frame.current != null) cancelAnimationFrame(frame.current);
      callbacks.current.onDraggingChange?.(false);
    },
    [],
  );

  return (
    <View>
      <Text style={styles.hint}>
        {active == null
          ? hint
          : `Release to move to position ${(target ?? active) + 1}`}
      </Text>
      <ScrollView
        ref={scroll}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
        scrollEnabled={active == null}
        style={[styles.list, { maxHeight }]}
        onLayout={measure}
        scrollEventThrottle={16}
        onContentSizeChange={(_, height) => {
          metrics.current.contentHeight = height;
        }}
        onScroll={event => {
          metrics.current.offset = event.nativeEvent.contentOffset.y;
        }}
      >
        {displayItems.map((item, index) => (
          <Animated.View
            key={item.id || item.challan_number}
            onLayout={event => {
              layouts.current[index] = event.nativeEvent.layout;
              layouts.current.length = displayItems.length;
            }}
            style={[
              styles.row,
              target === index && active !== index && styles.dropTarget,
              active === index && [
                styles.dragging,
                { transform: [{ translateY: translation }] },
              ],
            ]}
          >
            {showHandles && (
              <DragHandle
                index={index}
                label={item.item_name || `item ${index + 1}`}
                count={displayItems.length}
                disabled={disabled || displayItems.length < 2}
                onReorder={(from, to) => onReorder(from, to, items)}
                onStart={(from, pointerY) => {
                  const layout = layouts.current[from];
                  if (!layout) return;
                  measure();
                  drag.current = {
                    items,
                    from,
                    to: from,
                    dy: 0,
                    pointerY,
                    offset: metrics.current.offset,
                    center: layout.y + layout.height / 2,
                  };
                  setActive(from);
                  setTarget(from);
                  callbacks.current.onDraggingChange?.(true);
                  frame.current = requestAnimationFrame(autoScroll);
                }}
                onMove={(dy, pointerY) => {
                  if (drag.current) {
                    drag.current.dy = dy;
                    drag.current.pointerY = pointerY;
                    updatePosition();
                  }
                }}
                onEnd={() => finish()}
                onCancel={() => finish(false)}
              />
            )}
            <View
              style={styles.content}
              pointerEvents={active == null ? 'auto' : 'none'}
            >
              {renderItem(item, index)}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 12,
  },
  list: { maxHeight: 480 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.white,
    marginBottom: 10,
  },
  handle: {
    width: 44,
    minHeight: 56,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, minWidth: 0 },
  dragging: {
    zIndex: 10,
    elevation: 8,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  dropTarget: {
    borderColor: COLORS.accent,
    borderWidth: 1,
    backgroundColor: COLORS.accentSoft,
  },
});

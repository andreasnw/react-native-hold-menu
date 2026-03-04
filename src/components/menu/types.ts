import type { ReactNode } from 'react';
import type { TransformOriginAnchorPosition } from '../../utils/calculations';

export type MenuItemProps = {
  text: string;
  icon?: string | (() => ReactNode);
  onPress?: (...args: unknown[]) => void;
  isTitle?: boolean;
  isDestructive?: boolean;
  withSeparator?: boolean;
};

export type MenuListProps = {
  items: MenuItemProps[];
};

export type MenuInternalProps = {
  items: MenuItemProps[];
  itemHeight: number;
  itemWidth: number;
  itemY: number;
  itemX: number;
  anchorPosition: TransformOriginAnchorPosition;
  menuHeight: number;
  transformValue: number;
  actionParams: Record<string, unknown[]>;
};

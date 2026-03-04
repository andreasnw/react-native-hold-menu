import { createContext, type ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { CONTEXT_MENU_STATE } from '../constants';
import type { MenuInternalProps } from '../components/menu/types';

export type ActiveOverlay = {
  id: string;
  node: ReactNode;
};

export type InternalContextType = {
  state: SharedValue<CONTEXT_MENU_STATE>;
  activeItemId: SharedValue<string | null>;
  theme: SharedValue<'light' | 'dark'>;
  menuProps: SharedValue<MenuInternalProps>;
  activeOverlayId: string | null;
  setActiveOverlay: (overlay: ActiveOverlay) => void;
  clearActiveOverlay: (overlayId?: string) => void;
  safeAreaInsets?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

export const InternalContext = createContext<InternalContextType | null>(null);

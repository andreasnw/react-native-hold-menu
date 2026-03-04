import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Animated, {
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Components
import { Backdrop } from '../backdrop';

// Utils
import {
  ActiveOverlay,
  InternalContext,
} from '../../context/internal';
import type {
  HoldMenuIconComponentProps,
  HoldMenuProviderProps,
} from './types';
import { CONTEXT_MENU_STATE } from '../../constants';
import type { MenuInternalProps } from '../menu/types';
import Menu from '../menu';

export let AnimatedIcon: React.ComponentType<HoldMenuIconComponentProps> | null =
  null;

const ProviderComponent = ({
  children,
  theme: selectedTheme,
  iconComponent,
  safeAreaInsets,
  onOpen,
  onClose,
}: HoldMenuProviderProps) => {
  AnimatedIcon = iconComponent
    ? (Animated.createAnimatedComponent(iconComponent) as React.ComponentType<HoldMenuIconComponentProps>)
    : null;

  const state = useSharedValue<CONTEXT_MENU_STATE>(
    CONTEXT_MENU_STATE.UNDETERMINED
  );
  const activeItemId = useSharedValue<string | null>(null);
  const theme = useSharedValue<'light' | 'dark'>(selectedTheme || 'light');
  const menuProps = useSharedValue<MenuInternalProps>({
    itemHeight: 0,
    itemWidth: 0,
    itemX: 0,
    itemY: 0,
    items: [],
    anchorPosition: 'top-center',
    menuHeight: 0,
    transformValue: 0,
    actionParams: {},
  });
  const [activeOverlay, setActiveOverlayState] = useState<ActiveOverlay | null>(
    null
  );

  useEffect(() => {
    theme.value = selectedTheme || 'light';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTheme]);

  const setActiveOverlay = useCallback((overlay: ActiveOverlay) => {
    setActiveOverlayState(overlay);
  }, []);

  const clearActiveOverlay = useCallback((overlayId?: string) => {
    setActiveOverlayState(current => {
      if (!current) {
        return current;
      }

      if (overlayId && current.id !== overlayId) {
        return current;
      }

      return null;
    });
  }, []);

  useAnimatedReaction(
    () => state.value,
    currentState => {
      switch (currentState) {
        case CONTEXT_MENU_STATE.ACTIVE: {
          if (onOpen) {
            scheduleOnRN(onOpen);
          }
          break;
        }
        case CONTEXT_MENU_STATE.END: {
          activeItemId.value = null;
          if (onClose) {
            scheduleOnRN(onClose);
          }
          break;
        }
        default: {
          break;
        }
      }
    },
    [activeItemId, onClose, onOpen, state]
  );

  const internalContextVariables = useMemo(
    () => ({
      state,
      activeItemId,
      theme,
      menuProps,
      activeOverlayId: activeOverlay?.id || null,
      setActiveOverlay,
      clearActiveOverlay,
      safeAreaInsets: safeAreaInsets || {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
    }),
    [
      activeItemId,
      activeOverlay?.id,
      clearActiveOverlay,
      menuProps,
      safeAreaInsets,
      setActiveOverlay,
      state,
      theme,
    ]
  );

  return (
    <InternalContext.Provider value={internalContextVariables}>
      {children}
      <Backdrop />
      {activeOverlay?.node}
      <Menu />
    </InternalContext.Provider>
  );
};

const Provider = memo(ProviderComponent);

export default Provider;

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import { StyleSheet, View, Modal, Pressable } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-reanimated';

// Components
import { Backdrop } from '../backdrop';

// Utils
import {
  CONTEXT_MENU_STATE,
  HOLD_ITEM_TRANSFORM_DURATION,
  SPRING_CONFIGURATION,
  WINDOW_WIDTH,
} from '../../constants';
import {
  ActiveOverlay,
  InternalContext,
} from '../../context/internal';
import Menu from '../menu';
import type { MenuInternalProps, MenuItemProps } from '../menu/types';
import type {
  HoldMenuIconComponentProps,
  HoldMenuProviderProps,
} from './types';



const ProviderComponent = ({
  children,
  theme: selectedTheme,
  iconComponent,
  safeAreaInsets,
  onOpen,
  onClose,
}: HoldMenuProviderProps) => {
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
    anchorPosition: 'top-center',
    menuHeight: 0,
    transformValue: 0,
    itemCount: 0,
    separatorCount: 0,
  });
  const [menuItems, setMenuItems] = useState<MenuItemProps[]>([]);
  const [menuActionParams, setMenuActionParams] = useState<
    Record<string, unknown[]>
  >({});
  const [activeOverlay, setActiveOverlayState] = useState<ActiveOverlay | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  // Shared value trigger: forces useAnimatedStyle to re-evaluate when React state changes
  const overlayVersion = useSharedValue(0);


  useEffect(() => {
    theme.value = selectedTheme || 'light';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTheme]);

  const setActiveOverlay = useCallback((overlay: ActiveOverlay) => {
    setActiveOverlayState(overlay);
  }, []);

  // Sync React state → shared value trigger (runs AFTER render, so closure is updated)
  useEffect(() => {
    overlayVersion.value = overlayVersion.value + 1;
  }, [activeOverlay, overlayVersion]);

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

  const clearOverlayAndMenu = useCallback(() => {
    setActiveOverlayState(null);
    setMenuItems([]);
    setMenuActionParams({});
  }, []);

  const dismissMenu = useCallback(() => {
    // Keep modal visible while closing animations play,
    // then clean up everything after animations complete
    setTimeout(() => {
      setModalVisible(false);
      clearOverlayAndMenu();
    }, HOLD_ITEM_TRANSFORM_DURATION + 150);
  }, [clearOverlayAndMenu]);

  const setMenuData = useCallback(
    (items: MenuItemProps[], actionParams: Record<string, unknown[]>) => {
      setMenuItems(items);
      setMenuActionParams(actionParams);
    },
    []
  );

  useAnimatedReaction(
    () => state.value,
    (currentState, previousState) => {
      switch (currentState) {
        case CONTEXT_MENU_STATE.ACTIVE: {
          runOnJS(setModalVisible)(true);
          if (onOpen) {
            runOnJS(onOpen)();
          }
          break;
        }
        case CONTEXT_MENU_STATE.END: {
          if (previousState === CONTEXT_MENU_STATE.ACTIVE) {
            activeItemId.value = null;
          }
          runOnJS(dismissMenu)();
          if (onClose) {
            runOnJS(onClose)();
          }
          break;
        }
        default: {
          break;
        }
      }
    },
    [
      activeItemId,
      onClose,
      onOpen,
      clearOverlayAndMenu,
      dismissMenu,
      state,
    ]
  );



  const animatedIcon = useMemo(
    () =>
      iconComponent
        ? (Animated.createAnimatedComponent(iconComponent) as React.ComponentType<HoldMenuIconComponentProps>)
        : null,
    [iconComponent]
  );

  const internalContextVariables = useMemo(
    () => ({
      state,
      activeItemId,
      theme,
      menuProps,
      menuItems,
      menuActionParams,
      setMenuData,
      activeOverlayId: activeOverlay?.id || null,
      setActiveOverlay,
      clearActiveOverlay,
      safeAreaInsets: safeAreaInsets || {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      animatedIcon,
    }),
    [
      activeItemId,
      activeOverlay?.id,
      animatedIcon,
      clearActiveOverlay,
      menuActionParams,
      menuItems,
      menuProps,
      safeAreaInsets,
      setMenuData,
      setActiveOverlay,
      state,
      theme,
    ]
  );

  const closeMenuFromRN = useCallback(() => {
    if (state.value === CONTEXT_MENU_STATE.ACTIVE) {
      state.value = CONTEXT_MENU_STATE.END;
    }
  }, [state]);

  const closeOverlayItemFromRN = useCallback(() => {
    if ((activeOverlay?.closeOnTap ?? true) && state.value === CONTEXT_MENU_STATE.ACTIVE) {
      state.value = CONTEXT_MENU_STATE.END;
    }
  }, [activeOverlay?.closeOnTap, state]);

  const animatedWrapperStyle = useAnimatedStyle(() => {
    const isAnimActive = state.value === CONTEXT_MENU_STATE.ACTIVE;
    const disableMove = activeOverlay ? activeOverlay.disableMove : false;

    return {
      transform: [
        {
          translateY: disableMove
            ? 0
            : isAnimActive
              ? withTiming(menuProps.value.transformValue, { duration: HOLD_ITEM_TRANSFORM_DURATION })
              : withTiming(0, { duration: HOLD_ITEM_TRANSFORM_DURATION }),
        },
      ],
    };
  });

  return (
    <InternalContext.Provider value={internalContextVariables}>
      {children}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeMenuFromRN}
      >
        <View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFillObject, { zIndex: 9998, overflow: 'visible' }]}
          collapsable={false}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeMenuFromRN}>
            <Backdrop />
          </Pressable>
          <Animated.View
            pointerEvents="box-none"
            style={[
              {
                zIndex: 9999,
                position: 'absolute',
                top: activeOverlay?.itemRectY?.value || 0,
                left: 0,
                width: WINDOW_WIDTH,
                overflow: 'visible',
              },
              animatedWrapperStyle
            ]}
          >
            <View
              style={[
                styles.overlayItemRow,
                {
                  minHeight: activeOverlay?.itemRectHeight?.value || 0,
                  width: activeOverlay?.itemRectWidth?.value || 0,
                  marginLeft: Math.max(0, activeOverlay?.itemRectX?.value || 0),
                  alignItems: 'flex-start',
                }
              ]}
            >
              <Pressable style={StyleSheet.absoluteFillObject} onPress={closeOverlayItemFromRN} />
              {activeOverlay?.itemNode}
            </View>
          </Animated.View>
          <Menu />
        </View>
      </Modal>
    </InternalContext.Provider>
  );
};

const Provider = memo(ProviderComponent);

export default Provider;

const styles = StyleSheet.create({
  overlayItemRow: {
    // position: 'relative',
  },
});

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import Animated, {
    useAnimatedProps,
    useAnimatedStyle,
    useDerivedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-reanimated';

function logWorkletError(label: string, message: string) {
  console.error('[react-native-hold-menu]', label, message);
}

import { BlurView } from 'expo-blur';
import {
    calculateMenuHeight,
    menuAnimationAnchor,
} from '../../utils/calculations';

import MenuItems from './MenuItems';

import {
    CONTEXT_MENU_STATE,
    HOLD_ITEM_TRANSFORM_DURATION,
    IS_IOS,
    SPRING_CONFIGURATION_MENU,
} from '../../constants';

import { useInternal } from '../../hooks';
import { leftOrRight } from './calculations';
import styles from './styles';

const AnimatedView = Animated.createAnimatedComponent(BlurView);

const MenuListComponent = () => {
  const { state, theme, menuProps, menuItems } = useInternal();
  const itemCountFromJS = menuItems.length;
  const separatorCountFromJS = useMemo(
    () => menuItems.filter(item => item.withSeparator).length,
    [menuItems]
  );

  const menuHeight = useDerivedValue(() => {
    try {
      const itemCount =
        menuProps.value.itemCount > 0 ? menuProps.value.itemCount : itemCountFromJS;
      const separatorCount =
        menuProps.value.itemCount > 0
          ? menuProps.value.separatorCount
          : separatorCountFromJS;
      
      // Ensure we have valid values before calculating
      if (itemCount <= 0) {
        return 0;
      }
      
      return calculateMenuHeight(
        itemCount,
        separatorCount || 0
      );
    } catch (e) {
      runOnJS(logWorkletError)(
        'MenuList.menuHeight',
        (e != null && typeof (e as Error).message === 'string')
          ? (e as Error).message
          : String(e)
      );
      return 0;
    }
  }, [menuProps, itemCountFromJS, separatorCountFromJS]);

  const animatedScale = useDerivedValue(() => {
    return state.value === CONTEXT_MENU_STATE.ACTIVE
      ? withTiming(1, { duration: HOLD_ITEM_TRANSFORM_DURATION })
      : withTiming(0, { duration: HOLD_ITEM_TRANSFORM_DURATION });
  }, [state]);

  const animatedOpacity = useDerivedValue(() => {
    return withTiming(state.value === CONTEXT_MENU_STATE.ACTIVE ? 1 : 0, {
      duration: state.value === CONTEXT_MENU_STATE.ACTIVE ? HOLD_ITEM_TRANSFORM_DURATION : 50,
    });
  }, [state]);

  const messageStyles = useAnimatedStyle(() => {
    try {
      // Add fallback values to prevent errors when menuProps are not initialized
      const anchorPosition = menuProps.value.anchorPosition || 'top-center';
      const itemWidth = menuProps.value.itemWidth || 0;
      const itemCount = menuProps.value.itemCount > 0 ? menuProps.value.itemCount : itemCountFromJS;
      const separatorCount = menuProps.value.itemCount > 0
        ? menuProps.value.separatorCount
        : (separatorCountFromJS || 0);

      const translate = menuAnimationAnchor(
        anchorPosition,
        itemWidth,
        itemCount,
        separatorCount
      );

      const _leftPosition = leftOrRight(menuProps);

      return {
        left: _leftPosition,
        height: menuHeight.value,
        opacity: animatedOpacity.value,
        transform: [
          { translateX: translate.beginningTransformations.translateX },
          { translateY: translate.beginningTransformations.translateY },
          {
            scale: animatedScale.value,
          },
          { translateX: translate.endingTransformations.translateX },
          { translateY: translate.endingTransformations.translateY },
        ],
      };
    } catch (e) {
      runOnJS(logWorkletError)(
        'MenuList.messageStyles',
        (e != null && typeof (e as Error).message === 'string')
          ? (e as Error).message
          : String(e)
      );
      // Return a safe fallback style
      return {
        left: 0,
        height: 0,
        opacity: 0,
        transform: [{ scale: 0 }],
      };
    }
  }, [itemCountFromJS, separatorCountFromJS, animatedOpacity, animatedScale]);

  const animatedInnerContainerStyle = useAnimatedStyle(() => {
    try {
      return {
        backgroundColor:
          theme.value === 'light'
            ? IS_IOS
              ? 'rgba(255, 255, 255, .75)'
              : 'rgba(255, 255, 255, .95)'
            : IS_IOS
            ? 'rgba(0,0,0,0.5)'
            : 'rgba(39, 39, 39, .8)',
      };
    } catch (e) {
      runOnJS(logWorkletError)(
        'MenuList.animatedInnerContainerStyle',
        (e != null && typeof (e as Error).message === 'string')
          ? (e as Error).message
          : String(e)
      );
      throw e;
    }
  }, [theme]);

  const animatedProps = useAnimatedProps(() => {
    try {
      return { tint: theme.value };
    } catch (e) {
      runOnJS(logWorkletError)(
        'MenuList.animatedProps',
        (e != null && typeof (e as Error).message === 'string')
          ? (e as Error).message
          : String(e)
      );
      throw e;
    }
  }, [theme]);

  // Fallback to Animated.View for iOS if expo-blur causes crashes
  if (IS_IOS) {
    return (
      <Animated.View style={[styles.menuContainer, messageStyles, { backgroundColor: 'transparent' }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.menuInnerContainer,
            animatedInnerContainerStyle,
          ]}
        >
          <MenuItems items={menuItems} />
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <AnimatedView
      intensity={100}
      animatedProps={animatedProps}
      style={[styles.menuContainer, messageStyles]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.menuInnerContainer,
          animatedInnerContainerStyle,
        ]}
      >
        <MenuItems items={menuItems} />
      </Animated.View>
    </AnimatedView>
  );
};

const MenuList = React.memo(MenuListComponent);

export default MenuList;

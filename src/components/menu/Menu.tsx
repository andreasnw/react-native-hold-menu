import React from 'react';

import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import MenuList from './MenuList';

import styles from './styles';
import { useInternal } from '../../hooks';
import {
  HOLD_ITEM_TRANSFORM_DURATION,
  CONTEXT_MENU_STATE,
  SPRING_CONFIGURATION,
} from '../../constants';

const MenuComponent = () => {
  const { state, menuProps } = useInternal();

  const animatedTranslateY = useDerivedValue(() => {
    const tY = menuProps.value.transformValue || 0;
    return state.value === CONTEXT_MENU_STATE.ACTIVE
      ? withTiming(tY, { duration: HOLD_ITEM_TRANSFORM_DURATION })
      : withDelay(100, withTiming(0, { duration: HOLD_ITEM_TRANSFORM_DURATION }));
  }, [state, menuProps]);

  const animatedOpacity = useDerivedValue(() => {
    return state.value === CONTEXT_MENU_STATE.ACTIVE
      ? withTiming(1, { duration: HOLD_ITEM_TRANSFORM_DURATION })
      : withTiming(0, { duration: 50 });
  }, [state]);

  const wrapperStyles = useAnimatedStyle(() => {
    // Add fallback values to prevent errors when menuProps are not yet initialized
    const anchorPosition = menuProps.value.anchorPosition || 'top-center';
    const anchorPositionVertical = anchorPosition.split('-')[0];
    const itemHeight = menuProps.value.itemHeight || 0;
    const itemY = menuProps.value.itemY || 0;
    const itemX = menuProps.value.itemX || 0;
    const itemWidth = menuProps.value.itemWidth || 0;

    const top =
      anchorPositionVertical === 'top'
        ? itemHeight + itemY + 16
        : itemY - 16;
    const left = itemX;
    const width = itemWidth;

    return {
      top,
      left,
      width,
      opacity: animatedOpacity.value,
      transform: [
        {
          translateY: animatedTranslateY.value,
        },
      ],
    };
  }, [menuProps, animatedOpacity, animatedTranslateY]);

  return (
    <Animated.View style={[styles.menuWrapper, wrapperStyles]}>
      <MenuList />
    </Animated.View>
  );
};

const Menu = React.memo(MenuComponent);

export default Menu;

import type { SharedValue } from 'react-native-reanimated';

import { MENU_WIDTH } from '../../constants';
import {
  MENU_TEXT_DARK_COLOR,
  MENU_TEXT_DESTRUCTIVE_COLOR_DARK,
  MENU_TEXT_DESTRUCTIVE_COLOR_LIGHT,
  MENU_TEXT_LIGHT_COLOR,
  MENU_TITLE_COLOR,
} from './constants';
import type { MenuInternalProps } from './types';

export const leftOrRight = (
  menuProps: SharedValue<MenuInternalProps>
) => {
  'worklet';

  const anchorPositionHorizontal = menuProps.value.anchorPosition.split('-')[1];
  const itemWidth = menuProps.value.itemWidth;

  let leftPosition = 0;
  if (anchorPositionHorizontal === 'right') {
    leftPosition = -MENU_WIDTH + itemWidth;
  } else if (anchorPositionHorizontal === 'left') {
    leftPosition = 0;
  } else {
    leftPosition =
      -menuProps.value.itemWidth -
      MENU_WIDTH / 2 +
      menuProps.value.itemWidth / 2;
  }

  return leftPosition;
};

export const getColor = (
  isTitle: boolean | undefined,
  isDestructive: boolean | undefined,
  themeValue: 'light' | 'dark'
) => {
  'worklet';
  return isTitle
    ? MENU_TITLE_COLOR
    : isDestructive
    ? themeValue === 'dark'
      ? MENU_TEXT_DESTRUCTIVE_COLOR_DARK
      : MENU_TEXT_DESTRUCTIVE_COLOR_LIGHT
    : themeValue === 'dark'
    ? MENU_TEXT_DARK_COLOR
    : MENU_TEXT_LIGHT_COLOR;
};

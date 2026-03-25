import { Dimensions } from 'react-native';

const { width: WINDOW_WIDTH } = Dimensions.get('screen');
const MENU_WIDTH = (WINDOW_WIDTH * 60) / 100;
const MENU_TRANSFORM_ORIGIN_TOLERENCE = 10;
const FONT_SCALE = Dimensions.get('screen').fontScale;

const ITEM_HEIGHT = 20 * FONT_SCALE + 8 * 2.5;
const SPACING = 8;


export const MenuItemHeight = () => {
  'worklet';
  return ITEM_HEIGHT;
};

export const calculateMenuHeight = (
  itemLength: number,
  separatorCount: number
) => {
  'worklet';
  return (
    ITEM_HEIGHT * itemLength +
    (itemLength - 1) +
    separatorCount * SPACING
  );
};


export type TransformOriginAnchorPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export const menuAnimationAnchor = (
  anchorPoint: TransformOriginAnchorPosition,
  itemWidth: number,
  itemLength: number,
  itemsWithSeparatorLength: number
) => {
  'worklet';
  const MenuHeight = calculateMenuHeight(itemLength, itemsWithSeparatorLength);
  const anchor =
    typeof anchorPoint === 'string' ? anchorPoint : 'top-center';
  const splittetAnchorName: string[] = anchor.split('-');

  const Center1 = itemWidth;
  const Center2 = 0;

  const TyTop1 = -(MenuHeight / 2);
  const TyTop2 = MenuHeight / 2;

  const TxLeft1 = (MENU_WIDTH / 2) * -1;
  const TxLeft2 = (MENU_WIDTH / 2) * 1;

  return {
    beginningTransformations: {
      translateX:
        splittetAnchorName[1] === 'right'
          ? -TxLeft1
          : splittetAnchorName[1] === 'left'
          ? TxLeft1
          : Center1,
      translateY:
        splittetAnchorName[0] === 'top'
          ? TyTop1
          : splittetAnchorName[0] === 'bottom'
          ? TyTop1
          : Center2,
    },
    endingTransformations: {
      translateX:
        splittetAnchorName[1] === 'right'
          ? -TxLeft2
          : splittetAnchorName[1] === 'left'
          ? TxLeft2
          : Center2,
      translateY:
        splittetAnchorName[0] === 'top'
          ? TyTop2
          : splittetAnchorName[0] === 'bottom'
          ? -TyTop2
          : Center2,
    },
  };
};

export const getTransformOrigin = (
  posX: number,
  itemWidth: number,
  windowWidth: number,
  bottom?: boolean
): TransformOriginAnchorPosition => {
  'worklet';
  const distanceToLeft = Math.round(posX + itemWidth / 2);
  const distanceToRight = Math.round(windowWidth - distanceToLeft);

  let position: TransformOriginAnchorPosition = bottom
    ? 'bottom-right'
    : 'top-right';

  const majority = Math.abs(distanceToLeft - distanceToRight);

  if (majority < MENU_TRANSFORM_ORIGIN_TOLERENCE) {
    position = bottom ? 'bottom-center' : 'top-center';
  } else if (distanceToLeft < distanceToRight) {
    position = bottom ? 'bottom-left' : 'top-left';
  }

  return position;
};

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

//#region reanimated & gesture handler
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
//#endregion

//#region dependencies
import * as Haptics from 'expo-haptics';
//#endregion

//#region utils & types
import {
  TransformOriginAnchorPosition,
  calculateMenuHeight,
  getTransformOrigin,
} from '../../utils/calculations';
import {
  CONTEXT_MENU_STATE,
  HOLD_ITEM_SCALE_DOWN_DURATION,
  HOLD_ITEM_SCALE_DOWN_VALUE,
  HOLD_ITEM_TRANSFORM_DURATION,
  SPRING_CONFIGURATION,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
} from '../../constants';
import { useDeviceOrientation } from '../../hooks';
import styles from './styles';

import type { HoldItemProps } from './types';
import styleGuide from '../../styleGuide';
import { useInternal } from '../../hooks';
//#endregion

let holdItemId = 0;

const getNextHoldItemId = () => {
  holdItemId += 1;
  return `hold-item-${holdItemId}`;
};

const HoldItemComponent = ({
  items,
  bottom,
  containerStyles,
  disableMove,
  menuAnchorPosition,
  activateOn,
  hapticFeedback,
  actionParams,
  closeOnTap,
  longPressMinDurationMs = 150,
  children,
}: HoldItemProps) => {
  //#region hooks
  const {
    state,
    activeItemId,
    activeOverlayId,
    menuProps,
    safeAreaInsets,
    setActiveOverlay,
    clearActiveOverlay,
  } = useInternal();
  const deviceOrientation = useDeviceOrientation();
  //#endregion

  //#region variables
  const isActive = useSharedValue(false);
  const isAnimationStarted = useSharedValue(false);

  const itemRectY = useSharedValue<number>(0);
  const itemRectX = useSharedValue<number>(0);
  const itemRectWidth = useSharedValue<number>(0);
  const itemRectHeight = useSharedValue<number>(0);
  const itemScale = useSharedValue<number>(1);
  const transformValue = useSharedValue<number>(0);

  const transformOrigin = useSharedValue<TransformOriginAnchorPosition>(
    menuAnchorPosition || 'top-right'
  );
  const didMeasureLayout = useSharedValue(false);
  const overlayId = useRef(getNextHoldItemId()).current;
  const clearOverlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const menuHeight = useMemo(() => {
    const itemsWithSeparator = items.filter(item => item.withSeparator);
    return calculateMenuHeight(items.length, itemsWithSeparator.length);
  }, [items]);

  const isHold = !activateOn || activateOn === 'hold';
  //#endregion

  //#region refs
  const containerRef = useAnimatedRef<Animated.View>();
  //#endregion

  const cancelPendingOverlayClear = useCallback(() => {
    if (clearOverlayTimeoutRef.current) {
      clearTimeout(clearOverlayTimeoutRef.current);
      clearOverlayTimeoutRef.current = null;
    }
  }, []);

  const scheduleOverlayClear = useCallback(() => {
    cancelPendingOverlayClear();
    clearOverlayTimeoutRef.current = setTimeout(() => {
      clearActiveOverlay(overlayId);
      clearOverlayTimeoutRef.current = null;
    }, HOLD_ITEM_TRANSFORM_DURATION);
  }, [cancelPendingOverlayClear, clearActiveOverlay, overlayId]);

  //#region functions
  const hapticResponse = () => {
    const style = !hapticFeedback ? 'Medium' : hapticFeedback;
    switch (style) {
      case 'Selection':
        Haptics.selectionAsync();
        break;
      case 'Light':
      case 'Medium':
      case 'Heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style]);
        break;
      case 'Success':
      case 'Warning':
      case 'Error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType[style]);
        break;
      default:
    }
  };
  //#endregion

  //#region worklet functions
  const activateAnimation = () => {
    'worklet';
    if (!didMeasureLayout.value) {
      const measured = measure(containerRef);
      if (measured == null) {
        return false;
      }

      itemRectY.value = measured.pageY;
      itemRectX.value = measured.pageX;
      itemRectHeight.value = measured.height;
      itemRectWidth.value = measured.width;

      if (!menuAnchorPosition) {
        const position = getTransformOrigin(
          measured.pageX,
          itemRectWidth.value,
          deviceOrientation === 'portrait' ? WINDOW_WIDTH : WINDOW_HEIGHT,
          bottom
        );
        transformOrigin.value = position;
      }

      didMeasureLayout.value = true;
    }

    return true;
  };

  const calculateTransformValue = () => {
    'worklet';

    const height =
      deviceOrientation === 'portrait' ? WINDOW_HEIGHT : WINDOW_WIDTH;

    const isAnchorPointTop = transformOrigin.value.includes('top');

    let tY = 0;
    if (!disableMove) {
      if (isAnchorPointTop) {
        const topTransform =
          itemRectY.value +
          itemRectHeight.value +
          menuHeight +
          styleGuide.spacing +
          (safeAreaInsets?.bottom || 0);

        tY = topTransform > height ? height - topTransform : 0;
      } else {
        const bottomTransform =
          itemRectY.value - menuHeight - (safeAreaInsets?.top || 0);
        tY =
          bottomTransform < 0 ? -bottomTransform + styleGuide.spacing * 2 : 0;
      }
    }
    return tY;
  };

  const setMenuProps = () => {
    'worklet';

    menuProps.value = {
      itemHeight: itemRectHeight.value,
      itemWidth: itemRectWidth.value,
      itemY: itemRectY.value,
      itemX: itemRectX.value,
      anchorPosition: transformOrigin.value,
      menuHeight: menuHeight,
      items,
      transformValue: transformValue.value,
      actionParams: actionParams || {},
    };
  };

  const scaleBack = () => {
    'worklet';
    itemScale.value = withTiming(1, {
      duration: HOLD_ITEM_TRANSFORM_DURATION / 2,
    });
  };

  const onCompletion = (isFinished?: boolean) => {
    'worklet';
    const isListValid = items && items.length > 0;
    if (isFinished && isListValid && didMeasureLayout.value) {
      activeItemId.value = overlayId;
      isActive.value = true;
      scheduleOnRN(showOverlay);
      state.value = CONTEXT_MENU_STATE.ACTIVE;
      scaleBack();
      if (hapticFeedback !== 'None') {
        scheduleOnRN(hapticResponse);
      }
    }

    isAnimationStarted.value = false;

    // TODO: Warn user if item list is empty or not given
  };

  const scaleHold = () => {
    'worklet';
    itemScale.value = withTiming(
      HOLD_ITEM_SCALE_DOWN_VALUE,
      { duration: HOLD_ITEM_SCALE_DOWN_DURATION },
      onCompletion
    );
  };

  const scaleTap = () => {
    'worklet';
    isAnimationStarted.value = true;

    itemScale.value = withSequence(
      withTiming(HOLD_ITEM_SCALE_DOWN_VALUE, {
        duration: HOLD_ITEM_SCALE_DOWN_DURATION,
      }),
      withTiming(
        1,
        {
          duration: HOLD_ITEM_TRANSFORM_DURATION / 2,
        },
        onCompletion
      )
    );
  };

  /**
   * Prevent restarting the tap/double-tap animation while it is in flight.
   */
  const canCallActivateFunctions = () => {
    'worklet';
    const willActivateWithTap =
      activateOn === 'double-tap' || activateOn === 'tap';

    return (
      (willActivateWithTap && !isAnimationStarted.value) || !willActivateWithTap
    );
  };
  //#endregion

  //#region gesture events
  const mainGesture = useMemo(() => {
    const onStart = () => {
      if (canCallActivateFunctions() && activateAnimation()) {
        transformValue.value = calculateTransformValue();
        setMenuProps();

        if (!isActive.value) {
          if (isHold) {
            scaleHold();
          } else {
            scaleTap();
          }
        }
      }
    };

    const onFinalize = () => {
      didMeasureLayout.value = false;
      if (isHold) {
        scaleBack();
      }
    };

    if (activateOn === 'double-tap') {
      return Gesture.Tap()
        .numberOfTaps(2)
        .onStart(onStart)
        .onFinalize(onFinalize);
    }

    if (activateOn === 'tap') {
      return Gesture.Tap().onStart(onStart).onFinalize(onFinalize);
    }

    return Gesture.LongPress()
      .minDuration(longPressMinDurationMs)
      .onStart(onStart)
      .onFinalize(onFinalize);
  }, [activateOn, isHold, longPressMinDurationMs]);

  const overlayGesture = useMemo(
    () =>
      Gesture.Tap().onStart(() => {
        if (closeOnTap) {
          state.value = CONTEXT_MENU_STATE.END;
        }
      }),
    [closeOnTap, state]
  );
  //#endregion

  //#region animated styles
  const animatedContainerStyle = useAnimatedStyle(() => {
    const animateOpacity = () =>
      withDelay(HOLD_ITEM_TRANSFORM_DURATION, withTiming(1, { duration: 0 }));

    return {
      opacity: isActive.value ? 0 : animateOpacity(),
      transform: [
        {
          scale: isActive.value
            ? withTiming(1, { duration: HOLD_ITEM_TRANSFORM_DURATION })
            : itemScale.value,
        },
      ],
    };
  });

  const containerStyle = useMemo(
    () => [containerStyles, animatedContainerStyle],
    [animatedContainerStyle, containerStyles]
  );

  const animatedPortalStyle = useAnimatedStyle(() => {
    const animateOpacity = () =>
      withDelay(HOLD_ITEM_TRANSFORM_DURATION, withTiming(0, { duration: 0 }));

    const tY = calculateTransformValue();
    const transformAnimation = () =>
      disableMove
        ? 0
        : isActive.value
        ? withSpring(tY, SPRING_CONFIGURATION)
        : withTiming(-0.1, { duration: HOLD_ITEM_TRANSFORM_DURATION });

    return {
      zIndex: 10,
      position: 'absolute',
      top: itemRectY.value,
      left: itemRectX.value,
      width: itemRectWidth.value,
      height: itemRectHeight.value,
      opacity: isActive.value ? 1 : animateOpacity(),
      transform: [
        {
          translateY: transformAnimation(),
        },
        {
          scale: isActive.value
            ? withTiming(1, { duration: HOLD_ITEM_TRANSFORM_DURATION })
            : itemScale.value,
        },
      ],
    };
  });

  const portalContainerStyle = useMemo(
    () => [styles.holdItem, animatedPortalStyle],
    [animatedPortalStyle]
  );
  //#endregion

  //#region overlay host
  const portalOverlay = useMemo(
    () => (
      <GestureDetector gesture={overlayGesture}>
        <Animated.View style={styles.portalOverlay} />
      </GestureDetector>
    ),
    [overlayGesture]
  );

  const overlayNode = useMemo(
    () => (
      <Animated.View key={overlayId} pointerEvents="auto" style={portalContainerStyle}>
        {portalOverlay}
        {children}
      </Animated.View>
    ),
    [children, overlayId, portalContainerStyle, portalOverlay]
  );

  const showOverlay = useCallback(() => {
    cancelPendingOverlayClear();
    setActiveOverlay({
      id: overlayId,
      node: overlayNode,
    });
  }, [cancelPendingOverlayClear, overlayId, overlayNode, setActiveOverlay]);
  //#endregion

  //#region animated effects
  useAnimatedReaction(
    () => state.value,
    currentState => {
      if (currentState === CONTEXT_MENU_STATE.END) {
        isActive.value = false;
        scheduleOnRN(scheduleOverlayClear);
      }
    },
    [scheduleOverlayClear, state]
  );

  useAnimatedReaction(
    () => activeItemId.value,
    currentActiveItemId => {
      if (currentActiveItemId !== overlayId) {
        isActive.value = false;
      }
    },
    [activeItemId, overlayId]
  );
  //#endregion

  useEffect(
    () => () => {
      cancelPendingOverlayClear();
      clearActiveOverlay(overlayId);
    },
    [cancelPendingOverlayClear, clearActiveOverlay, overlayId]
  );

  useEffect(() => {
    if (activeOverlayId === overlayId) {
      showOverlay();
    }
  }, [activeOverlayId, overlayId, showOverlay]);

  //#region render
  return (
    <GestureDetector gesture={mainGesture}>
      <Animated.View ref={containerRef} style={containerStyle}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
  //#endregion
};

const HoldItem = memo(HoldItemComponent);

export default HoldItem;

import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Components
import { BlurView } from 'expo-blur';

// Utils
import { styles } from './styles';
import {
  CONTEXT_MENU_STATE,
  HOLD_ITEM_TRANSFORM_DURATION,
  IS_IOS,
  WINDOW_HEIGHT,
} from '../../constants';
import {
  BACKDROP_LIGHT_BACKGROUND_COLOR,
  BACKDROP_DARK_BACKGROUND_COLOR,
} from './constants';
import { useInternal } from '../../hooks';

const AnimatedBlurView = IS_IOS
  ? (Animated.createAnimatedComponent(BlurView) as any)
  : Animated.View;

const BackdropComponent = () => {
  const { state, theme } = useInternal();
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .onBegin((e) => {
          startX.value = e.x;
          startY.value = e.y;
        })
        .onEnd((e) => {
          const distance = Math.hypot(
            e.x - startX.value,
            e.y - startY.value
          );
          const shouldClose = distance < 10;
          const isStateActive = state.value === CONTEXT_MENU_STATE.ACTIVE;

          if (shouldClose && isStateActive) {
            state.value = CONTEXT_MENU_STATE.END;
          }
        })
        .onFinalize((_, success) => {
          if (!success) {
            state.value = CONTEXT_MENU_STATE.END;
          }
        }),
    [startX, startY, state]
  );

  const animatedContainerStyle = useAnimatedStyle(() => {
    const topValueAnimation = () =>
      state.value === CONTEXT_MENU_STATE.ACTIVE
        ? 0
        : withDelay(
            HOLD_ITEM_TRANSFORM_DURATION,
            withTiming(WINDOW_HEIGHT, {
              duration: 0,
            })
          );

    const opacityValueAnimation = () =>
      withTiming(state.value === CONTEXT_MENU_STATE.ACTIVE ? 1 : 0, {
        duration: HOLD_ITEM_TRANSFORM_DURATION,
      });

    return {
      top: topValueAnimation(),
      opacity: opacityValueAnimation(),
    };
  });

  const animatedInnerContainerStyle = useAnimatedStyle(() => {
    const backgroundColor =
      theme.value === 'light'
        ? BACKDROP_LIGHT_BACKGROUND_COLOR
        : BACKDROP_DARK_BACKGROUND_COLOR;

    return { backgroundColor };
  }, [theme]);

  return (
    <GestureDetector gesture={tapGesture}>
      <AnimatedBlurView
        {...(IS_IOS
          ? {
              tint: 'default',
              intensity: 100,
            }
          : {})}
        style={[styles.container, animatedContainerStyle]}
      >
        <Animated.View
          style={[
            { ...StyleSheet.absoluteFillObject },
            animatedInnerContainerStyle,
          ]}
        />
      </AnimatedBlurView>
    </GestureDetector>
  );
};

const Backdrop = memo(BackdropComponent);

export default Backdrop;

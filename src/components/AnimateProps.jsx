/* @flow */

import React from 'react';
import shallowElementEquals from 'shallow-element-equals';

type AnimationConfig = {
  duration: number,
  interpolator: (t: number) => any
}

export class Animation {
  configs: {
    [key: string]: AnimationConfig
  };
  cancelled: boolean;

  constructor () {
    this.configs = {};
    this.cancelled = false;
  }

  animateProperty (prop: string, config: AnimationConfig) {
    this.configs[prop] = config;
    return this;
  }

  begin (
    onFrame: ({[key: string]: any}, () => any) => any,
    onComplete: () => any
  ) {
    const startTime = window.performance.now();
    const totalDuration = Object.keys(this.configs).map(k => this.configs[k]).reduce((a, e) => Math.max(a, e.duration), 0);
    const handleFrame = (time) => {
      if (this.cancelled) {
        onComplete();
        return;
      }

      const elapsedTime = (time - startTime);
      if (elapsedTime >= totalDuration) {
        onComplete();
        return;
      }

      let propValues = {};
      Object.keys(this.configs).map(k => [k, this.configs[k]]).forEach(([key, animConfig]) => {
        const position = Math.min(1.0, elapsedTime / animConfig.duration);
        const value = animConfig.interpolator(position);
        propValues[key] = value;
      });

      onFrame(propValues, () => { window.requestAnimationFrame(handleFrame); });
    };
    window.requestAnimationFrame(handleFrame);
  }

  cancel () {
    this.cancelled = true;
  }
}

type transitionType = 'change' | 'enter' | 'exit';
type mapPropsToAnimation = ({[key: string]: any}, transitionType: transitionType) => ?Animation;
type compareProps = (any, any) => boolean;

export const animate = (
  mapPropsToAnimation: mapPropsToAnimation = () => null,
  compareProps: compareProps = (a, b) => shallowElementEquals(a, b)
) => (Component: any) => class extends React.PureComponent {
  currentAnimation: ?Animation;
  state: {
    animProps: {[key: string]: any};
  };
  mounted: boolean;

  constructor (props : any) {
    super(props);
    this.currentAnimation = null;
    this.mounted = false;
    this.state = {
      animProps: {}
    };
  }

  componentDidMount () {
    this.mounted = true;
  }

  componentWillReceiveProps (nextProps: any) {
    if (this.mounted) {
      if (!compareProps(this.props, nextProps)) {
        this.animate(mapPropsToAnimation(nextProps, 'change'));
      }
    }
  }

  componentWillEnter (callback: () => any) {
    this.animate(mapPropsToAnimation(this.props, 'enter'), callback);
  }

  componentWillAppear (callback: () => any) {
    this.animate(mapPropsToAnimation(this.props, 'enter'), callback);
  }

  componentWillLeave (callback: () => any) {
    this.animate(mapPropsToAnimation(this.props, 'exit'), callback);
  }

  componentWillUnmount () {
    this.cancelAnimation();
    this.mounted = false;
  }

  animate (animation: ?Animation, callback : ?(() => any)) {
    if (animation === undefined || animation === this.currentAnimation) {
      return;
    }
    this.cancelAnimation();
    if (animation) {
      this.currentAnimation = animation;
      animation.begin(
        (propValues, onDrawComplete) => {
          this.setState({animProps: propValues}, onDrawComplete);
        },
        () => {
          this.currentAnimation = null;
          this.setState({animProps: {}});
          if (callback) {
            callback();
          }
        }
      );
    }
  }

  cancelAnimation () {
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
      this.currentAnimation = null;
    }
  }

  render () {
    const effectiveProps = {...this.props};
    const { animProps } = this.state;

    for (const k of Object.keys(animProps)) {
      effectiveProps[k] = animProps[k];
    }
    return <Component {...effectiveProps} />;
  }
};

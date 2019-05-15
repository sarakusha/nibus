/*
 * @license
 * Copyright (c) 2019. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
import { TooltipProps } from '@material-ui/core/Tooltip';
import React, { ReactNode, useCallback, useMemo, useState } from 'react';
import {
  withStyles,
  createStyles,
  Theme,
  WithStyles,
  withTheme,
  WithTheme,
} from '@material-ui/core/styles';
import { hot } from 'react-hot-loader/root';
import compose from 'recompose/compose';
import 'rc-slider/assets/index.css';
import { Range as RCRange, Handle, HandleProps } from 'rc-slider';
import { Tooltip } from '@material-ui/core';
import classNames from 'classnames';

function arrowGenerator(color: string) {
  return {
    '&[x-placement*="bottom"] $arrow': {
      top: 0,
      left: 0,
      marginTop: '-0.95em',
      width: '3em',
      height: '1em',
      '&::before': {
        borderWidth: '0 1em 1em 1em',
        borderColor: `transparent transparent ${color} transparent`,
      },
    },
    '&[x-placement*="top"] $arrow': {
      bottom: 0,
      left: 0,
      marginBottom: '-0.95em',
      width: '3em',
      height: '1em',
      '&::before': {
        borderWidth: '1em 1em 0 1em',
        borderColor: `${color} transparent transparent transparent`,
      },
    },
    '&[x-placement*="right"] $arrow': {
      left: 0,
      marginTop: '0.75em',
      marginLeft: '-0.95em',
      height: '3em',
      width: '1em',
      '&::before': {
        borderWidth: '1em 1em 1em 0',
        borderColor: `transparent ${color} transparent transparent`,
      },
    },
    '&[x-placement*="left"] $arrow': {
      right: 0,
      marginTop: '0.75em',
      marginRight: '-0.95em',
      height: '3em',
      width: '1em',
      '&::before': {
        borderWidth: '1em 0 1em 1em',
        borderColor: `transparent transparent transparent ${color}`,
      },
    },
  };
}

type TooltipHandleProps = {
  value: number,
  dragging: boolean,
  index: number,
} & HandleProps;

type TooltipHandleCallback = (props: TooltipHandleProps) => ReactNode;

const styles = (theme: Theme) => createStyles({
  range: {},
  arrowPopper: arrowGenerator(theme.palette.grey[700]),
  arrow: {
    position: 'absolute',
    fontSize: 6,
    width: '3em',
    height: '3em',
    '&::before': {
      content: '""',
      margin: 'auto',
      display: 'block',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    },
  },
});

type Props = {
  min?: number,
  max?: number,
  values: [number, number],
  setMin: (value: number) => void,
  setMax: (value: number) => void,
  className?: string,
  vertical?: boolean,
  tooltipPos?: TooltipProps['placement'],
  reverse?: boolean,
};

const reverseFactory = (min: number, max: number) => (value: number) => max - value + min;

type InnerProps = Props & WithStyles<typeof styles> & WithTheme;
const Range: React.FC<InnerProps> = (props) => {
  const {
    classes, min = 0, max = 100, values, className, reverse = false,
    setMin, setMax, vertical, tooltipPos, theme,
  } = props;
  const [arrowRef, setArrowRef] = useState<HTMLSpanElement | null>(null);
  const reverseValue = reverseFactory(min, max);
  const convertedValues = reverse
    ? [reverseValue(values[1]), reverseValue(values[0])]
    : values;
  const handle = useCallback<TooltipHandleCallback>(
    ({ value, dragging, index, ...restProps }: TooltipHandleProps) => {
      return (
        <Tooltip
          title={
            <React.Fragment>
              {reverse ? reverseValue(value) : value}
              <span className={classes.arrow} ref={setArrowRef} />
            </React.Fragment>
          }
          disableFocusListener
          disableHoverListener
          disableTouchListener
          open={dragging}
          placement={tooltipPos}
          key={index}
          classes={{ popper: classes.arrowPopper }}
          PopperProps={{
            popperOptions: {
              modifiers: {
                arrow: {
                  enabled: Boolean(arrowRef),
                  element: arrowRef,
                },
              },
            },
          }}
        >
          <Handle {...restProps} />
        </Tooltip>
      );
    },
    [arrowRef, setArrowRef, classes, tooltipPos, reverse],
  );
  const handleChange = useCallback(
    ([minValue, maxValue]) => {
      if (!reverse) {
        setMin(minValue);
        setMax(maxValue);
      } else {
        setMin(reverseValue(maxValue));
        setMax(reverseValue(minValue));
      }
    },
    [setMin, setMax, reverse, max, min],
  );
  const [trackStyle, handleStyle] = useMemo<React.CSSProperties[][]>(
    () => ([
      [{ backgroundColor: theme.palette.primary.light }],
      [
        {
          borderColor: theme.palette.primary.light,
          // boxShadow: `0 0 0 5px ${theme.palette.primary.light}`,
        },
        { borderColor: theme.palette.primary.light },
      ],
    ]),
    [theme],
  );
  return (
    <RCRange
      min={min}
      max={max}
      value={convertedValues}
      className={classNames(className, classes.range)}
      onChange={handleChange}
      handle={handle}
      vertical={vertical}
      trackStyle={trackStyle}
      handleStyle={handleStyle}
    />
  );
};

export default compose<InnerProps, Props>(
  hot,
  React.memo,
  withTheme(),
  withStyles(styles),
)(Range);
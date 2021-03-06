/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import Backdrop from '@material-ui/core/Backdrop';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import LinearProgress from '@material-ui/core/LinearProgress';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import { makeStyles } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import ReplayIcon from '@material-ui/icons/Replay';
import { Flasher, FlashKinds, Kind, KindMap } from '@nibus/core';
import { SnackbarAction, useSnackbar } from 'notistack';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useDevice } from '../providers/DevicesStateProvider';
// import { useFlashState, useGlobalFlashState } from '../providers/FlashStateProvider';
import CircularProgressWithLabel from './CircularProgressWithLabel';
import FlashUpgrade, { displayName, Props as FlashUpgradeProps } from './FlashUpgrade';
import FormFieldSet from './FormFieldSet';
import type { Props } from './TabContainer';

const useStyles = makeStyles(theme => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-evenly',
  },
  kinds: {
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    borderColor: 'rgba(0, 0, 0, 0.23)',
    borderWidth: 1,
    borderStyle: 'solid',
    display: 'block',
    flexDirection: 'row',
    '&:not(:last-child)': {
      marginRight: theme.spacing(2),
    },
    // width: '100%',
  },
  kind: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
  // kindsRoot: {},
  progress: {
    width: '80%',
  },
}));

const OFFSET_SUCCESS = 0x1800;

function* generateSuccessKey(maxSuccess = 3): Generator<number, number> {
  let id = 0;
  while (true) {
    yield id + OFFSET_SUCCESS;
    id = (id + 1) % maxSuccess;
  }
}

const successId = generateSuccessKey();

const FirmwareTab: React.FC<Props> = ({ id, selected }) => {
  const classes = useStyles();
  const { closeSnackbar, enqueueSnackbar } = useSnackbar();
  const { device } = useDevice(id);
  const [progress, setProgress] = useState(0);
  const [flashing, setFleshing] = useState(false);
  const snacksRef = useRef<number[]>([]);
  const [kind, setKind] = useState<Kind>('fpga');
  useEffect(() => {
    return () => snacksRef.current.forEach(closeSnackbar);
  }, [closeSnackbar, kind]);
  // const [, dispatch] = useGlobalFlashState();
  const flashHandler = useCallback<FlashUpgradeProps['onFlash']>(
    (currentKind, filename, moduleSelect) => {
      if (!device) return;
      snacksRef.current.forEach(closeSnackbar);
      snacksRef.current = [];
      setProgress(0);
      const flasher = new Flasher(device);
      const { total } = flasher.flash(currentKind, filename, moduleSelect);
      setFleshing(true);
      let current = 0;
      const normalize = (value: number): number => (value * 100) / total;
      flasher.once('finish', () => {
        flasher.removeAllListeners();
        setFleshing(false);
        setProgress(0);
      });
      flasher.on('tick', length => {
        current += length;
        setProgress(normalize(current));
      });
      const action: SnackbarAction = key => (
        <>
          <Button title="Повторить">
            <ReplayIcon
              onClick={() => {
                flashHandler(currentKind, filename, key as number);
                // setKind(currentKind);
                // row !== undefined && dispatch({ kind: currentKind, type: 'row', payload: row });
                // column !== undefined &&
                //   dispatch({ kind: currentKind, type: 'column', payload: column });
                // filename !== undefined &&
                //   dispatch({ kind: currentKind, type: 'file', payload: filename });
                // closeSnackbar(key);
              }}
            />
          </Button>
          <Button title="Закрыть">
            <CloseIcon onClick={() => closeSnackbar(key)} />
          </Button>
        </>
      );
      flasher.on('module', ({ x, y, msg, moduleSelect: ms }) => {
        let key = ms;
        if (!msg) {
          key = successId.next().value;
          enqueueSnackbar(`Модуль ${x},${y}: Ok`, {
            key,
            variant: 'success',
          });
        } else {
          enqueueSnackbar(msg, { key, persist: true, variant: 'error', action });
        }
        snacksRef.current.push(key);
      });
    },
    [device, closeSnackbar, enqueueSnackbar]
  );
  const kindHandler = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    e => setKind(e.target.value as Kind),
    []
  );
  // const [, isModule, legacy] = KindMap[kind];
  return (
    <Box display={selected ? 'block' : 'none'} width={1} p={1}>
      <RadioGroup row aria-label="firmware kind" value={kind} onChange={kindHandler}>
        {[false, true].map(isModule => (
          <FormFieldSet
            legend={isModule ? 'Модуль' : 'Хост'}
            // helper={`Для ${isModule ? 'модулей' : 'процессора'}${legacy ? ' (устаревшая)' : ''}`}
            className={classes.kinds}
          >
            {Object.entries(KindMap)
              .filter(([, [, module]]) => isModule === module)
              .map(([value]) => (
                // <label key={value}>{value}</label>
                <FormControlLabel
                  key={value}
                  value={value}
                  control={<Radio />}
                  label={displayName(value)}
                  labelPlacement="top"
                  className={classes.kind}
                />
              ))}
          </FormFieldSet>
        ))}
      </RadioGroup>
      {FlashKinds.map(value => (
        <FlashUpgrade key={value} kind={value} onFlash={flashHandler} hidden={value !== kind} />
      ))}
      <Backdrop open={flashing} className={classes.backdrop}>
        <CircularProgressWithLabel color="inherit" value={progress} />
        <LinearProgress variant="determinate" value={progress} className={classes.progress} />
      </Backdrop>
    </Box>
  );
};

export default memo(FirmwareTab);

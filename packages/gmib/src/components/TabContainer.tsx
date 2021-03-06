/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import classNames from 'classnames';

const useStyles = makeStyles({
  root: {
    width: '100%',
    display: 'flex',
  },
  hidden: {
    display: 'none',
  },
});

export type Props = {
  id: string;
  selected?: boolean;
};

const TabContainer: React.FC<Props> = ({ children, selected = true }) => {
  const classes = useStyles();
  return (
    <div className={classNames(classes.root, { [classes.hidden]: !selected })}>{children}</div>
  );
};

export default TabContainer;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import { TimelineTabs } from '../../../../common/types/timeline';
import { TimelineStatus } from '../../../../common/api/timeline';
import { timelineSelectors } from '../../store/timeline';

export const getTimelineShowStatusByIdSelector = () =>
  createSelector(timelineSelectors.selectTimeline, (timeline) => ({
    activeTab: timeline?.activeTab ?? TimelineTabs.query,
    status: timeline?.status ?? TimelineStatus.draft,
    show: timeline?.show ?? false,
    updated: timeline?.updated ?? undefined,
  }));

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ScopedHistory } from '@kbn/core/public';

interface IndexTableProps {
  history: ScopedHistory;
  openDetailPanel?: (indexName: string) => void;
}

export declare const IndexTable: React.FunctionComponent<IndexTableProps>;

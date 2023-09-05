/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import { useColumns } from '@kbn/unified-data-table';
import { type DataView } from '@kbn/data-views-plugin/common';
import { UnifiedDataTable, DataLoadingState } from '@kbn/unified-data-table';
import { CellActionsProvider } from '@kbn/cell-actions';
import { SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { useKibana } from '../common/hooks/use_kibana';

export interface CloudSecurityDefaultColumn {
  id: string;
  displayName: string;
  cellRenderer?(rows: DataTableRecord[], rowIndex: number): React.Component;
}

interface CloudSecurityDataGridProps {
  dataView: DataView;
  isLoading: boolean;
  defaultColumns: CloudSecurityDefaultColumn[];
  sort: SortOrder[];
  rows: DataTableRecord[];
  pageSize: number;
  totalHits: number;
  sampleSize: number;
  selectedRowIndex?: number;
}

export const CloudSecurityDataGrid = ({
  dataView,
  isLoading,
  defaultColumns,
  sort,
  rows,
  pageSize,
  totalHits,
  sampleSize,
  selectedRowIndex = -1,
}: CloudSecurityDataGridProps) => {
  // current set/order of columns (TODO: persist)
  const [columns, setColumns] = useState(defaultColumns.map((c) => c.id));

  // to allow for quick access to default column configurations
  const defaultColumnsMap = useMemo(() => {
    const m: { [key: string]: CloudSecurityDefaultColumn } = {};
    defaultColumns.reduce((prev, cur) => {
      prev[cur.id] = cur;

      return prev;
    }, m);

    return m;
  }, [defaultColumns]);

  // services needed for unified-data-table package
  const {
    uiSettings,
    uiActions,
    dataViews,
    data,
    application,
    theme,
    fieldFormats,
    dataViewFieldEditor,
    toastNotifications,
    storage,
  } = useKibana().services;
  const { capabilities } = application;
  const { filterManager } = data.query;
  const services = {
    theme,
    fieldFormats,
    uiSettings,
    dataViewFieldEditor,
    toastNotifications,
    storage,
    data,
  };

  const useNewFieldsApi = true;
  const expandedDoc = rows[selectedRowIndex];

  const {
    columns: currentColumns,
    onAddColumn,
    onRemoveColumn,
    onMoveColumn,
    onSetColumns,
  } = useColumns({
    capabilities,
    defaultOrder: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    dataView,
    dataViews,
    setAppState: (props) => console.log('setting app state', props),
    useNewFieldsApi,
    columns,
    sort,
  });

  const ariaLabelledBy = 'bla'; // TODO

  return (
    <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
      <UnifiedDataTable
        ariaLabelledBy={ariaLabelledBy}
        columns={currentColumns}
        expandedDoc={expandedDoc}
        dataView={dataView}
        loadingState={isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
        onFilter={() => console.log('add filter')}
        onResize={(colSettings: { columnId: string; width: number }) => console.log(colSettings)}
        onSetColumns={(newColumns: string[], hideTimeColumn: boolean) => console.log(newColumns)}
        onSort={(newSort: string[][]) => console.log(newSort)}
        rows={rows}
        sampleSize={sampleSize}
        setExpandedDoc={(doc?: DataTableRecord) => console.log(doc)}
        sort={sort}
        rowsPerPageState={pageSize}
        totalHits={totalHits}
        services={services}
        useNewFieldsApi
        onUpdateRowsPerPage={(rowHeight: number) => {
          // Do the state update with the new number of the rows per page
        }}
        showTimeCol={false}
      />
    </CellActionsProvider>
  );
};

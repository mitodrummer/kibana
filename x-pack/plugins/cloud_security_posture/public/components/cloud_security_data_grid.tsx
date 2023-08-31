/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
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
  pageIndex: number;
  pageSize: number;
  totalHits: number;
  selectedRowIndex?: number;
}

export const CloudSecurityDataGrid = ({
  dataView,
  isLoading,
  defaultColumns,
  sort,
  rows,
  pageIndex,
  pageSize,
  totalItems,
  selectedRowIndex = -1,
}: CloudSecurityDataGridProps) => {
  const [columns, setColumns] = useState(defaultColumns.map((c) => c.id));

  // services needed for unified-data-table package
  const {
    uiSettings,
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
    setAppState: () => console.log('setting app state'),
    useNewFieldsApi,
    columns,
    sort,
  });

  const ariaLabelledBy = 'bla'; // TODO

  return (
    <CellActionsProvider getTriggerCompatibleActions={() => Promise.resolve([])}>
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
        sampleSize={10000}
        setExpandedDoc={(doc?: DataTableRecord) => console.log(doc)}
        sort={sort}
        rowsPerPageState={pageSize}
        totalHits={totalHits}
        services={services}
        showTimeCol
        useNewFieldsApi
      />
    </CellActionsProvider>
  );
};

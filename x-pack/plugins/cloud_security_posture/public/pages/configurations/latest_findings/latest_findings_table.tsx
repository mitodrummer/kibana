/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import {
  useEuiTheme,
  type Pagination,
  type EuiBasicTableProps,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { type DataView } from '@kbn/data-views-plugin/common';
import { SEARCH_FIELDS_FROM_SOURCE, SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import { UnifiedDataTable, useColumns } from '@kbn/unified-data-table';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import * as TEST_SUBJECTS from '../test_subjects';
import { FindingsRuleFlyout } from '../findings_flyout/findings_flyout';
import {
  baseFindingsColumns,
  createColumnWithFilters,
  getExpandColumn,
  type OnAddFilter,
} from '../layout/findings_layout';
import { getSelectedRowStyle } from '../utils/utils';
import { EmptyState } from '../../../components/empty_state';

const ARIA_LABEL_MISCONFIGURATIONS = 'cloud_security_posture.misconfigurations';

type TableProps = Required<EuiBasicTableProps<CspFinding>>;

interface Props {
  columns: string[];
  loading: boolean;
  items: CspFinding[];
  pagination: Pagination & { pageSize: number };
  sorting: TableProps['sorting'];
  setTableOptions(options: CriteriaWithPagination<CspFinding>): void;
  onAddFilter: OnAddFilter;
  onPaginateFlyout: (pageIndex: number) => void;
  onCloseFlyout: () => void;
  onOpenFlyout: (finding: CspFinding) => void;
  flyoutFindingIndex: number;
  onResetFilters: () => void;
}

const FindingsTableComponent = ({
  columns,
  loading,
  items,
  pagination,
  sorting,
  setTableOptions,
  onAddFilter,
  onOpenFlyout,
  flyoutFindingIndex,
  onPaginateFlyout,
  onCloseFlyout,
  onResetFilters,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  /*
  const columns: [
    EuiTableActionsColumnType<CspFinding>,
    ...Array<EuiTableFieldDataColumnType<CspFinding>>
  ] = useMemo(
    () => [
      getExpandColumn<CspFinding>({ onClick: onOpenFlyout }),
      createColumnWithFilters(baseFindingsColumns['result.evaluation'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['resource.id'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['resource.name'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['resource.sub_type'], { onAddFilter }),
      baseFindingsColumns['rule.benchmark.rule_number'],
      createColumnWithFilters(baseFindingsColumns['rule.name'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['rule.section'], { onAddFilter }),
      baseFindingsColumns['@timestamp'],
    ],
    [onOpenFlyout, onAddFilter]
  );*/

  const selectedFinding = items[flyoutFindingIndex];

  /* const getRowProps = (row: CspFinding) => ({
    'data-test-subj': TEST_SUBJECTS.getFindingsTableRowTestId(row.resource.id),
    style: getSelectedRowStyle(euiTheme, row, selectedFinding),
  });

  const getCellProps = (row: CspFinding, column: EuiTableFieldDataColumnType<CspFinding>) => ({
    'data-test-subj': TEST_SUBJECTS.getFindingsTableCellTestId(column.field, row.resource.id),
  });*/

  if (!loading && !items.length) {
    return <EmptyState onResetFilters={onResetFilters} />;
  }

  return (
    <>
      <UnifiedDataTable
        loading={loading}
        ariaLabelledBy={ARIA_LABEL_MISCONFIGURATIONS}
        columns={columns}
        expandedDoc={selectedFinding as DataTableRecord}
        dataView={dataView}
      />

      {/*
    <UnifiedDataTable
      ariaLabelledBy="timelineDocumentsAriaLabel"
      className={'unifiedDataTableTimeline'}
      columns={['event.category', 'event.action', 'host.name', 'user.name']}
      expandedDoc={expandedDoc as DataTableRecord}
      dataView={dataView}
      loadingState={isQueryLoading ? DataLoadingState.loading : DataLoadingState.loaded}
      onFilter={() => {
        // Add logic to refetch the data when the filter by field was added/removed. Refetch data.
      }}
      onResize={(colSettings: { columnId: string; width: number }) => {
        // Update the table state with the new width for the column
      }}
      onSetColumns={(columns: string[], hideTimeColumn: boolean) => {
        // Update table state with the new columns. Refetch data.
      }}
      onSort={!isTextBasedQuery ? onSort : undefined
        // Update table state with the new sorting settings. Refetch data.
      }
      rows={searchResultRows}
      sampleSize={500}
      setExpandedDoc={() => {
        // Callback function to do the logic when the document is expanded
      }}
      settings={tableSettings}
      showTimeCol={true}
      isSortEnabled={true}
      sort={sortingColumns}
      rowHeightState={3}
      onUpdateRowHeight={(rowHeight: number) => {
        // Do the state update with the new setting of the row height
      }}
      isPlainRecord={isTextBasedQuery}
      rowsPerPageState={50}
      onUpdateRowsPerPage={(rowHeight: number) => {
        // Do the state update with the new number of the rows per page
      }
      onFieldEdited={() =>
        // Callback to execute on edit runtime field. Refetch data.
      }
      cellActionsTriggerId={SecurityCellActionsTrigger.DEFAULT}
      services={{
        theme,
        fieldFormats,
        storage,
        toastNotifications: toastsService,
        uiSettings,
        dataViewFieldEditor,
        data: dataPluginContract,
      }}
      visibleCellActions={3}
      externalCustomRenderers={{
        // Set the record style definition for the specific fields rendering Record<string,(props: EuiDataGridCellValueElementProps) => React.ReactNode>
      }}
      renderDocumentView={() =>
        // Implement similar callback to render the Document flyout
          const renderDetailsPanel = useCallback(
                () => (
                <DetailsPanel
                    browserFields={browserFields}
                    handleOnPanelClosed={handleOnPanelClosed}
                    runtimeMappings={runtimeMappings}
                    tabType={TimelineTabs.query}
                    scopeId={timelineId}
                    isFlyoutView
                />
                ),
                [browserFields, handleOnPanelClosed, runtimeMappings, timelineId]
            );
      }
      externalControlColumns={leadingControlColumns}
      externalAdditionalControls={additionalControls}
      trailingControlColumns={trailingControlColumns}
      renderCustomGridBody={renderCustomGridBody}
      rowsPerPageOptions={[10, 30, 40, 100]}
      showFullScreenButton={false}
      useNewFieldsApi={true}
      maxDocFieldsDisplayed={50}
      consumer="timeline"
      totalHits={
        // total number of the documents in the search query result. For example: 1200
      }
      onFetchMoreRecords={() => {
        // Do some data fetch to get more data
      }}
      configRowHeight={3}
      showMultiFields={true}
    />
*/

      {/* <EuiBasicTable
        loading={loading}
        data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_TABLE}
        items={items}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        onChange={setTableOptions}
        rowProps={getRowProps}
        cellProps={getCellProps}
        hasActions
      />*/}
      {selectedFinding && (
        <FindingsRuleFlyout
          findings={selectedFinding}
          onClose={onCloseFlyout}
          findingsCount={pagination.totalItemCount}
          flyoutIndex={flyoutFindingIndex + pagination.pageIndex * pagination.pageSize}
          onPaginate={onPaginateFlyout}
        />
      )}
    </>
  );
};

export const FindingsTable = React.memo(FindingsTableComponent);

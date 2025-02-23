/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { CustomizationCallback, DiscoverStateContainer } from '@kbn/discover-plugin/public';
import React from 'react';
import { type BehaviorSubject, combineLatest, from, map, Subscription } from 'rxjs';
import { dynamic } from '../utils/dynamic';
import { LogExplorerProfileStateService } from '../state_machines/log_explorer_profile';
import { LogExplorerStateContainer } from '../components/log_explorer';

const LazyCustomDatasetSelector = dynamic(() => import('./custom_dataset_selector'));
const LazyCustomDatasetFilters = dynamic(() => import('./custom_dataset_filters'));

export interface CreateLogExplorerProfileCustomizationsDeps {
  core: CoreStart;
  data: DataPublicPluginStart;
  state$?: BehaviorSubject<LogExplorerStateContainer>;
}

export const createLogExplorerProfileCustomizations =
  ({ core, data, state$ }: CreateLogExplorerProfileCustomizationsDeps): CustomizationCallback =>
  async ({ customizations, stateContainer }) => {
    // Lazy load dependencies
    const datasetServiceModuleLoadable = import('../services/datasets');
    const logExplorerMachineModuleLoadable = import('../state_machines/log_explorer_profile');

    const [{ DatasetsService }, { initializeLogExplorerProfileStateService, waitForState }] =
      await Promise.all([datasetServiceModuleLoadable, logExplorerMachineModuleLoadable]);

    const datasetsClient = new DatasetsService().start({
      http: core.http,
    }).client;

    const logExplorerProfileStateService = initializeLogExplorerProfileStateService({
      datasetsClient,
      stateContainer,
      toasts: core.notifications.toasts,
    });

    /**
     * Wait for the machine to be fully initialized to set the restored selection
     * create the DataView and set it in the stateContainer from Discover
     */
    await waitForState(logExplorerProfileStateService, 'initialized');

    /**
     * Subscribe the state$ BehaviorSubject when the consumer app wants to react to state changes.
     * It emits a combined state of:
     * - log explorer state machine context
     * - appState from the discover stateContainer
     */
    let stateSubscription: Subscription;
    if (state$) {
      stateSubscription = createStateUpdater({
        logExplorerProfileStateService,
        stateContainer,
      }).subscribe(state$);
    }

    /**
     * Replace the DataViewPicker with a custom `DatasetSelector` to pick integrations streams
     * Prepend the search bar with custom filter control groups depending on the selected dataset
     */
    customizations.set({
      id: 'search_bar',
      CustomDataViewPicker: () => (
        <LazyCustomDatasetSelector
          datasetsClient={datasetsClient}
          logExplorerProfileStateService={logExplorerProfileStateService}
        />
      ),
      PrependFilterBar: () => (
        <LazyCustomDatasetFilters
          logExplorerProfileStateService={logExplorerProfileStateService}
          data={data}
        />
      ),
    });

    /**
     * Hide New, Open and Save settings to prevent working with saved views.
     */
    customizations.set({
      id: 'top_nav',
      defaultMenu: {
        newItem: { disabled: true },
        openItem: { disabled: true },
        saveItem: { disabled: true },
      },
    });

    return () => {
      if (stateSubscription) {
        stateSubscription.unsubscribe();
      }
    };
  };

const createStateUpdater = ({
  logExplorerProfileStateService,
  stateContainer,
}: {
  logExplorerProfileStateService: LogExplorerProfileStateService;
  stateContainer: DiscoverStateContainer;
}) => {
  return combineLatest([from(logExplorerProfileStateService), stateContainer.appState.state$]).pipe(
    map(([logExplorerState, appState]) => ({
      logExplorerState: logExplorerState.context,
      appState,
    }))
  );
};

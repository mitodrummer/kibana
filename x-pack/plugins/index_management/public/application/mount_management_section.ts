/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import SemVer from 'semver/classes/semver';
import { CoreSetup, CoreStart } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

import { CloudSetup } from '@kbn/cloud-plugin/public';
import { UIM_APP_NAME } from '../../common/constants';
import { PLUGIN } from '../../common/constants/plugin';
import { ExtensionsService } from '../services';
import { StartDependencies } from '../types';
import { AppDependencies } from './app_context';
import { breadcrumbService } from './services/breadcrumbs';
import { documentationService } from './services/documentation';
import { UiMetricService } from './services';

import { renderApp } from '.';
import { setUiMetricService } from './services/api';
import { notificationService } from './services/notification';
import { httpService } from './services/http';

function initSetup({
  usageCollection,
  core,
}: {
  core: CoreStart;
  usageCollection: UsageCollectionSetup;
}) {
  const { http, notifications } = core;

  httpService.setup(http);
  notificationService.setup(notifications);

  const uiMetricService = new UiMetricService(UIM_APP_NAME);

  setUiMetricService(uiMetricService);

  uiMetricService.setup(usageCollection);

  return { uiMetricService };
}

export async function mountManagementSection({
  coreSetup,
  usageCollection,
  params,
  extensionsService,
  isFleetEnabled,
  kibanaVersion,
  enableIndexActions = true,
  enableLegacyTemplates = true,
  enableIndexDetailsPage = false,
  enableIndexStats = true,
  cloud,
}: {
  coreSetup: CoreSetup<StartDependencies>;
  usageCollection: UsageCollectionSetup;
  params: ManagementAppMountParams;
  extensionsService: ExtensionsService;
  isFleetEnabled: boolean;
  kibanaVersion: SemVer;
  enableIndexActions?: boolean;
  enableLegacyTemplates?: boolean;
  enableIndexDetailsPage?: boolean;
  enableIndexStats?: boolean;
  cloud?: CloudSetup;
}) {
  const { element, setBreadcrumbs, history, theme$ } = params;
  const [core, startDependencies] = await coreSetup.getStartServices();
  const {
    docLinks,
    fatalErrors,
    application,
    chrome: { docTitle },
    uiSettings,
    executionContext,
    settings,
    http,
  } = core;

  const { url } = startDependencies.share;
  docTitle.change(PLUGIN.getI18nName(i18n));

  breadcrumbService.setup(setBreadcrumbs);
  documentationService.setup(docLinks);

  const { uiMetricService } = initSetup({
    usageCollection,
    core,
  });

  const appDependencies: AppDependencies = {
    core: {
      fatalErrors,
      getUrlForApp: application.getUrlForApp,
      executionContext,
      application,
      http,
    },
    plugins: {
      usageCollection,
      isFleetEnabled,
      share: startDependencies.share,
      cloud,
    },
    services: {
      httpService,
      notificationService,
      uiMetricService,
      extensionsService,
    },
    config: {
      enableIndexActions,
      enableLegacyTemplates,
      enableIndexDetailsPage,
      enableIndexStats,
    },
    history,
    setBreadcrumbs,
    uiSettings,
    settings,
    url,
    docLinks,
    kibanaVersion,
    theme$,
  };

  const unmountAppCallback = renderApp(element, { core, dependencies: appDependencies });

  return () => {
    docTitle.reset();
    unmountAppCallback();
  };
}

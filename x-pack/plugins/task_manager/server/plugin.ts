/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, Observable, Subject } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  Logger,
  CoreStart,
  ServiceStatusLevels,
  CoreStatus,
} from '@kbn/core/server';
import { TaskPollingLifecycle } from './polling_lifecycle';
import { TaskManagerConfig } from './config';
import { createInitialMiddleware, addMiddlewareToChain, Middleware } from './lib/middleware';
import { removeIfExists } from './lib/remove_if_exists';
import { setupSavedObjects } from './saved_objects';
import { TaskDefinitionRegistry, TaskTypeDictionary, REMOVED_TYPES } from './task_type_dictionary';
import { AggregationOpts, FetchResult, SearchOpts, TaskStore } from './task_store';
import { createManagedConfiguration } from './lib/create_managed_configuration';
import { TaskScheduling } from './task_scheduling';
import { backgroundTaskUtilizationRoute, healthRoute, metricsRoute } from './routes';
import { createMonitoringStats, MonitoringStats } from './monitoring';
import { EphemeralTaskLifecycle } from './ephemeral_task_lifecycle';
import { EphemeralTask, ConcreteTaskInstance } from './task';
import { registerTaskManagerUsageCollector } from './usage';
import { TASK_MANAGER_INDEX } from './constants';
import { AdHocTaskCounter } from './lib/adhoc_task_counter';
import { setupIntervalLogging } from './lib/log_health_metrics';
import { metricsStream, Metrics } from './metrics';
import { TaskManagerMetricsCollector } from './metrics/task_metrics_collector';

export interface TaskManagerSetupContract {
  /**
   * @deprecated
   */
  index: string;
  addMiddleware: (middleware: Middleware) => void;
  /**
   * Method for allowing consumers to register task definitions into the system.
   * @param taskDefinitions - The Kibana task definitions dictionary
   */
  registerTaskDefinitions: (taskDefinitions: TaskDefinitionRegistry) => void;
}

export type TaskManagerStartContract = Pick<
  TaskScheduling,
  | 'schedule'
  | 'runSoon'
  | 'ephemeralRunNow'
  | 'ensureScheduled'
  | 'bulkUpdateSchedules'
  | 'bulkEnable'
  | 'bulkDisable'
  | 'bulkSchedule'
> &
  Pick<TaskStore, 'fetch' | 'aggregate' | 'get' | 'remove' | 'bulkRemove'> & {
    removeIfExists: TaskStore['remove'];
  } & {
    supportsEphemeralTasks: () => boolean;
    getRegisteredTypes: () => string[];
  };

const LogHealthForBackgroundTasksOnlyMinutes = 60;

export class TaskManagerPlugin
  implements Plugin<TaskManagerSetupContract, TaskManagerStartContract>
{
  private taskPollingLifecycle?: TaskPollingLifecycle;
  private ephemeralTaskLifecycle?: EphemeralTaskLifecycle;
  private taskManagerId?: string;
  private usageCounter?: UsageCounter;
  private config: TaskManagerConfig;
  private logger: Logger;
  private definitions: TaskTypeDictionary;
  private middleware: Middleware = createInitialMiddleware();
  private elasticsearchAndSOAvailability$?: Observable<boolean>;
  private monitoringStats$ = new Subject<MonitoringStats>();
  private metrics$ = new Subject<Metrics>();
  private resetMetrics$ = new Subject<boolean>();
  private shouldRunBackgroundTasks: boolean;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private adHocTaskCounter: AdHocTaskCounter;
  private taskManagerMetricsCollector?: TaskManagerMetricsCollector;
  private nodeRoles: PluginInitializerContext['node']['roles'];

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
    this.config = initContext.config.get<TaskManagerConfig>();
    this.definitions = new TaskTypeDictionary(this.logger);
    this.kibanaVersion = initContext.env.packageInfo.version;
    this.nodeRoles = initContext.node.roles;
    this.shouldRunBackgroundTasks = this.nodeRoles.backgroundTasks;
    this.adHocTaskCounter = new AdHocTaskCounter();
  }

  isNodeBackgroundTasksOnly() {
    const { backgroundTasks, migrator, ui } = this.nodeRoles;
    return backgroundTasks && !migrator && !ui;
  }

  public setup(
    core: CoreSetup,
    plugins: { usageCollection?: UsageCollectionSetup }
  ): TaskManagerSetupContract {
    this.elasticsearchAndSOAvailability$ = getElasticsearchAndSOAvailability(core.status.core$);

    setupSavedObjects(core.savedObjects, this.config);
    this.taskManagerId = this.initContext.env.instanceUuid;

    if (!this.taskManagerId) {
      this.logger.error(
        `TaskManager is unable to start as there the Kibana UUID is invalid (value of the "server.uuid" configuration is ${this.taskManagerId})`
      );
      throw new Error(`TaskManager is unable to start as Kibana has no valid UUID assigned to it.`);
    } else {
      this.logger.info(`TaskManager is identified by the Kibana UUID: ${this.taskManagerId}`);
    }

    const startServicesPromise = core.getStartServices().then(([coreServices]) => ({
      elasticsearch: coreServices.elasticsearch,
    }));

    this.usageCounter = plugins.usageCollection?.createUsageCounter(`taskManager`);

    // Routes
    const router = core.http.createRouter();
    const { serviceStatus$, monitoredHealth$ } = healthRoute({
      router,
      monitoringStats$: this.monitoringStats$,
      logger: this.logger,
      taskManagerId: this.taskManagerId,
      config: this.config!,
      usageCounter: this.usageCounter!,
      kibanaVersion: this.kibanaVersion,
      kibanaIndexName: core.savedObjects.getDefaultIndex(),
      getClusterClient: () =>
        startServicesPromise.then(({ elasticsearch }) => elasticsearch.client),
      shouldRunTasks: this.shouldRunBackgroundTasks,
      docLinks: core.docLinks,
    });
    const monitoredUtilization$ = backgroundTaskUtilizationRoute({
      router,
      monitoringStats$: this.monitoringStats$,
      logger: this.logger,
      taskManagerId: this.taskManagerId,
      config: this.config!,
      usageCounter: this.usageCounter!,
      kibanaVersion: this.kibanaVersion,
      kibanaIndexName: core.savedObjects.getDefaultIndex(),
      getClusterClient: () =>
        startServicesPromise.then(({ elasticsearch }) => elasticsearch.client),
    });
    metricsRoute({
      router,
      metrics$: this.metrics$,
      resetMetrics$: this.resetMetrics$,
      taskManagerId: this.taskManagerId,
    });

    core.status.derivedStatus$.subscribe((status) =>
      this.logger.debug(`status core.status.derivedStatus now set to ${status.level}`)
    );
    serviceStatus$.subscribe((status) =>
      this.logger.debug(`status serviceStatus now set to ${status.level}`)
    );

    // here is where the system status is updated
    core.status.set(
      combineLatest([core.status.derivedStatus$, serviceStatus$]).pipe(
        map(([derivedStatus, serviceStatus]) =>
          serviceStatus.level > derivedStatus.level ? serviceStatus : derivedStatus
        )
      )
    );

    const usageCollection = plugins.usageCollection;
    if (usageCollection) {
      registerTaskManagerUsageCollector(
        usageCollection,
        monitoredHealth$,
        monitoredUtilization$,
        this.config.ephemeral_tasks.enabled,
        this.config.ephemeral_tasks.request_capacity,
        this.config.unsafe.exclude_task_types
      );
    }

    if (this.config.unsafe.exclude_task_types.length) {
      this.logger.warn(
        `Excluding task types from execution: ${this.config.unsafe.exclude_task_types.join(', ')}`
      );
    }

    if (this.config.unsafe.authenticate_background_task_utilization === false) {
      this.logger.warn(`Disabling authentication for background task utilization API`);
    }

    // for nodes with background_tasks mode only, log health metrics every hour
    if (this.isNodeBackgroundTasksOnly()) {
      setupIntervalLogging(monitoredHealth$, this.logger, LogHealthForBackgroundTasksOnlyMinutes);
    }

    return {
      index: TASK_MANAGER_INDEX,
      addMiddleware: (middleware: Middleware) => {
        this.middleware = addMiddlewareToChain(this.middleware, middleware);
      },
      registerTaskDefinitions: (taskDefinition: TaskDefinitionRegistry) => {
        this.definitions.registerTaskDefinitions(taskDefinition);
      },
    };
  }

  public start({
    savedObjects,
    elasticsearch,
    executionContext,
    docLinks,
  }: CoreStart): TaskManagerStartContract {
    const savedObjectsRepository = savedObjects.createInternalRepository(['task']);

    const serializer = savedObjects.createSerializer();
    const taskStore = new TaskStore({
      serializer,
      savedObjectsRepository,
      esClient: elasticsearch.client.asInternalUser,
      index: TASK_MANAGER_INDEX,
      definitions: this.definitions,
      taskManagerId: `kibana:${this.taskManagerId!}`,
      adHocTaskCounter: this.adHocTaskCounter,
      allowReadingInvalidState: this.config.allow_reading_invalid_state,
      logger: this.logger,
    });

    const managedConfiguration = createManagedConfiguration({
      logger: this.logger,
      errors$: taskStore.errors$,
      startingMaxWorkers: this.config!.max_workers,
      startingPollInterval: this.config!.poll_interval,
    });

    // Only poll for tasks if configured to run tasks
    if (this.shouldRunBackgroundTasks) {
      this.taskManagerMetricsCollector = new TaskManagerMetricsCollector({
        logger: this.logger,
        store: taskStore,
      });
      this.taskPollingLifecycle = new TaskPollingLifecycle({
        config: this.config!,
        definitions: this.definitions,
        unusedTypes: REMOVED_TYPES,
        logger: this.logger,
        executionContext,
        taskStore,
        usageCounter: this.usageCounter,
        middleware: this.middleware,
        elasticsearchAndSOAvailability$: this.elasticsearchAndSOAvailability$!,
        ...managedConfiguration,
      });

      this.ephemeralTaskLifecycle = new EphemeralTaskLifecycle({
        config: this.config!,
        definitions: this.definitions,
        logger: this.logger,
        executionContext,
        middleware: this.middleware,
        elasticsearchAndSOAvailability$: this.elasticsearchAndSOAvailability$!,
        pool: this.taskPollingLifecycle.pool,
        lifecycleEvent: this.taskPollingLifecycle.events,
      });
    }

    createMonitoringStats(
      taskStore,
      this.elasticsearchAndSOAvailability$!,
      this.config!,
      managedConfiguration,
      this.logger,
      this.adHocTaskCounter,
      this.taskPollingLifecycle,
      this.ephemeralTaskLifecycle
    ).subscribe((stat) => this.monitoringStats$.next(stat));

    metricsStream({
      config: this.config!,
      reset$: this.resetMetrics$,
      taskPollingLifecycle: this.taskPollingLifecycle,
      taskManagerMetricsCollector: this.taskManagerMetricsCollector,
    }).subscribe((metric) => this.metrics$.next(metric));

    const taskScheduling = new TaskScheduling({
      logger: this.logger,
      taskStore,
      middleware: this.middleware,
      ephemeralTaskLifecycle: this.ephemeralTaskLifecycle,
      taskManagerId: taskStore.taskManagerId,
    });

    return {
      fetch: (opts: SearchOpts): Promise<FetchResult> => taskStore.fetch(opts),
      aggregate: (opts: AggregationOpts): Promise<estypes.SearchResponse<ConcreteTaskInstance>> =>
        taskStore.aggregate(opts),
      get: (id: string) => taskStore.get(id),
      remove: (id: string) => taskStore.remove(id),
      bulkRemove: (ids: string[]) => taskStore.bulkRemove(ids),
      removeIfExists: (id: string) => removeIfExists(taskStore, id),
      schedule: (...args) => taskScheduling.schedule(...args),
      bulkSchedule: (...args) => taskScheduling.bulkSchedule(...args),
      ensureScheduled: (...args) => taskScheduling.ensureScheduled(...args),
      runSoon: (...args) => taskScheduling.runSoon(...args),
      bulkEnable: (...args) => taskScheduling.bulkEnable(...args),
      bulkDisable: (...args) => taskScheduling.bulkDisable(...args),
      bulkUpdateSchedules: (...args) => taskScheduling.bulkUpdateSchedules(...args),
      ephemeralRunNow: (task: EphemeralTask) => taskScheduling.ephemeralRunNow(task),
      supportsEphemeralTasks: () =>
        this.config.ephemeral_tasks.enabled && this.shouldRunBackgroundTasks,
      getRegisteredTypes: () => this.definitions.getAllTypes(),
    };
  }
}

export function getElasticsearchAndSOAvailability(
  core$: Observable<CoreStatus>
): Observable<boolean> {
  return core$.pipe(
    map(
      ({ elasticsearch, savedObjects }) =>
        elasticsearch.level === ServiceStatusLevels.available &&
        savedObjects.level === ServiceStatusLevels.available
    ),
    distinctUntilChanged()
  );
}

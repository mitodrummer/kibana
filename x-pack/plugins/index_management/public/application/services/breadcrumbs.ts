/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';

type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

export enum IndexManagementBreadcrumb {
  /**
   * Enrich policies tab
   */
  enrichPolicies = 'enrichPolicies',
  enrichPoliciesCreate = 'enrichPoliciesCreate',
}

class BreadcrumbService {
  private breadcrumbs: {
    [key: string]: Array<{
      text: string;
      href?: string;
    }>;
  } = {
    home: [],
  };
  private setBreadcrumbsHandler?: SetBreadcrumbs;

  public setup(setBreadcrumbsHandler: SetBreadcrumbs): void {
    this.setBreadcrumbsHandler = setBreadcrumbsHandler;

    this.breadcrumbs.home = [
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.homeLabel', {
          defaultMessage: 'Index Management',
        }),
        href: `/`,
      },
    ];

    this.breadcrumbs.templates = [
      ...this.breadcrumbs.home,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.templatesLabel', {
          defaultMessage: 'Templates',
        }),
        href: `/templates`,
      },
    ];

    this.breadcrumbs.templateCreate = [
      ...this.breadcrumbs.templates,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.createTemplateLabel', {
          defaultMessage: 'Create template',
        }),
      },
    ];

    this.breadcrumbs.templateEdit = [
      ...this.breadcrumbs.templates,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.editTemplateLabel', {
          defaultMessage: 'Edit template',
        }),
      },
    ];

    this.breadcrumbs.templateClone = [
      ...this.breadcrumbs.templates,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.cloneTemplateLabel', {
          defaultMessage: 'Clone template',
        }),
      },
    ];

    this.breadcrumbs.enrichPolicies = [
      ...this.breadcrumbs.home,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.enrichPolicyLabel', {
          defaultMessage: 'Enrich policies',
        }),
        href: `/enrich_policies`,
      },
    ];

    this.breadcrumbs.enrichPoliciesCreate = [
      ...this.breadcrumbs.enrichPolicies,
      {
        text: i18n.translate('xpack.idxMgmt.breadcrumb.enrichPolicyCreateLabel', {
          defaultMessage: 'Create enrich policy',
        }),
        href: `/enrich_policies/create`,
      },
    ];
  }

  public setBreadcrumbs(type: string): void {
    if (!this.setBreadcrumbsHandler) {
      throw new Error(`BreadcrumbService#setup() must be called first!`);
    }

    const newBreadcrumbs = this.breadcrumbs[type]
      ? [...this.breadcrumbs[type]]
      : [...this.breadcrumbs.home];

    // Pop off last breadcrumb
    const lastBreadcrumb = newBreadcrumbs.pop() as {
      text: string;
      href?: string;
    };

    // Put last breadcrumb back without href
    newBreadcrumbs.push({
      ...lastBreadcrumb,
      href: undefined,
    });

    this.setBreadcrumbsHandler(newBreadcrumbs);
  }
}

export const breadcrumbService = new BreadcrumbService();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CyIndexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import { indexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import { loginServerless, ServerlessUser } from '../../../tasks/login_serverless';
import type { EndpointArtifactPageId } from '../../../screens';
import {
  getNoPrivilegesPage,
  getArtifactListEmptyStateAddButton,
  getEndpointManagementPageMap,
  getEndpointManagementPageList,
  ensureArtifactPageAuthzAccess,
  ensureEndpointListPageAuthzAccess,
  ensurePolicyListPageAuthzAccess,
  ensureFleetPermissionDeniedScreen,
  getFleetAgentListTable,
  visitFleetAgentList,
  ensurePolicyDetailsPageAuthzAccess,
} from '../../../screens';

describe(
  'Roles for Security Essential PLI with Endpoint Essentials addon',
  {
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
      },
    },
  },
  () => {
    const allPages = getEndpointManagementPageList();
    const pageById = getEndpointManagementPageMap();

    let loadedEndpoints: CyIndexEndpointHosts;

    before(() => {
      indexEndpointHosts().then((response) => {
        loadedEndpoints = response;
      });
    });

    after(() => {
      if (loadedEndpoints) {
        loadedEndpoints.cleanup();
      }
    });

    // roles `t1_analyst` and `t2_analyst` are the same as far as endpoint access
    (['t1_analyst', `t2_analyst`] as ServerlessUser[]).forEach((roleName) => {
      describe(`for role: ${roleName}`, () => {
        const deniedPages = allPages.filter((page) => page.id !== 'endpointList');

        beforeEach(() => {
          loginServerless(roleName);
        });

        it('should have READ access to Endpoint list page', () => {
          ensureEndpointListPageAuthzAccess('read', true);
        });

        for (const { url, title } of deniedPages) {
          it(`should NOT have access to: ${title}`, () => {
            cy.visit(url);
            getNoPrivilegesPage().should('exist');
          });
        }

        it('should NOT have access to Fleet', () => {
          visitFleetAgentList();
          ensureFleetPermissionDeniedScreen();
        });
      });
    });

    describe('for role: t3_analyst', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.eventFilters,
        pageById.blocklist,
      ];

      beforeEach(() => {
        loginServerless(ServerlessUser.T3_ANALYST);
      });

      it('should have access to Endpoint list page', () => {
        ensureEndpointListPageAuthzAccess('all', true);
      });

      it('should have read access to Endpoint Policy Management', () => {
        ensurePolicyListPageAuthzAccess('read', true);
        ensurePolicyDetailsPageAuthzAccess(
          loadedEndpoints.data.integrationPolicies[0].id,
          'read',
          true
        );
      });

      for (const { title, id } of artifactPagesFullAccess) {
        it(`should have CRUD access to: ${title}`, () => {
          ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
        });
      }

      it(`should NOT have access to Host Isolation Exceptions`, () => {
        ensureArtifactPageAuthzAccess(
          'none',
          pageById.hostIsolationExceptions.id as EndpointArtifactPageId
        );
      });

      it('should NOT have access to Fleet', () => {
        visitFleetAgentList();
        ensureFleetPermissionDeniedScreen();
      });
    });

    describe('for role: threat_intelligence_analyst', () => {
      const deniedPages = allPages.filter(({ id }) => id !== 'blocklist' && id !== 'endpointList');

      beforeEach(() => {
        loginServerless(ServerlessUser.THREAT_INTELLIGENCE_ANALYST);
      });

      it('should have access to Endpoint list page', () => {
        ensureEndpointListPageAuthzAccess('read', true);
      });

      it(`should have ALL access to: Blocklist`, () => {
        cy.visit(pageById.blocklist.url);
        getArtifactListEmptyStateAddButton(pageById.blocklist.id as EndpointArtifactPageId).should(
          'exist'
        );
      });

      for (const { url, title } of deniedPages) {
        it(`should NOT have access to: ${title}`, () => {
          cy.visit(url);
          getNoPrivilegesPage().should('exist');
        });
      }

      it('should NOT have access to Fleet', () => {
        visitFleetAgentList();
        ensureFleetPermissionDeniedScreen();
      });
    });

    describe('for role: rule_author', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.eventFilters,
        pageById.blocklist,
      ];

      beforeEach(() => {
        loginServerless(ServerlessUser.RULE_AUTHOR);
      });

      for (const { id, title } of artifactPagesFullAccess) {
        it(`should have CRUD access to: ${title}`, () => {
          ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
        });
      }

      it('should have access to Endpoint list page', () => {
        ensureEndpointListPageAuthzAccess('all', true);
      });

      it('should have access to policy management', () => {
        ensurePolicyListPageAuthzAccess('all', true);
        ensurePolicyDetailsPageAuthzAccess(
          loadedEndpoints.data.integrationPolicies[0].id,
          'all',
          true
        );
      });

      it(`should NOT have access to Host Isolation Exceptions`, () => {
        ensureArtifactPageAuthzAccess(
          'none',
          pageById.hostIsolationExceptions.id as EndpointArtifactPageId
        );
      });

      it('should NOT have access to Fleet', () => {
        visitFleetAgentList();
        ensureFleetPermissionDeniedScreen();
      });
    });

    describe('for role: soc_manager', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.eventFilters,
        pageById.blocklist,
      ];
      const grantedAccessPages = [pageById.endpointList, pageById.policyList];

      beforeEach(() => {
        loginServerless(ServerlessUser.SOC_MANAGER);
      });

      for (const { id, title } of artifactPagesFullAccess) {
        it(`should have CRUD access to: ${title}`, () => {
          ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
        });
      }

      for (const { url, title } of grantedAccessPages) {
        it(`should have access to: ${title}`, () => {
          cy.visit(url);
          getNoPrivilegesPage().should('not.exist');
        });
      }

      it(`should NOT have access to Host Isolation Exceptions`, () => {
        ensureArtifactPageAuthzAccess(
          'none',
          pageById.hostIsolationExceptions.id as EndpointArtifactPageId
        );
      });

      it('should NOT have access to Fleet', () => {
        visitFleetAgentList();
        ensureFleetPermissionDeniedScreen();
      });
    });

    // Endpoint Operations Manager, Endpoint Policy Manager and Platform Engineer currently have the same level of access
    (
      [
        'platform_engineer',
        `endpoint_operations_analyst`,
        'endpoint_policy_manager',
      ] as ServerlessUser[]
    ).forEach((roleName) => {
      describe(`for role: ${roleName}`, () => {
        const artifactPagesFullAccess = [
          pageById.trustedApps,
          pageById.eventFilters,
          pageById.blocklist,
        ];
        const grantedAccessPages = [pageById.endpointList, pageById.policyList];

        beforeEach(() => {
          loginServerless(roleName);
        });

        for (const { id, title } of artifactPagesFullAccess) {
          it(`should have CRUD access to: ${title}`, () => {
            ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
          });
        }

        for (const { url, title } of grantedAccessPages) {
          it(`should have access to: ${title}`, () => {
            cy.visit(url);
            getNoPrivilegesPage().should('not.exist');
          });
        }

        it(`should NOT have access to Host Isolation Exceptions`, () => {
          ensureArtifactPageAuthzAccess(
            'none',
            pageById.hostIsolationExceptions.id as EndpointArtifactPageId
          );
        });

        it('should have access to Fleet', () => {
          visitFleetAgentList();
          getFleetAgentListTable().should('exist');
        });
      });
    });
  }
);

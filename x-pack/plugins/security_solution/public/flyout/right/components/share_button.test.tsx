/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, fireEvent } from '@testing-library/react';
import { copyToClipboard } from '@elastic/eui';
import { ShareButton } from './share_button';
import React from 'react';
import { FLYOUT_HEADER_SHARE_BUTTON_TEST_ID } from './test_ids';
import { FLYOUT_URL_PARAM } from '../../shared/hooks/url/use_sync_flyout_state_with_url';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
  EuiCopy: jest.fn(({ children: functionAsChild }) => functionAsChild(jest.fn())),
}));

const alertUrl = 'https://example.com/alert';

const renderShareButton = () =>
  render(
    <IntlProvider locale="en">
      <ShareButton alertUrl={alertUrl} />
    </IntlProvider>
  );

describe('ShareButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the share button', () => {
    renderShareButton();

    expect(screen.getByTestId(FLYOUT_HEADER_SHARE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('copies the alert URL to clipboard', () => {
    const syncedFlyoutState = 'flyoutState';
    const query = `?${FLYOUT_URL_PARAM}=${syncedFlyoutState}`;

    Object.defineProperty(window, 'location', {
      value: {
        search: query,
      },
    });

    renderShareButton();

    fireEvent.click(screen.getByTestId(FLYOUT_HEADER_SHARE_BUTTON_TEST_ID));

    expect(copyToClipboard).toHaveBeenCalledWith(
      `${alertUrl}&${FLYOUT_URL_PARAM}=${syncedFlyoutState}`
    );
  });
});

import { describe, expect, it, jest } from '@jest/globals';
import { userEvent } from '@testing-library/react-native';

import { OfflineBanner, StatePanel } from './state-panel';
import { renderThemed } from './test-utils';

describe('StatePanel', () => {
  it('shows a loading skeleton that implies shape only', async () => {
    const view = await renderThemed(<StatePanel state={{ kind: 'loading', rows: 3 }} />);
    expect(view.getByLabelText('Loading')).toBeTruthy();
    expect(view.getAllByTestId('skeleton-row')).toHaveLength(3);
    expect(view.queryByText(/\d/)).toBeNull();
  });

  it('shows an honest empty state with one action', async () => {
    const onAction = jest.fn();
    const view = await renderThemed(
      <StatePanel state={{ kind: 'empty', title: 'Nothing near you yet', body: 'Post the first plan in Sector 8.', actionLabel: 'Post the first plan', onAction }} />,
      'dark',
    );
    expect(view.getByRole('header', { name: 'Nothing near you yet' })).toBeTruthy();
    await userEvent.setup().press(view.getByRole('button', { name: 'Post the first plan' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('shows an error with retry', async () => {
    const onRetry = jest.fn();
    const view = await renderThemed(<StatePanel state={{ kind: 'error', onRetry }} />);
    expect(view.getByText("Couldn't load")).toBeTruthy();
    expect(view.getByText('Check your connection and try again.')).toBeTruthy();
    await userEvent.setup().press(view.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows the restricted message without the reason', async () => {
    const view = await renderThemed(<StatePanel state={{ kind: 'restricted' }} />);
    expect(view.getByText('Your account is limited right now. Contact support.')).toBeTruthy();
  });

  it('shows the not-available state identically for every cause', async () => {
    const view = await renderThemed(<StatePanel state={{ kind: 'notAvailable' }} />);
    expect(view.getByRole('header', { name: "This isn't available" })).toBeTruthy();
    expect(view.getByText("It may have ended or isn't shared with you.")).toBeTruthy();
  });

  it('shows the offline banner with the last update', async () => {
    const view = await renderThemed(<OfflineBanner lastUpdated="10:42 am" />);
    expect(view.getByText("You're offline. We'll send this when you're back.")).toBeTruthy();
    expect(view.getByText('Last updated 10:42 am')).toBeTruthy();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import SlaBadge from './components/SlaBadge';

vi.mock('./api/http', () => ({
  getTickets: async () => ({ data: [], serverNow: new Date().toISOString() }),
  getPolicy: async () => ({ defaults: { urgent: 60, high: 240, medium: 480, low: 1440 }, warningPercent: 75, rules: [] }),
  createTicket: async (b) => b,
  patchStatus: async () => ({}),
  putPolicy: async (p) => p,
  errMsg: () => 'err',
}));

test('app renders header', async () => {
  render(<MemoryRouter initialEntries={['/settings']}><App /></MemoryRouter>);
  expect(await screen.findByText('SupportSLA')).toBeTruthy();
});

test('badge labels', () => {
  const { rerender } = render(<SlaBadge slaState="warning" />);
  expect(screen.getByText('Warning')).toBeTruthy();
  rerender(<SlaBadge slaState="breached" escalated />);
  expect(screen.getByText('Breached')).toBeTruthy();
  expect(screen.getByText('Escalated')).toBeTruthy();
});

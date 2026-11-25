// UI smoke test: render the whole app on the dev fixture backend and click through every screen.
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import App from '../src/App.jsx';

const T = { timeout: 5000 };
beforeEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
  window.confirm = () => true;
  window.prompt = () => 'grade looks wrong';
  Element.prototype.scrollIntoView = vi.fn();
});

describe('trainee flow', () => {
  it('practises a ticket: question, wrong fix, right fix, debrief', async () => {
    window.history.replaceState({}, '', '/?role=trainee');
    render(<App />);
    expect(await screen.findByText('Suggested for you', {}, T)).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Tracks' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Practise' })[0]);
    expect(await screen.findByText(/Practice: not a real customer/, {}, T)).toBeTruthy();
    expect(screen.getByText('Knowledge base')).toBeTruthy();
    await screen.findByText(/GlobalProtect VPN/, {}, T);

    const box = screen.getByLabelText('Your reply to the customer');
    fireEvent.change(box, { target: { value: 'What network are you on right now?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    // the customer reply shows first, while the grade is still on its way
    expect(await screen.findByText(/Checking your reply against the KB/, {}, T)).toBeTruthy();
    expect(screen.queryByText(/Clear, specific question/)).toBeNull();
    expect(await screen.findByText(/Clear, specific question/, {}, T)).toBeTruthy();

    fireEvent.change(box, { target: { value: 'Please reinstall GlobalProtect.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    expect(await screen.findByText('Wrong fix', {}, T)).toBeTruthy();
    expect(screen.getByText(/KB-1: Do not reinstall/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Your reply to the customer'), { target: { value: 'Switch to the TCP gateway and connect.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    expect(await screen.findByText(/Solved. The customer confirmed/, {}, T)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'See the real ticket' }));
    expect(await screen.findByText('What the customer knew', { exact: false }, T)).toBeTruthy();
    expect(screen.getByText('never asked')).toBeTruthy();
    expect(screen.getAllByText('Internal note').length).toBeGreaterThan(0);
  });

  it('opens the KB article from the search panel', async () => {
    window.history.replaceState({}, '', '/?role=trainee');
    render(<App />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Practise' }, T))[0]);
    const link = await screen.findByRole('button', { name: /GlobalProtect VPN/ }, T);
    fireEvent.click(link);
    expect(await screen.findByRole('button', { name: '← Results' }, T)).toBeTruthy();
  });
});

describe('lead flow', () => {
  it('opens tracks, a track, a case preview and the AI customer test', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Tracks' }, T));
    fireEvent.click(await screen.findByText('IT desk: first two weeks', {}, T));
    expect(await screen.findByText('Trainees', {}, T)).toBeTruthy();
    expect(screen.getByText('Jordan Lee')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0]);
    expect(await screen.findByText('Customer card', {}, T)).toBeTruthy();
    expect(screen.getByText(/agent-only terms are blocked/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Test the AI customer' }));
    expect(await screen.findByText(/Lead preview: testing the AI customer/, {}, T)).toBeTruthy();
  });

  it('builds a new track form with JQL preview', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Tracks' }, T));
    fireEvent.click(await screen.findByRole('button', { name: 'New track' }, T));
    fireEvent.click(screen.getByRole('button', { name: 'Preview tickets' }));
    expect(await screen.findByText('ITSD-4102', { exact: false }, T)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Demo pack/));
    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('shows team progress, confirms readiness and opens a trainee', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Team' }, T));
    expect(await screen.findByText('Team progress', {}, T)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm ready' })).toBeTruthy();
    expect(screen.getByText('practice reps this week')).toBeTruthy();
    expect(screen.getByText('median reps to ready')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Jordan Lee' }));
    expect(await screen.findByText('Errors by type', { exact: false }, T)).toBeTruthy();
    expect(screen.getByText('Next practice tickets')).toBeTruthy();
  });

  it('edits settings', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Settings' }, T));
    const turn = await screen.findByLabelText(/Turn limit/, {}, T);
    fireEvent.change(turn, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Saved.', {}, T)).toBeTruthy();
  });

  it('starts on the team view in the global lead page', async () => {
    window.history.replaceState({}, '', '/?module=ride-along-lead-page');
    render(<App />);
    expect(await screen.findByText('Team progress', {}, T)).toBeTruthy();
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('tab', { name: 'Team' }).getAttribute('aria-selected')).toBe('true');
  });
});

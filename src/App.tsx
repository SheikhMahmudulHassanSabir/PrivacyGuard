import React, { useState } from 'react';
import initialRunData from './data/latest_run.json';
import { ExperimentRunData } from './types/privacy';
import { safeLoadStorage, safeSaveStorage } from './lib/exportUtils';
import { OverviewView } from './views/OverviewView';
import { InteractiveTestView } from './views/InteractiveTestView';
import { CompareMethodsView } from './views/CompareMethodsView';
import { RunExperimentView } from './views/RunExperimentView';
import { ResultsDashboardView } from './views/ResultsDashboardView';
import {
  Shield,
  FlaskConical,
  Scale,
  Play,
  BarChart3,
  Plus,
  Menu,
  X,
} from 'lucide-react';

const STORAGE_RUNS_KEY = 'privacyguard_saved_runs_v1';
const STORAGE_ACTIVE_ID_KEY = 'privacyguard_active_run_id_v1';

export function App() {
  const [activeView, setActiveView] = useState<string>('overview');
  const [savedRuns, setSavedRuns] = useState<ExperimentRunData[]>(() => {
    const baseline = initialRunData as unknown as ExperimentRunData;
    const stored = safeLoadStorage<ExperimentRunData[]>(STORAGE_RUNS_KEY, []);
    if (Array.isArray(stored) && stored.length > 0) {
      const hasBaseline = stored.some(
        (r) => r?.run_metadata?.run_id === baseline.run_metadata?.run_id
      );
      return hasBaseline ? stored : [...stored, baseline];
    }
    return [baseline];
  });

  const [currentRunData, setCurrentRunData] = useState<ExperimentRunData>(() => {
    const baseline = initialRunData as unknown as ExperimentRunData;
    const activeId = safeLoadStorage<string>(STORAGE_ACTIVE_ID_KEY, '');
    if (activeId) {
      const stored = safeLoadStorage<ExperimentRunData[]>(STORAGE_RUNS_KEY, []);
      const match = Array.isArray(stored)
        ? stored.find((r) => r?.run_metadata?.run_id === activeId)
        : undefined;
      if (match) return match;
    }
    return baseline;
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'test', label: 'Interactive Test', icon: FlaskConical },
    { id: 'compare', label: 'Compare', icon: Scale },
    { id: 'experiment', label: 'Experiment', icon: Play },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  ];

  const handleNavigate = (viewId: string) => {
    setActiveView(viewId);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveNewRun = (newRun: ExperimentRunData) => {
    setCurrentRunData(newRun);
    setSavedRuns((prev) => {
      const filtered = prev.filter(
        (r) => r?.run_metadata?.run_id !== newRun.run_metadata?.run_id
      );
      const updated = [newRun, ...filtered].slice(0, 6);
      // Persist lightweight run summaries if full payload exceeds storage quota
      if (!safeSaveStorage(STORAGE_RUNS_KEY, updated)) {
        safeSaveStorage(STORAGE_RUNS_KEY, [newRun]);
      }
      safeSaveStorage(STORAGE_ACTIVE_ID_KEY, newRun.run_metadata?.run_id || '');
      return updated;
    });
  };

  const handleUpdateActiveRun = (run: ExperimentRunData) => {
    setCurrentRunData(run);
    safeSaveStorage(STORAGE_ACTIVE_ID_KEY, run.run_metadata?.run_id || '');
  };

  return (
    <div className="min-h-screen bg-white text-neutral-950 flex flex-col font-sans">
      {/* Three-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNavigate('overview')}
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-neutral-950 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
          >
            <Shield className="w-5 h-5 text-neutral-950 stroke-[2]" />
            <span>PrivacyGuard</span>
          </button>

          {/* Zone 2: Desktop Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 overflow-x-auto h-full"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleNavigate(item.id)}
                  className={`h-full inline-flex items-center gap-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer focus-visible:outline-none ${
                    isActive
                      ? 'border-neutral-950 text-neutral-950'
                      : 'border-transparent text-neutral-500 hover:text-neutral-950'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Mobile Hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate('experiment')}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2]" />
              <span>New Benchmark</span>
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 transition-colors cursor-pointer"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 stroke-[2]" />
              ) : (
                <Menu className="w-5 h-5 stroke-[2]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 bg-white px-4 pt-2 pb-4 space-y-2 shadow-lg animate-in slide-in-from-top-2">
            <nav aria-label="Mobile Navigation" className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => handleNavigate(item.id)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-neutral-950 text-white'
                        : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 stroke-[1.75] ${
                        isActive ? 'text-white' : 'text-neutral-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => handleNavigate('experiment')}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors rounded cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                <span>New Benchmark</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeView === 'overview' && (
          <OverviewView
            experimentData={currentRunData}
            onNavigate={handleNavigate}
          />
        )}
        {activeView === 'test' && <InteractiveTestView />}
        {activeView === 'compare' && <CompareMethodsView />}
        {activeView === 'experiment' && (
          <RunExperimentView
            corpusData={initialRunData as any}
            currentData={currentRunData}
            savedRuns={savedRuns}
            onSaveNewRun={handleSaveNewRun}
            onUpdateActiveRun={handleUpdateActiveRun}
            onNavigateToDashboard={() => handleNavigate('dashboard')}
          />
        )}
        {activeView === 'dashboard' && (
          <ResultsDashboardView experimentData={currentRunData} />
        )}
      </main>

      {/* Minimalist Monochrome Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-neutral-700">
            <Shield className="w-3.5 h-3.5 text-neutral-950 stroke-[2]" />
            <span className="font-semibold text-neutral-950">PrivacyGuard Framework</span>
            <span aria-hidden="true">·</span>
            <span>Research Benchmark Edition</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-neutral-500">
            <span>4,434 Annotated Cases</span>
            <span aria-hidden="true">·</span>
            <span>5 Privacy Paradigms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

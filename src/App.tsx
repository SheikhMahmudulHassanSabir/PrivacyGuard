import React, { useState } from 'react';
import initialRunData from './data/latest_run.json';
import { ExperimentRunData } from './types/privacy';
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
} from 'lucide-react';

export function App() {
  const [activeView, setActiveView] = useState<string>('overview');
  const [currentRunData, setCurrentRunData] = useState<ExperimentRunData>(initialRunData as any);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'test', label: 'Interactive Test', icon: FlaskConical },
    { id: 'compare', label: 'Compare', icon: Scale },
    { id: 'experiment', label: 'Experiment', icon: Play },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  ];

  const handleNavigate = (viewId: string) => {
    setActiveView(viewId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-neutral-950 flex flex-col font-sans">
      {/* Three-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNavigate('overview')}
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-neutral-950 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none"
          >
            <Shield className="w-5 h-5 text-neutral-950 stroke-[2]" />
            <span>PrivacyGuard</span>
          </button>

          {/* Zone 2: 5 Single-Line Navigation Links with Monochrome Icons */}
          <nav className="flex items-center gap-6 overflow-x-auto h-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`h-full inline-flex items-center gap-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
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

          {/* Zone 3: 1 Primary Action */}
          <div className="hidden sm:flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate('experiment')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2]" />
              <span>New Benchmark</span>
            </button>
          </div>
        </div>
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
            currentData={currentRunData}
            onUpdateActiveRun={(newData) => setCurrentRunData(newData)}
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

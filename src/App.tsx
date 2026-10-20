import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { WizardHeader } from './components/wizard/WizardHeader';
import { UserRoleSwitcher } from './components/auth/UserRoleSwitcher';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Academic Planning</p>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Exam Seating Arrangement Generator</h1>
            </div>
            <div className="flex items-center gap-3">
              <UserRoleSwitcher />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <WizardHeader />
          <AppRouter />
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

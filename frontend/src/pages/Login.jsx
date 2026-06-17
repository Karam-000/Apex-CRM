import { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await onLogin(email, password);
    if (!result.success) {
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <main className="w-full max-w-[420px]">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.png" alt="Apex CRM" className="w-16 h-16 rounded-lg mb-6 object-contain border border-outline-variant/50 bg-surface-bright p-1 shadow-sm" />
            <h1 className="text-2xl font-bold text-on-surface mb-2 text-center">Login to Apex</h1>
            <p className="text-sm text-on-surface-variant text-center">Enter your details to access your dashboard.</p>
          </div>

          {error && (
            <div className="mb-6 bg-error-container border border-error/20 rounded-lg p-4 flex items-start gap-3" role="alert">
              <AlertCircle className="h-5 w-5 text-error mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-on-error-container">Sign in failed</h3>
                <p className="text-xs text-on-error-container mt-1 opacity-90">{error}</p>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-on-surface mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-outline" />
                <input
                  id="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container transition-shadow"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-on-surface mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-outline" />
                <input
                  id="password" type="password" autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container transition-shadow"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className={`w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-outline">Apex CRM Enterprise v1.0</p>
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { settingsService, backupService } from '../../services/api';

export default function Settings() {
  const [general, setGeneral] = useState({ crm_name: 'Apex CRM', support_email: 'support@apexcrm.com' });
  const [backups, setBackups] = useState([]);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [settingsRes, backupRes] = await Promise.all([settingsService.list(), backupService.list()]);
      const general = settingsRes.data.find(s => s.category === 'general' && s.key === 'profile');
      if (general?.value_json) setGeneral(g => ({ ...g, ...general.value_json }));
      setBackups(backupRes.data);
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  };

  const saveGeneral = async () => {
    setSaving(true);
    try {
      await settingsService.upsert('general', 'profile', general);
      alert('Settings saved.');
    } catch (error) {
      alert('Failed to save: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const runBackup = async () => {
    setBackingUp(true);
    try {
      await backupService.runManual();
      await load();
      alert('Manual backup completed.');
    } catch (error) {
      alert('Backup failed: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setBackingUp(false);
    }
  };

  const lastBackup = backups[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">System Settings</h1>

      <div className="bg-surface-container-lowest shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-on-surface">General Configuration</h3>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label className="block text-sm font-medium text-on-surface-variant">CRM Name</label>
              <input type="text" value={general.crm_name}
                onChange={e => setGeneral({ ...general, crm_name: e.target.value })}
                className="mt-1 block w-full border border-outline-variant rounded-md shadow-sm py-2 px-3 focus:ring-primary-container focus:border-primary-container sm:text-sm" />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-sm font-medium text-on-surface-variant">Support Email</label>
              <input type="email" value={general.support_email}
                onChange={e => setGeneral({ ...general, support_email: e.target.value })}
                className="mt-1 block w-full border border-outline-variant rounded-md shadow-sm py-2 px-3 focus:ring-primary-container focus:border-primary-container sm:text-sm" />
            </div>
          </div>
        </div>
        <div className="px-4 py-3 bg-surface-container-low text-right sm:px-6">
          <button onClick={saveGeneral} disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest shadow sm:rounded-lg mt-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-on-surface">Backup & Recovery</h3>
          <p className="mt-1 text-sm text-outline">
            {lastBackup
              ? `Last backup: ${new Date(lastBackup.created_at).toLocaleString()} (${lastBackup.backup_type})`
              : 'No backups yet.'}
          </p>
          <div className="mt-4">
            <button onClick={runBackup} disabled={backingUp}
              className="inline-flex items-center px-4 py-2 border border-outline-variant shadow-sm text-sm font-medium rounded-md text-on-surface-variant bg-surface-container-lowest hover:bg-surface-container-low disabled:opacity-50">
              {backingUp ? 'Running...' : 'Run Manual Backup'}
            </button>
          </div>
          {backups.length > 0 && (
            <ul className="mt-4 text-sm text-on-surface-variant space-y-1 max-h-48 overflow-y-auto">
              {backups.map(b => (
                <li key={b.id} className="flex justify-between border-b border-outline-variant py-1">
                  <span className="font-mono text-xs">{b.file_path}</span>
                  <span className="text-outline">{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

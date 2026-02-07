'use client';

import { useState, useEffect, useMemo } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface AttributeStat {
  name: string;
  product_count: number;
  total_values: number;
}

interface FilterSettings {
  enabled: Record<string, { enabled: boolean; max_values: number }>;
  global_max_values: number;
  show_counts: boolean;
  display_limit: number;
}

const limitOptions = [
  { value: 10, label: 'Top 10' },
  { value: 20, label: 'Top 20' },
  { value: 50, label: 'Top 50' },
  { value: 100, label: 'Top 100' },
  { value: 0, label: 'Všetky' },
];

export default function AdminFiltersPage() {
  const [attributes, setAttributes] = useState<AttributeStat[]>([]);
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    enabled: {},
    global_max_values: 10,
    show_counts: true,
    display_limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(20);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const statsRes = await fetch(`${API_URL}/api/admin/attributes/stats`, {
        credentials: 'include',
      });
      const statsData = await statsRes.json();
      if (statsData.success && statsData.data) {
        setAttributes(
          statsData.data.sort(
            (a: AttributeStat, b: AttributeStat) =>
              b.product_count - a.product_count
          )
        );
      }

      const settingsRes = await fetch(`${API_URL}/api/admin/filter-settings`, {
        credentials: 'include',
      });
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.data?.enabled) {
        const s = {
          enabled: settingsData.data.enabled,
          global_max_values: settingsData.data.global_max_values || 10,
          show_counts: settingsData.data.show_counts !== false,
          display_limit: settingsData.data.display_limit || 20,
        };
        setFilterSettings(s);
        setDisplayLimit(s.display_limit);
      }
    } catch (err) {
      console.error('Error loading filter data:', err);
    }
    setLoading(false);
  }

  function toggleAttribute(attrName: string) {
    setFilterSettings((prev) => {
      const next = { ...prev, enabled: { ...prev.enabled } };
      if (!next.enabled[attrName]) {
        next.enabled[attrName] = {
          enabled: true,
          max_values: prev.global_max_values,
        };
      } else {
        next.enabled[attrName] = {
          ...next.enabled[attrName],
          enabled: !next.enabled[attrName].enabled,
        };
      }
      return next;
    });
  }

  function updateMaxValues(attrName: string, value: number) {
    setFilterSettings((prev) => {
      const next = { ...prev, enabled: { ...prev.enabled } };
      if (!next.enabled[attrName]) {
        next.enabled[attrName] = { enabled: true, max_values: value };
      } else {
        next.enabled[attrName] = { ...next.enabled[attrName], max_values: value };
      }
      return next;
    });
  }

  function isEnabled(attrName: string) {
    return filterSettings.enabled[attrName]?.enabled === true;
  }

  function getMaxValues(attrName: string) {
    return (
      filterSettings.enabled[attrName]?.max_values ||
      filterSettings.global_max_values
    );
  }

  const filteredAttributes = useMemo(() => {
    if (!searchQuery) return attributes;
    return attributes.filter((a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [attributes, searchQuery]);

  const displayedAttributes = useMemo(() => {
    return displayLimit > 0
      ? filteredAttributes.slice(0, displayLimit)
      : filteredAttributes;
  }, [filteredAttributes, displayLimit]);

  const enabledCount = useMemo(() => {
    return Object.values(filterSettings.enabled).filter((v) => v.enabled).length;
  }, [filterSettings.enabled]);

  function selectAllVisible() {
    setFilterSettings((prev) => {
      const next = { ...prev, enabled: { ...prev.enabled } };
      displayedAttributes.forEach((attr) => {
        if (!next.enabled[attr.name]) {
          next.enabled[attr.name] = {
            enabled: true,
            max_values: prev.global_max_values,
          };
        } else {
          next.enabled[attr.name] = { ...next.enabled[attr.name], enabled: true };
        }
      });
      return next;
    });
  }

  function deselectAllVisible() {
    setFilterSettings((prev) => {
      const next = { ...prev, enabled: { ...prev.enabled } };
      displayedAttributes.forEach((attr) => {
        if (next.enabled[attr.name]) {
          next.enabled[attr.name] = {
            ...next.enabled[attr.name],
            enabled: false,
          };
        }
      });
      return next;
    });
  }

  function applyGlobalMaxToAll() {
    setFilterSettings((prev) => {
      const next = { ...prev, enabled: { ...prev.enabled } };
      Object.keys(next.enabled).forEach((key) => {
        next.enabled[key] = {
          ...next.enabled[key],
          max_values: prev.global_max_values,
        };
      });
      return next;
    });
  }

  async function saveSettings() {
    setSaving(true);
    setMessage('');
    const toSave = { ...filterSettings, display_limit: displayLimit };
    try {
      const res = await fetch(`${API_URL}/api/admin/filter-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(toSave),
      });
      const result = await res.json();
      setMessage(result.success ? 'success' : 'error');
    } catch (err) {
      console.error('Save error:', err);
      setMessage('error');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 4000);
  }

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid #e2e8f0',
            borderTopColor: '#c4956a',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p>Načítavam atribúty...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (attributes.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
        <h2 style={{ margin: '0 0 8px', color: '#334155' }}>Žiadne atribúty</h2>
        <p>Najprv importujte produkty cez dodávateľa</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
            🔍 Nastavenie filtrov
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            {attributes.length} atribútov • {enabledCount} aktívnych
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {message === 'success' && (
            <span style={{ fontSize: 14, fontWeight: 500, color: '#059669' }}>
              ✅ Uložené
            </span>
          )}
          {message === 'error' && (
            <span style={{ fontSize: 14, fontWeight: 500, color: '#dc2626' }}>
              ❌ Chyba pri ukladaní
            </span>
          )}
          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: saving ? 'wait' : 'pointer',
              background: '#c4956a',
              color: 'white',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? '⏳ Ukladám...' : '💾 Uložiť'}
          </button>
        </div>
      </div>

      {/* Global Settings */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          padding: '20px 24px',
          marginBottom: 20,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: '#334155' }}>
          📐 Všeobecné nastavenia
        </h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 14, color: '#475569', whiteSpace: 'nowrap' }}>
              Zobraziť atribútov:
            </label>
            <select
              value={displayLimit}
              onChange={(e) => setDisplayLimit(parseInt(e.target.value))}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 14,
                background: 'white',
                cursor: 'pointer',
                minWidth: 120,
              }}
            >
              {limitOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 14, color: '#475569', whiteSpace: 'nowrap' }}>
              Max. hodnôt na filter:
            </label>
            <input
              type="number"
              value={filterSettings.global_max_values}
              onChange={(e) =>
                setFilterSettings((prev) => ({
                  ...prev,
                  global_max_values: parseInt(e.target.value) || 10,
                }))
              }
              min={1}
              max={100}
              style={{
                width: 65,
                padding: 8,
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                textAlign: 'center',
              }}
            />
            <button
              onClick={applyGlobalMaxToAll}
              style={{
                padding: '8px 14px',
                fontSize: 13,
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Aplikovať na všetky
            </button>
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 14,
              color: '#475569',
            }}
          >
            <input
              type="checkbox"
              checked={filterSettings.show_counts}
              onChange={(e) =>
                setFilterSettings((prev) => ({
                  ...prev,
                  show_counts: e.target.checked,
                }))
              }
              style={{ width: 18, height: 18, accentColor: '#c4956a' }}
            />
            <span>Zobrazovať počty</span>
          </label>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="🔎 Hľadať atribút..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            fontSize: 14,
            width: 220,
            background: 'white',
          }}
        />
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Zobrazených: {displayedAttributes.length} z {filteredAttributes.length}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={selectAllVisible}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            ✓ Vybrať zobrazené
          </button>
          <button
            onClick={deselectAllVisible}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              background: 'white',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            ✗ Zrušiť zobrazené
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'center',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  borderBottom: '1px solid #e2e8f0',
                  width: 80,
                }}
              >
                Aktívny
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  borderBottom: '1px solid #e2e8f0',
                  minWidth: 200,
                }}
              >
                Názov atribútu
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  borderBottom: '1px solid #e2e8f0',
                  width: 100,
                }}
              >
                Produktov
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  borderBottom: '1px solid #e2e8f0',
                  width: 100,
                }}
              >
                Hodnôt
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  borderBottom: '1px solid #e2e8f0',
                  width: 130,
                }}
              >
                Max. na výber
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedAttributes.map((attr, index) => {
              const enabled = isEnabled(attr.name);
              return (
                <tr
                  key={attr.name}
                  style={{
                    background: enabled ? '#fefce8' : 'transparent',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                    <label
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: 44,
                        height: 24,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleAttribute(attr.name)}
                        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: enabled ? '#c4956a' : '#e2e8f0',
                          transition: '.2s',
                          borderRadius: 24,
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            content: '""',
                            height: 18,
                            width: 18,
                            left: enabled ? 23 : 3,
                            bottom: 3,
                            backgroundColor: 'white',
                            transition: '.2s',
                            borderRadius: '50%',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }}
                        />
                      </span>
                    </label>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#9ca3af',
                          background: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: 4,
                          minWidth: 32,
                          textAlign: 'center',
                        }}
                      >
                        #{index + 1}
                      </span>
                      <strong style={{ color: '#1e293b', fontWeight: 500 }}>
                        {attr.name}
                      </strong>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        background: '#dbeafe',
                        color: '#1e40af',
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {attr.product_count}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: 'center',
                      padding: '12px 16px',
                      fontSize: 14,
                      color: '#475569',
                    }}
                  >
                    {attr.total_values}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <input
                      type="number"
                      value={getMaxValues(attr.name)}
                      onChange={(e) =>
                        updateMaxValues(attr.name, parseInt(e.target.value) || 10)
                      }
                      min={1}
                      max={100}
                      disabled={!enabled}
                      style={{
                        width: 65,
                        padding: 8,
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        textAlign: 'center',
                        background: enabled ? 'white' : '#f8fafc',
                        color: enabled ? '#1e293b' : '#94a3b8',
                        cursor: enabled ? 'text' : 'not-allowed',
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {displayedAttributes.length === 0 && searchQuery && (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            Žiadne atribúty pre &quot;{searchQuery}&quot;
          </div>
        )}

        {displayLimit > 0 && filteredAttributes.length > displayLimit && (
          <div
            style={{
              padding: 16,
              textAlign: 'center',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <button
              onClick={() => setDisplayLimit(0)}
              style={{
                padding: '8px 14px',
                fontSize: 13,
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Zobraziť všetkých {filteredAttributes.length} atribútov
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

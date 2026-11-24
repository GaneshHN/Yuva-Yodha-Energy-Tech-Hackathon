"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import useSWR, { mutate } from "swr";
import { Activity, AlertCircle, ArrowRight, ArrowUpRight, Bell, Building2, Check, ChevronDown, CircleHelp, Factory, Gauge, LayoutDashboard, Leaf, LogOut, Plus, RefreshCw, Search, Zap } from "lucide-react";
import { apiRequest, formatMetric, type EnergyPoint, type EnergySummary, type Factory as FactoryRecord, type Machine, type User } from "@/lib/api";
import { AuthScreen } from "@/components/auth-screen";
import { EnergyChart } from "@/components/energy-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fetcher = <T,>(path: string) => apiRequest<T>(path);

type Section = "overview" | "factories" | "machines";

export function EnerPilotApp() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [factoryId, setFactoryId] = useState("");
  const [factoryName, setFactoryName] = useState("");
  const [factoryLocation, setFactoryLocation] = useState("");
  const [factoryError, setFactoryError] = useState("");
  const [factoryPending, setFactoryPending] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiRequest<User>("/api/session")
      .then((currentUser) => { if (!cancelled) setUser(currentUser); })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setAuthReady(true); });
    return () => { cancelled = true; };
  }, []);

  const { data: factories, error: factoriesError, isLoading: factoriesLoading } = useSWR<FactoryRecord[]>(user ? "/api/backend/factories?page_size=100" : null, fetcher, { refreshInterval: 30_000 });
  const selectedFactory = useMemo(() => factories?.find((item) => item.id === factoryId) ?? factories?.[0] ?? null, [factories, factoryId]);
  const query = selectedFactory ? `factory_id=${encodeURIComponent(selectedFactory.id)}` : "";
  const { data: summary, error: summaryError, isLoading: summaryLoading } = useSWR<EnergySummary>(selectedFactory ? `/api/backend/energy/summary?${query}` : null, fetcher, { refreshInterval: 30_000 });
  const { data: trend, isLoading: trendLoading } = useSWR<EnergyPoint[]>(selectedFactory ? `/api/backend/energy/trend?${query}` : null, fetcher, { refreshInterval: 30_000 });
  const { data: machines } = useSWR<Machine[]>(selectedFactory ? `/api/backend/machines?${query}&page_size=100` : null, fetcher, { refreshInterval: 30_000 });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!authReady) return <main className="app-loading"><div className="brand-mark"><Zap aria-hidden="true" /></div><span>Opening your workspace…</span></main>;
  if (!user) return <AuthScreen onAuthenticated={() => { apiRequest<User>("/api/session").then(setUser).catch(() => setUser(null)); }} />;

  async function createFactory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFactoryPending(true);
    setFactoryError("");
    try {
      const created = await apiRequest<FactoryRecord>("/api/backend/factories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: factoryName.trim(), location: factoryLocation.trim() || null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }),
      });
      setFactoryId(created.id);
      setFactoryName("");
      setFactoryLocation("");
      setToast("Factory added to your workspace.");
      await mutate("/api/backend/factories?page_size=100");
    } catch (error) {
      setFactoryError(error instanceof Error ? error.message : "Could not create this factory.");
    } finally {
      setFactoryPending(false);
    }
  }

  async function signOut() {
    await apiRequest<null>("/api/session", { method: "DELETE" }).catch(() => undefined);
    setUser(null);
    setFactoryId("");
    setSection("overview");
  }

  const navItems: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "factories", label: "Factories", icon: Building2 },
    { id: "machines", label: "Machines", icon: Gauge },
  ];

  const activeMachines = machines?.filter((machine) => machine.status === "running").length ?? 0;
  const title = section === "overview" ? "Energy overview" : section === "factories" ? "Your factories" : "Machine fleet";

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <a className="brand-lockup sidebar-brand" href="#overview" aria-label="EnerPilot home" onClick={() => setSection("overview")}>
          <span className="brand-mark"><Zap aria-hidden="true" /></span><span>EnerPilot</span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switcher"><span className="workspace-avatar">{(selectedFactory?.name ?? "E").slice(0, 1).toUpperCase()}</span><span className="workspace-copy"><strong>{selectedFactory?.name ?? "Your workspace"}</strong><small>{selectedFactory?.location ?? "Industrial operations"}</small></span><ChevronDown aria-hidden="true" /></div>
        <nav className="side-nav" aria-label="Main navigation">
          <span className="nav-caption">OPERATIONS</span>
          {navItems.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={`nav-link ${section === id ? "active" : ""}`} onClick={() => setSection(id)} aria-label={label} aria-current={section === id ? "page" : undefined}><Icon aria-hidden="true" /><span>{label}</span>{id === "machines" && machines?.length ? <span className="nav-count">{machines.length}</span> : null}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-health"><span className="health-icon"><Activity aria-hidden="true" /></span><div><strong>System status</strong><span><i className="live-dot" /> API connected</span></div></div>
          <button className="profile-button" type="button" onClick={signOut}><span className="profile-avatar">{user.email.slice(0, 1).toUpperCase()}</span><span className="profile-copy"><strong>{user.email.split("@")[0]}</strong><small>{user.email}</small></span><LogOut aria-label="Sign out" /></button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div className="breadcrumb"><span>ENERPILOT</span><span className="breadcrumb-slash">/</span><strong>{section.toUpperCase()}</strong></div>
          <div className="topbar-actions"><span className="connection-pill"><i className="live-dot" /> Live data</span><button className="icon-button" type="button" aria-label="Search" onClick={() => setToast("Search is ready when your workspace has more data.")}><Search /></button><button className="icon-button" type="button" aria-label="Notifications" onClick={() => setToast("You’re all caught up.")}><Bell /></button><span className="topbar-divider" /><button className="help-button" type="button" onClick={() => setToast("Your data refreshes automatically every 30 seconds.")}><CircleHelp /><span>Help</span></button></div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow muted-eyebrow"><span className="live-dot" /> FACTORY PERFORMANCE</div><h1>{title}<span className="heading-period">·</span></h1><p>{section === "overview" ? "A clear view of energy use across your operation." : section === "factories" ? "Manage the sites connected to your account." : "Live status across your production equipment."}</p></div>
            {factories?.length ? <label className="factory-select-wrap"><span className="sr-only">Select factory</span><Factory aria-hidden="true" /><select value={selectedFactory?.id ?? ""} onChange={(event) => setFactoryId(event.target.value)}>{factories.map((factory) => <option key={factory.id} value={factory.id}>{factory.name}</option>)}</select><ChevronDown aria-hidden="true" /></label> : null}
          </div>

          {factoriesError && <div className="inline-alert" role="alert"><AlertCircle aria-hidden="true" /><div><strong>Could not load your factory data</strong><span>{factoriesError.message}</span></div><button type="button" onClick={() => mutate("/api/backend/factories?page_size=100")} aria-label="Retry factory request"><RefreshCw /></button></div>}
          {summaryError && section === "overview" && <div className="inline-alert" role="alert"><AlertCircle aria-hidden="true" /><div><strong>Energy metrics are unavailable</strong><span>{summaryError.message}</span></div></div>}

          {!factoriesLoading && !factoriesError && (!factories || factories.length === 0) ? (
            <section className="first-factory-panel">
              <div className="first-factory-art"><div className="art-ring ring-large" /><div className="art-ring ring-small" /><span><Factory aria-hidden="true" /></span><div className="art-readout"><i className="live-dot" /> READY FOR DATA</div></div>
              <div className="first-factory-copy"><span className="eyebrow muted-eyebrow">STEP 01 / FACTORY SETUP</span><h2>Start with your first factory.</h2><p>Connect a site to turn your energy and production readings into a live performance view. The new factory is saved to your account.</p>
                <form className="factory-form" onSubmit={createFactory}><label htmlFor="factory-name">Factory name</label><input id="factory-name" value={factoryName} onChange={(event) => setFactoryName(event.target.value)} placeholder="e.g. North Plant" required maxLength={200} /><label htmlFor="factory-location">Location <span>Optional</span></label><input id="factory-location" value={factoryLocation} onChange={(event) => setFactoryLocation(event.target.value)} placeholder="City, country" maxLength={200} />{factoryError && <p className="form-error" role="alert">{factoryError}</p>}<button className="primary-button" type="submit" disabled={factoryPending}><span>{factoryPending ? "Creating factory…" : "Create factory"}</span><ArrowRight aria-hidden="true" /></button></form>
              </div>
            </section>
          ) : null}

          {factories?.length && section === "overview" ? (
            <>
              <section className="metric-grid" aria-label="Key energy metrics">
                <MetricCard label="Energy consumed" value={summary ? formatMetric(summary.total_energy_kwh) : "—"} unit="kWh" icon={Zap} tone="lime" detail="Measured total · all recorded" loading={summaryLoading} />
                <MetricCard label="Peak demand" value={summary ? formatMetric(summary.peak_demand_kw) : "—"} unit="kW" icon={Gauge} tone="blue" detail="Highest recorded power draw" loading={summaryLoading} />
                <MetricCard label="Energy intensity" value={summary ? formatMetric(summary.energy_per_unit, 3) : "—"} unit="kWh / unit" icon={Activity} tone="amber" detail="Energy per produced unit" loading={summaryLoading} />
                <MetricCard label="Estimated emissions" value={summary ? formatMetric(summary.estimated_co2_kg) : "—"} unit="kg CO₂" icon={Leaf} tone="mint" detail="Calculated from measured energy" loading={summaryLoading} />
              </section>

              <section className="dashboard-grid">
                <Card className="panel energy-panel">
                  <CardHeader className="panel-header"><div><span className="eyebrow muted-eyebrow">MEASURED CONSUMPTION</span><CardTitle>Energy trend</CardTitle><p>Hourly readings for {selectedFactory?.name ?? "your factory"}</p></div><span className="period-chip"><span className="live-dot" /> All recorded</span></CardHeader>
                  <CardContent><EnergyChart points={trend ?? []} loading={trendLoading} /><div className="chart-legend"><span className="legend-mark" /> Energy use <span className="legend-note">kWh · grouped by UTC hour</span></div></CardContent>
                </Card>
                <Card className="panel summary-panel">
                  <CardHeader className="panel-header"><div><span className="eyebrow muted-eyebrow">PRODUCTION SNAPSHOT</span><CardTitle>Operational pulse</CardTitle><p>Built from the latest measured records</p></div><span className="pulse-icon"><Activity aria-hidden="true" /></span></CardHeader>
                  <CardContent><div className="pulse-stat"><div className="pulse-stat-heading"><span>Units produced</span><span className="pulse-arrow"><ArrowUpRight aria-hidden="true" /></span></div><strong>{summary ? formatMetric(summary.production_units) : summaryLoading ? "…" : "—"}</strong><small>Recorded production</small></div><div className="pulse-divider" /><div className="pulse-stat"><div className="pulse-stat-heading"><span>Energy cost</span><span className="cost-caption">EST.</span></div><strong>{summary ? formatMetric(summary.energy_cost, 2) : summaryLoading ? "…" : "—"}</strong><small>Currency configured by your API</small></div><div className="pulse-foot"><span className="pulse-dot" /><span>Metrics reflect backend readings only</span></div></CardContent>
                </Card>
              </section>

              <section className="lower-grid">
                <Card className="panel machine-panel"><CardHeader className="panel-header compact-panel-header"><div><span className="eyebrow muted-eyebrow">ASSET STATUS</span><CardTitle>Machine fleet</CardTitle></div><button className="text-action" type="button" onClick={() => setSection("machines")}>View all <ArrowRight aria-hidden="true" /></button></CardHeader><CardContent>{machines?.length ? <div className="machine-list">{machines.slice(0, 4).map((machine) => <MachineRow key={machine.id} machine={machine} />)}</div> : <div className="mini-empty">{machines ? "No machines have been added to this factory yet." : "Loading machine status…"}</div>}</CardContent></Card>
                <Card className="fleet-card"><div className="fleet-card-top"><span className="eyebrow">LIVE EQUIPMENT</span><Activity aria-hidden="true" /></div><div className="fleet-number">{machines ? String(machines.length).padStart(2, "0") : "—"}<span> / {machines ? String(activeMachines).padStart(2, "0") : "—"}</span></div><div className="fleet-caption">Machines monitored <span>·</span> currently running</div><div className="fleet-meter"><span style={{ width: `${machines?.length ? Math.round((activeMachines / machines.length) * 100) : 0}%` }} /></div><button type="button" onClick={() => setSection("machines")}>Explore equipment <ArrowRight aria-hidden="true" /></button></Card>
              </section>
              <footer className="page-footer"><span>ENERPILOT ENERGY SYSTEMS</span><span><i className="live-dot" /> Backend connected · refreshes every 30 seconds</span></footer>
            </>
          ) : null}

          {factories?.length && section === "factories" ? <FactoryManager factories={factories} selectedId={selectedFactory?.id ?? ""} onSelect={(id) => { setFactoryId(id); setSection("overview"); }} onCreate={createFactory} name={factoryName} location={factoryLocation} setName={setFactoryName} setLocation={setFactoryLocation} error={factoryError} pending={factoryPending} /> : null}
          {factories?.length && section === "machines" ? <MachinesPage machines={machines} /> : null}
        </div>
      </main>
      {toast && <div className="toast-message" role="status"><Check aria-hidden="true" />{toast}</div>}
    </div>
  );
}

function MetricCard({ label, value, unit, icon: Icon, tone, detail, loading }: { label: string; value: string; unit: string; icon: typeof Zap; tone: string; detail: string; loading: boolean }) {
  return <Card className="metric-card"><CardHeader className="metric-header"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon aria-hidden="true" /></span></CardHeader><CardContent><div className="metric-value">{loading ? <span className="loading-dash">···</span> : value}<span className="metric-unit">{unit}</span></div><div className="metric-detail"><span className="metric-detail-dot" />{detail}</div></CardContent></Card>;
}

function MachineRow({ machine }: { machine: Machine }) {
  const statusClass = `status-${machine.status}`;
  return <div className="machine-row"><span className="machine-glyph"><Gauge aria-hidden="true" /></span><span className="machine-name"><strong>{machine.name}</strong><small>{machine.machine_type}</small></span><span className={`machine-status ${statusClass}`}><i />{machine.status}</span><span className="machine-power">{formatMetric(machine.rated_power_kw)} <small>kW</small></span></div>;
}

function FactoryManager({ factories, selectedId, onSelect, onCreate, name, location, setName, setLocation, error, pending }: { factories: FactoryRecord[]; selectedId: string; onSelect: (id: string) => void; onCreate: (event: FormEvent<HTMLFormElement>) => void; name: string; location: string; setName: (value: string) => void; setLocation: (value: string) => void; error: string; pending: boolean }) {
  return <section className="factory-management"><div className="factory-list-panel panel"><div className="section-title"><div><span className="eyebrow muted-eyebrow">CONNECTED SITES</span><h2>Factory directory</h2></div><span className="count-chip">{factories.length} {factories.length === 1 ? "site" : "sites"}</span></div>{factories.map((factory) => <button className={`factory-row ${factory.id === selectedId ? "current" : ""}`} type="button" key={factory.id} onClick={() => onSelect(factory.id)}><span className="factory-row-icon"><Factory aria-hidden="true" /></span><span className="factory-row-name"><strong>{factory.name}</strong><small>{factory.location || "Location not set"} · {factory.timezone}</small></span>{factory.id === selectedId ? <span className="current-label"><Check aria-hidden="true" /> Current</span> : <ArrowRight className="row-arrow" aria-hidden="true" />}</button>)}</div><div className="factory-create-panel panel"><span className="eyebrow muted-eyebrow">ADD A LOCATION</span><h2>Connect another factory</h2><p>Add a site to keep its operational data organized under your account.</p><form className="factory-form" onSubmit={onCreate}><label htmlFor="another-factory">Factory name</label><input id="another-factory" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. East Plant" required maxLength={200} /><label htmlFor="another-location">Location <span>Optional</span></label><input id="another-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, country" maxLength={200} />{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="primary-button" disabled={pending}><Plus aria-hidden="true" /><span>{pending ? "Adding factory…" : "Add factory"}</span></button></form></div></section>;
}

function MachinesPage({ machines }: { machines?: Machine[] }) {
  const counts = ["running", "available", "maintenance", "offline"] as const;
  return <section className="machines-page"><div className="status-summary">{counts.map((status) => <div key={status} className="status-summary-item"><span className={`machine-status status-${status}`}><i />{status}</span><strong>{machines ? machines.filter((machine) => machine.status === status).length : "—"}</strong></div>)}</div><div className="machine-table panel"><div className="machine-table-heading"><span>Machine</span><span>Rated power</span><span>Current status</span></div>{machines?.length ? machines.map((machine) => <div className="machine-row table-row" key={machine.id}><span className="machine-glyph"><Gauge aria-hidden="true" /></span><span className="machine-name"><strong>{machine.name}</strong><small>{machine.machine_type}</small></span><span className="machine-power">{formatMetric(machine.rated_power_kw)} <small>kW</small></span><span className={`machine-status status-${machine.status}`}><i />{machine.status}</span></div>) : <div className="machine-table-empty"><Gauge aria-hidden="true" /><strong>{machines ? "No machines in this factory" : "Loading machine fleet…"}</strong><span>Machine status and rated power will appear here when assets are registered.</span></div>}</div></section>;
}

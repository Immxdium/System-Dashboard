import React, { useEffect, useRef, useState } from 'react';

/* ─────────────────────────── Types ──────────────────────────── */
interface SystemStats {
  cpuLoad: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  platform: string;
  arch: string;
  hostname: string;
  loadavg: number[];
  cpuCount: number;
}

function ScrollArea({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} style={{ overflow: 'auto', ...props.style }}>
      {children}
    </div>
  );
}

function Separator(props: React.HTMLAttributes<HTMLHRElement>) {
  return (
    <hr
      {...props}
      style={{
        border: 0,
        height: 1,
        margin: 0,
        width: '100%',
        background: '#333',
        ...props.style,
      }}
    />
  );
}

function Progress({
  value = 0,
  className,
  style,
}: {
  value?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={className} style={{ height: 4, background: '#111', ...style }}>
      <div style={{ height: '100%', width: `${pct}%`, background: '#00ff41', transition: 'width 0.5s ease' }} />
    </div>
  );
}

interface ProcEntry {
  name: string;
  pid: number;
  cpu: number;
  mem: number;
}

/* ─────────────────────── Mini Sparkline ─────────────────────── */
function Sparkline({
  data,
  color = '#00ff41',
  h = 36,
}: {
  data: number[];
  color?: string;
  h?: number;
}) {
  if (data.length < 2) return <div style={{ height: h }} />;
  const max = Math.max(...data, 1);
  const W = 400;
  const pts = data
    .map((v, i) => {
      const x = Math.round((i / (data.length - 1)) * W);
      const y = Math.round(h - 2 - (v / max) * (h - 6));
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${W} ${h}`}
      preserveAspectRatio="none"
      style={{ display: 'block'}}
    >
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>  
  );
}

/* ─────────────────────── Circular Arc ───────────────────────── */
function ArcGauge({
  pct,
  color = '#00ff41',
  size = 72,
  label,
}: {
  pct: number;
  color?: string;
  size?: number;
  label: string;
}) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  const cx = size / 2;
  const cy = size / 2;
  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)', display: 'block' }}
        >
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0d1a0d" strokeWidth="3" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="butt" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.25,0.46,0.45,0.94)' }}
          />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>
            {Math.round(pct)}
          </span>
          <span style={{ fontSize: 9, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {label}
          </span>
          </div>  
        </div>
      </div>
  );
}

/* ─────────────────────── Metric Row ─────────────────────────── */
function MetricRow({
  num,
  label,
  value,
  pct,
  valueColor = '#e8e8e8',
}: {
  num: string;
  label: string;
  value: string;
  pct: number;
  valueColor?: string;
}) {
  return (
    <div className="metric-row">
      <span className="metric-num">{num}</span>
      <span className="metric-label">{label}</span>
      <div className="metric-bar">
        <div className="metric-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
        <span className="metric-value" style={{ color: valueColor }}>{value}</span>
      </div>
    </div>
  );
}

/* ─────────────────────── Process Row ────────────────────────── */
function ProcRow({ proc, rank }: { proc: ProcEntry; rank: number }) {
  const cpuColor = proc.cpu > 50 ? '#ff3b3b' : proc.cpu > 20 ? '#ffaa00' : '#00ff41';
  return (
    <div
      className="proc-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 10,
        padding: '4px 0',
        borderBottom: '1px solid #0a0a0a',
      }}
    >
      <span style={{ color: '#333', width: 16, flexShrink: 0 }}>
        {String(rank).padStart(2, '0')}
      </span>
      <span
        className="proc-name"
        style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {proc.name}
      </span>
      <span className="proc-pid" style={{ width: 50, color: '#666', flexShrink: 0 }}>
        {proc.pid}
      </span>
      <div style={{ width: 48, height: 4, background: '#0d1a0d', flexShrink: 0 }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(proc.cpu, 100)}%`,
            background: cpuColor,
            transition: 'width 0.8s ease',
          }}
        />
      </div>
      <span className="proc-cpu-val" style={{ width: 42, textAlign: 'right', color: cpuColor }}>
        {proc.cpu.toFixed(1)}%
      </span>
      <span className="proc-mem-val" style={{ width: 42, textAlign: 'right', color: '#e8e8e8' }}>
        {proc.mem.toFixed(0)}MB
      </span>
    </div>
  );
}

/* ───────────────────── Section Header ───────────────────────── */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="sec-header">
      <span style={{ color: '#333' }}>_</span>
      {title}
    </div>
  );
}

/* ═══════════════════════ SCREEN I — OVERVIEW ════════════════════════ */
function ScreenOverview({
  stats,
  cpuPct,
  cpuHist,
  netDown,
  netUp,
  netHist,
  diskPct,
}: {
  stats: SystemStats;
  cpuPct: number;
  cpuHist: number[];
  netDown: number;
  netUp: number;
  netHist: number[];
  diskPct: number;
}) {
  const memPct = ((stats.totalMemory - stats.freeMemory) / stats.totalMemory) * 100;
  const totalGB = (stats.totalMemory / 1024 ** 3).toFixed(0);
  const usedGB = ((stats.totalMemory - stats.freeMemory) / 1024 ** 3).toFixed(1);
  const freeGB = (stats.freeMemory / 1024 ** 3).toFixed(1);
  const upH = Math.floor(stats.uptime / 3600);
  const upM = Math.floor((stats.uptime % 3600) / 60);
 
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr 180px',
        gap: 1,
        height: '100%',
        background: '#0d1a0d',
      }}
    >
      {/* LEFT PANEL */}
      <div style={{ background: '#000', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <div>
          <SectionHeader title="SYS.NODE" />
          <div className="data-row"><span className="data-key">SYS.ID</span><span className="data-val green">9·410:002</span></div>
          <div className="data-row"><span className="data-key">STATUS</span><span className="data-val green">ONLINE</span></div>
          <div className="data-row"><span className="data-key">UPLINK</span><span className="data-val green">SECURE</span></div>
          <div className="data-row"><span className="data-key">HOST</span><span className="data-val">{stats.hostname || 'NODE-001'}</span></div>
          <div className="data-row"><span className="data-key">PLATFORM</span><span className="data-val">{String(stats.platform).toUpperCase()}</span></div>
          <div className="data-row"><span className="data-key">ARCH</span><span className="data-val">{String(stats.arch).toUpperCase()}</span></div>
        </div>
 
        <div>
          <SectionHeader title="ACTIVE.METRICS" />
          <div className="data-row"><span className="data-key">CPU CORES</span><span className="data-val">{stats.cpuCount}</span></div>
          <div className="data-row"><span className="data-key">TOTAL MEM</span><span className="data-val">{totalGB} GB</span></div>
          <div className="data-row"><span className="data-key">FREE MEM</span><span className="data-val green">{freeGB} GB</span></div>
          <div className="data-row"><span className="data-key">UPTIME</span><span className="data-val">{upH}H {upM}M</span></div>
        </div>
 
        <div>
          <SectionHeader title="LOAD.AVG" />
          {(stats.loadavg || [0, 0, 0]).map((v, i) => (
            <div key={i} className="data-row">
              <span className="data-key">{['1M', '5M', '15M'][i]}</span>
              <span className="data-val" style={{ color: v > 1.5 ? '#ff3b3b' : '#e8e8e8' }}>
                {v.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
 
        <div style={{ marginTop: 'auto' }}>
          <SectionHeader title="OP.MODE" />
          <div className="data-row"><span className="data-key">MODE</span><span className="data-val green">MONITOR</span></div>
          <div className="data-row"><span className="data-key">INTERVAL</span><span className="data-val">1000MS</span></div>
        </div>
      </div>
 
      {/* CENTER PANEL */}
      <div style={{ background: '#000', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
 
        {/* Arc gauges row */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', paddingTop: 8 }}>
          <ArcGauge pct={cpuPct} color="#00ff41" size={80} label="CPU" />
          <ArcGauge pct={memPct} color="#00e5ff" size={80} label="MEM" />
          <ArcGauge pct={diskPct} color="#ffaa00" size={80} label="DISK" />
          <ArcGauge pct={Math.min(netDown * 12, 100)} color="#ff3b3b" size={80} label="NET" />
        </div>
 
        <Separator style={{ background: '#0d1a0d' }} />
 
        {/* CPU chart */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#00ff41', letterSpacing: '0.1em' }}>NEURAL PATHWAYS · CPU LOAD</span>
            <span style={{ fontSize: 11, color: '#00ff41', fontVariantNumeric: 'tabular-nums' }}>{Math.round(cpuPct)}%</span>
          </div>
          <div style={{ border: '1px solid #0d1a0d', padding: '4px 0' }}>
            <Sparkline data={cpuHist} color="#00ff41" h={44} />
          </div>
        </div>

        {/* Network chart */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#00e5ff', letterSpacing: '0.1em' }}>II DIGIT TRACK · NETWORK I/O</span>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 11, color: '#00e5ff' }}>↓ {netDown.toFixed(1)} MB/s</span>
              <span style={{ fontSize: 11, color: '#666' }}>↑ {netUp.toFixed(1)} MB/s</span>
            </div>
          </div>
          <div style={{ border: '1px solid #0d1a0d', padding: '4px 0' }}>
            <Sparkline data={netHist} color="#00e5ff" h={44} />
          </div>
        </div>

        {/* Memory progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#666', letterSpacing: '0.1em' }}>MEMORY ALLOCATION</span>
            <span style={{ fontSize: 11, color: '#e8e8e8' }}>{usedGB} / {totalGB} GB</span>
          </div>
          <Progress value={memPct} className="hud-progress" style={{ height: 3, background: '#0d1a0d', borderRadius: 0 }} />
        </div>
 
        {/* Disk progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#666', letterSpacing: '0.1em' }}>DISK CAPACITY</span>
            <span style={{ fontSize: 11, color: '#e8e8e8' }}>{Math.round(diskPct)}%</span>
          </div>
          <div style={{ height: 3, background: '#0d1a0d', position: 'relative' }}>
            <div style={{ height: '100%', width: `${diskPct}%`, background: '#ffaa00', transition: 'width 1s ease' }} />
          </div>
        </div>
      </div>
 
      {/* RIGHT PANEL — SCN_DATA style */}
      <div style={{ background: '#000', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        <div>
          <div style={{ fontSize: 10, color: '#333', marginBottom: 8, letterSpacing: '0.1em' }}>SCN_DATA_SYS</div>
          <MetricRow num="01" label="CPU LOAD" value={`${Math.round(cpuPct)}%`} pct={cpuPct}
            valueColor={cpuPct > 80 ? '#ff3b3b' : cpuPct > 50 ? '#ffaa00' : '#00ff41'} />
          <MetricRow num="02" label="MEM USED" value={`${Math.round(memPct)}%`} pct={memPct}
            valueColor={memPct > 80 ? '#ff3b3b' : '#00e5ff'} />
          <MetricRow num="03" label="DISK USE" value={`${Math.round(diskPct)}%`} pct={diskPct}
            valueColor="#ffaa00" />
          <MetricRow num="04" label="NET DOWN" value={`${netDown.toFixed(1)}`} pct={Math.min(netDown * 12, 100)}
            valueColor="#00e5ff" />
          <MetricRow num="05" label="NET UP" value={`${netUp.toFixed(1)}`} pct={Math.min(netUp * 20, 100)}
            valueColor="#666" />
          <MetricRow num="06" label="CORES" value={String(stats.cpuCount)} pct={100}
            valueColor="#e8e8e8" />
          <MetricRow num="07" label="UPTIME H" value={String(upH)} pct={Math.min((upH / 24) * 100, 100)}
            valueColor="#e8e8e8" />
          <MetricRow num="08" label="LOAD 1M" value={(stats.loadavg?.[0] ?? 0).toFixed(2)}
            pct={Math.min((stats.loadavg?.[0] ?? 0) * 50, 100)}
            valueColor={(stats.loadavg?.[0] ?? 0) > 1.5 ? '#ff3b3b' : '#00ff41'} />
        </div>

        <Separator style={{ background: '#0d1a0d' }} />

        {/* Patient detail slider style (adapted from the image) */}
        <div>
          <div style={{ fontSize: 10, color: '#333', marginBottom: 8, letterSpacing: '0.1em' }}>_SYS.DETAILS</div>
          {[
            { label: 'MEM.FREE', a: freeGB, b: totalGB, pct: (parseFloat(freeGB) / parseFloat(totalGB)) * 100 },
            { label: 'CPU.PEAK', a: Math.round(cpuPct).toString(), b: '100', pct: cpuPct },
            { label: 'DISK.REM', a: Math.round(100 - diskPct).toString(), b: '100', pct: 100 - diskPct },
          ].map((item) => (
            <div key={item.label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10 }}>
                <span style={{ color: '#444' }}>{item.a}</span>
                <span style={{ color: '#666', letterSpacing: '0.08em' }}>◉ {item.label}</span>
                <span style={{ color: '#444' }}>{item.b}</span>
              </div>
              <div style={{ height: 2, background: '#0d1a0d' }}>
                <div style={{ height: '100%', width: `${item.pct}%`, background: '#00ff41', transition: 'width 1s ease' }} />
              </div>
            </div>
          ))}
        </div>
 
        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 9, color: '#333', letterSpacing: '0.08em', textAlign: 'right' }}>
            OP.MODE TACTICAL
          </div>
          <div style={{ fontSize: 9, color: '#1a4a1a', letterSpacing: '0.08em', textAlign: 'right', marginTop: 2 }}>
            CONFIDENTIAL
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ SCREEN II — PROCESSES ═══════════════════ */
function ScreenProcesses({ procs }: { procs: ProcEntry[] }) {
  const sorted = [...procs].sort((a, b) => b.cpu - a.cpu);
  const topCPU = sorted[0]?.cpu ?? 1;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 220px',
        gap: 1,
        height: '100%',
        background: '#0d1a0d',
      }}
    >
      {/* Process list */}
      <div style={{ background: '#000', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
        <SectionHeader title="ACTIVE.PROCESSES" />
        <div style={{ display: 'flex', gap: 8, marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #0d1a0d', fontSize: 10, color: '#333' }}>
          <span style={{ width: 16 }}>#</span>
          <span style={{ flex: 1 }}>PROCESS.NAME</span>
          <span style={{ width: 50 }}>PID</span>
          <span style={{ width: 48 }}>BAR</span>
          <span style={{ width: 42, textAlign: 'right' }}>CPU</span>
          <span style={{ width: 42, textAlign: 'right' }}>MEM</span>
        </div>
        <ScrollArea style={{ flex: 1 }}>
          {sorted.map((p, i) => (
            <ProcRow key={p.pid} proc={p} rank={i + 1} />
          ))}
        </ScrollArea>
      </div>

      {/* CPU usage breakdown */}
      <div style={{ background: '#000', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionHeader title="CPU.ALLOCATION" />
        {sorted.slice(0, 8).map((p) => (
          <div key={p.pid}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10 }}>
              <span style={{ color: '#666', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              <span style={{ color: p.cpu > 50 ? '#ff3b3b' : p.cpu > 20 ? '#ffaa00' : '#00ff41', fontVariantNumeric: 'tabular-nums' }}>
                {p.cpu.toFixed(1)}%
              </span>
            </div>
            <div style={{ height: 2, background: '#0d1a0d' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(p.cpu / topCPU) * 100}%`,
                  background: p.cpu > 50 ? '#ff3b3b' : p.cpu > 20 ? '#ffaa00' : '#00ff41',
                  transition: 'width 0.8s ease',
                }}
              />
            </div>
          </div>
        ))}

        <Separator style={{ background: '#0d1a0d', marginTop: 4 }} />
          <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
            <div className="data-row"><span className="data-key">TOTAL PROCS</span><span className="data-val green">{procs.length}</span></div>
          </div>
          <div className="data-row"><span className="data-key">TOP CPU</span><span className="data-val" style={{ color: topCPU > 50 ? '#ff3b3b' : '#00ff41' }}>{sorted[0]?.name ?? '-'}</span></div>
          <div className="data-row"><span className="data-key">TOP MEM</span><span className="data-val" style={{ color: (sorted[0]?.mem ?? 0) > 100 ? '#ff3b3b' : '#00ff41' }}>{(sorted[0]?.mem ?? 0).toFixed(0)}MB</span></div>
        </div>
      </div>
  );
}



/* ══════════════════ SCREEN III — NETWORK ═══════════════════ */
function ScreenNetwork({
  netDown, netUp, diskRead, diskWrite,
  netHist, diskReadHist, diskWriteHist,
  diskPct,
}: {
  netDown: number; netUp: number; diskRead: number; diskWrite: number;
  netHist: number[]; diskReadHist: number[]; diskWriteHist: number[];
  diskPct: number;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        height: '100%',
        background: '#0d1a0d',
      }}
    >
      {/* Network */}
      <div style={{ background: '#000', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionHeader title="NETWORK.IO" />

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, border: '1px solid #0d1a0d', padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: '#00e5ff', letterSpacing: '0.08em', marginBottom: 4 }}>DOWNLOAD</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#00e5ff', fontVariantNumeric: 'tabular-nums' }}>{netDown.toFixed(1)}</div>
            <div style={{ fontSize: 10, color: '#444' }}>MB/S</div>
          </div>
          <div style={{ flex: 1, border: '1px solid #0d1a0d', padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: '#666', letterSpacing: '0.08em', marginBottom: 4 }}>UPLOAD</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#666', fontVariantNumeric: 'tabular-nums' }}>{netUp.toFixed(1)}</div>
            <div style={{ fontSize: 10, color: '#444' }}>MB/S</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: '#00e5ff', letterSpacing: '0.1em', marginBottom: 4 }}>NEURAL PATHWAYS · DOWNLOAD TRACE</div>
          <div style={{ border: '1px solid #0d1a0d', padding: '4px 0' }}>
            <Sparkline data={netHist} color="#00e5ff" h={50} />
          </div>
        </div>

        <div>
          <SectionHeader title="NET.STATS" />
          <div className="data-row"><span className="data-key">PROTOCOL</span><span className="data-val green">TCP/IP</span></div>
          <div className="data-row"><span className="data-key">STATE</span><span className="data-val green">CONNECTED</span></div>
          <div className="data-row"><span className="data-key">PEAK DOWN</span><span className="data-val">{Math.max(...netHist, 0).toFixed(1)} MB/S</span></div>
          <div className="data-row"><span className="data-key">SIGNAL</span><span className="data-val green">98.4%</span></div>
        </div>
      </div>

      {/* Disk */}
      <div style={{ background: '#000', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionHeader title="DISK.IO" />

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, border: '1px solid #0d1a0d', padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: '#ffaa00', letterSpacing: '0.08em', marginBottom: 4 }}>READ</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#ffaa00', fontVariantNumeric: 'tabular-nums' }}>{diskRead}</div>
            <div style={{ fontSize: 10, color: '#444' }}>MB/S</div>
          </div>
          <div style={{ flex: 1, border: '1px solid #0d1a0d', padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: '#00ff41', letterSpacing: '0.08em', marginBottom: 4 }}>WRITE</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#00ff41', fontVariantNumeric: 'tabular-nums' }}>{diskWrite}</div>
            <div style={{ fontSize: 10, color: '#444' }}>MB/S</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: '#ffaa00', letterSpacing: '0.1em', marginBottom: 4 }}>II DIGIT TRACK · READ TRACE</div>
          <div style={{ border: '1px solid #0d1a0d', padding: '4px 0' }}>
            <Sparkline data={diskReadHist} color="#ffaa00" h={50} />
          </div>
        </div>

        <div>
          <SectionHeader title="DISK.CAPACITY" />
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
              <span style={{ color: '#666' }}>USED</span>
              <span style={{ color: '#e8e8e8' }}>{Math.round(diskPct)}%</span>
            </div>
            <div style={{ height: 3, background: '#0d1a0d' }}>
              <div style={{ height: '100%', width: `${diskPct}%`, background: '#ffaa00', transition: 'width 1s ease' }} />
            </div>
          </div>
          <div className="data-row"><span className="data-key">FILESYSTEM</span><span className="data-val">NTFS</span></div>
          <div className="data-row"><span className="data-key">TOTAL</span><span className="data-val">512 GB</span></div>
          <div className="data-row"><span className="data-key">FREE</span><span className="data-val green">{Math.round(512 * (1 - diskPct / 100))} GB</span></div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════ SCREEN IV — SYSTEM INFO ══════════════════ */
function ScreenSysInfo({ stats, cpuPct }: { stats: SystemStats; cpuPct: number}) {
  const memPct = ((stats.totalMemory - stats.freeMemory) / stats.totalMemory) * 100;
  const totalGB = (stats.totalMemory / 1024 ** 3).toFixed(0);
  const usedGB = ((stats.totalMemory - stats.freeMemory) / 1024 ** 3).toFixed(1);
  const upH = Math.floor(stats.uptime / 3600);
  const upM = Math.floor((stats.uptime % 3600) / 60);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 1,
        height: '100%',
        background: '#0d1a0d',
      }}
    >
      {/* System */}
      <div style={{ background: '#000', padding: '12px 14px' }}>
        <SectionHeader title="SYS.ENVIRONMENT" />
        <div className="data-row"><span className="data-key">OS</span><span className="data-val">WINDOWS 11</span></div>
        <div className="data-row"><span className="data-key">KERNEL</span><span className="data-val">10.0.22631</span></div>
        <div className="data-row"><span className="data-key">PLATFORM</span><span className="data-val">{String(stats.platform).toUpperCase()}</span></div>
        <div className="data-row"><span className="data-key">ARCH</span><span className="data-val">{String(stats.arch).toUpperCase()}</span></div>
        <div className="data-row"><span className="data-key">HOSTNAME</span><span className="data-val green">{stats.hostname || 'NODE-001'}</span></div>
        <div className="data-row"><span className="data-key">CPU CORES</span><span className="data-val">{stats.cpuCount}</span></div>
        <div className="data-row"><span className="data-key">TOTAL MEM</span><span className="data-val">{totalGB} GB DDR5</span></div>
        <div className="data-row"><span className="data-key">UPTIME</span><span className="data-val">{upH}H {upM}M</span></div>

        <div style={{ marginTop: 16 }}>
          <SectionHeader title="SYS.STATUS" />
          <div className="data-row"><span className="data-key">HEALTH</span><span className="data-val green">● NOMINAL</span></div>
          <div className="data-row"><span className="data-key">THERMAL</span><span className="data-val green">● NORMAL</span></div>
          <div className="data-row"><span className="data-key">SECURITY</span><span className="data-val green">● SECURED</span></div>
          <div className="data-row"><span className="data-key">NETWORK</span><span className="data-val green">● ONLINE</span></div>
        </div>
      </div>

      {/* CPU Details */}
      <div style={{ background: '#000', padding: '12px 14px' }}>
        <SectionHeader title="CPU.DETAILS" />
        <div className="data-row"><span className="data-key">PROCESSOR</span><span className="data-val">INTEL i9</span></div>
        <div className="data-row"><span className="data-key">PHYSICAL</span><span className="data-val">8 CORES</span></div>
        <div className="data-row"><span className="data-key">LOGICAL</span><span className="data-val">{stats.cpuCount}</span></div>
        <div className="data-row"><span className="data-key">BASE CLOCK</span><span className="data-val">3.60 GHZ</span></div>
        <div className="data-row"><span className="data-key">TURBO</span><span className="data-val green">5.00 GHZ</span></div>
        <div className="data-row"><span className="data-key">CACHE L3</span><span className="data-val">12 MB</span></div>
        <div className="data-row"><span className="data-key">TDP</span><span className="data-val">65W</span></div>
        <div className="data-row"><span className="data-key">CURRENT LOAD</span><span className="data-val" style={{ color: cpuPct > 80 ? '#ff3b3b' : cpuPct > 50 ? '#ffaa00' : '#00ff41'}}>
          {Math.round(cpuPct)}%
          </span>
          </div>
          
          <div style={{ marginTop: 16 }}>
          <SectionHeader title="MEM.DETAILS" />
          <div className="data-row"><span className="data-key">TOTAL</span><span className="data-val">{totalGB} GB</span></div>
          <div className="data-row"><span className="data-key">USED</span><span className="data-val">{usedGB} GB</span></div>
          <div className="data-row"><span className="data-key">FREE</span><span className="data-val green">{(stats.freeMemory / 1024 ** 3).toFixed(1)} GB</span></div>
          <div className="data-row"><span className="data-key">USAGE</span>
            <span className="data-val" style={{ color: memPct > 80 ? '#ff3b3b' : '#00e5ff' }}>
              {Math.round(memPct)}%
            </span>
          </div>
          <div className="data-row"><span className="data-key">TYPE</span><span className="data-val">DDR5-5600</span></div>
        </div>
      </div>

      {/* Runtime */}
      <div style={{ background: '#000', padding: '12px 14px' }}>
        <SectionHeader title="RUNTIME.LOG" />
        {[
          { t: '00:01', e: 'SYSTEM BOOT', c: '#00ff41' },
          { t: '00:03', e: 'NET INTERFACE UP', c: '#00ff41' },
          { t: '00:05', e: 'MONITOR INIT', c: '#00ff41' },
          { t: '00:08', e: 'IPC CHANNEL OPEN', c: '#00ff41' },
          { t: '00:12', e: 'DATA STREAM LIVE', c: '#00ff41' },
          { t: '—', e: 'POLLING 1000MS', c: '#666' },
          { t: '—', e: 'AWAITING INPUT...', c: '#333' },
        ].map((log, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, paddingBottom: 5, borderBottom: '1px solid #060906', marginBottom: 5, fontSize: 10 }}>
            <span style={{ color: '#333', flexShrink: 0, width: 36 }}>{log.t}</span>
            <span style={{ color: log.c }}>» {log.e}</span>
          </div>
        ))}

        <div style={{ marginTop: 12 }}>
          <SectionHeader title="DIAGNOSTICS" />
          <div className="data-row"><span className="data-key">SIGNAL STR.</span><span className="data-val green">98.4%</span></div>
          <div className="data-row"><span className="data-key">LATENCY IDX</span><span className="data-val">12 MS</span></div>
          <div className="data-row"><span className="data-key">CONF. LEVEL</span><span className="data-val green">96.2%</span></div>
          <div className="data-row"><span className="data-key">ANOMALY SCR</span><span className="data-val green">0.18</span></div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════ ROOT APP ═══════════════════════════ */
const SCREENS = ['I', 'II', 'III', 'IV'] as const;
const SCREEN_LABELS = ['SYS.OVERVIEW', 'PROC.LIST', 'NET>IO', 'SYS.INFO'];

const INITIAL_PROCS: ProcEntry[] = [
  { name: 'electron.exe', pid: 4821, cpu: 18.2, mem: 320 },
  { name: 'chrome.exe',   pid: 3201, cpu: 12.7, mem: 512 },
  { name: 'node.exe',     pid: 5512, cpu: 9.3,  mem: 148 },
  { name: 'vscode.exe',   pid: 2209, cpu: 6.1,  mem: 280 },
  { name: 'python.exe',   pid: 6603, cpu: 4.4,  mem: 90  },
  { name: 'teams.exe',    pid: 7710, cpu: 3.8,  mem: 420 },
  { name: 'discord.exe',  pid: 8812, cpu: 2.9,  mem: 210 },
  { name: 'explorer.exe', pid: 1102, cpu: 1.2,  mem: 65  },
  { name: 'antivirus.exe',pid: 920,  cpu: 0.8,  mem: 180 },
  { name: 'svchost.exe',  pid: 408,  cpu: 0.5,  mem: 44  },
];

const App: React.FC = () => {
  const [screen, setScreen] = useState(0);
  const [time, setTime]     = useState('');
  const [stats, setStats]   = useState<SystemStats>({
    cpuLoad: 35, totalMemory: 17179869184, freeMemory: 5905580032,
    uptime: 7200, platform: 'win32', arch: 'x64', cpuCount: 8,
    hostname: 'SYS-NODE-001', loadavg: [0.72, 0.65, 0.58],
  });
  const [cpuPct,  setCpuPct]  = useState(35);
  const [cpuHist, setCpuHist] = useState<number[]>([]);
  const [netDown, setNetDown] = useState(2.4);
  const [netUp,   setNetUp]   = useState(0.6);
  const [netHist, setNetHist] = useState<number[]>([]);
  const [diskRead,  setDiskRead]  = useState(48);
  const [diskWrite, setDiskWrite] = useState(22);
  const [diskReadHist,  setDiskReadHist]  = useState<number[]>([]);
  const [diskWriteHist, setDiskWriteHist] = useState<number[]>([]);
  const [diskPct] = useState(73.4);
  const [procs, setProcs] = useState<ProcEntry[]>(INITIAL_PROCS);

  // Swipe
  const startX  = useRef(0);
  const dragging = useRef(false);
  const onPointerDown = (x: number) => { startX.current = x; dragging.current = true; };
  const onPointerUp   = (x: number) => {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = x - startX.current;
    if (dx < -50 && screen < 3) setScreen(s => s + 1);
    else if (dx > 50 && screen > 0) setScreen(s => s - 1);
  };

  // Tick
  useEffect(() => {
    const tick = async () => {
      // Try electron IPC, fall back to simulation
      let newStats = stats;
      try {
        newStats = await (window as any).electronAPI.getSystemStats();
        setStats(prev => ({ ...prev, ...newStats }));
      } catch {
        setStats(prev => ({ ...prev, uptime: prev.uptime + 1 }));
      }

      const rawCPU = newStats.cpuLoad ?? (30 + Math.sin(Date.now() / 3000) * 25 + Math.random() * 15);
      setCpuPct(prev => prev * 0.85 + rawCPU * 0.15);
      setCpuHist(h => [...h.slice(-49), rawCPU]);

      const nd = parseFloat((Math.random() * 9).toFixed(1));
      const nu = parseFloat((Math.random() * 2.5).toFixed(1));
      const dr = Math.round(Math.random() * 180);
      const dw = Math.round(Math.random() * 90);

      setNetDown(nd); setNetUp(nu);
      setDiskRead(dr); setDiskWrite(dw);
      setNetHist(h => [...h.slice(-49), nd]);
      setDiskReadHist(h => [...h.slice(-49), dr]);
      setDiskWriteHist(h => [...h.slice(-49), dw]);

      setProcs(p =>
        p.map(proc => ({
          ...proc,
          cpu: Math.max(0.1, Math.min(95, proc.cpu + (Math.random() - 0.48) * 5)),
          mem: Math.max(20, Math.min(600, proc.mem + (Math.random() - 0.5) * 10)),
        }))
      );

      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="monitor-wrap"
      style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}
      onMouseDown={e => onPointerDown(e.clientX)}
      onMouseUp={e => onPointerUp(e.clientX)}
      onTouchStart={e => onPointerDown(e.touches[0].clientX)}
      onTouchEnd={e => onPointerUp(e.changedTouches[0].clientX)}
    >
      {/* ── Scanlines overlay ── */}
      <div className="scanlines" />

      {/* ── Top status bar ── */}
      <div className="status-bar">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span>SYS.ID <span style={{ color: '#00ff41' }}>9·410:002</span></span>
          <span>STATUS <span className="online">ONLINE</span></span>
          <span>UPLINK: <span className="secure">SECURE</span></span>
        </div>
        <span style={{ color: '#333', letterSpacing: '0.2em', fontSize: 11 }}>
          ADVANCED DIAGNOSTIC INTERFACE · SYSTEM NODE
        </span>
        <div style={{ display: 'flex', gap: 24 }}>
          <span>OP.MODE <span style={{ color: '#00ff41' }}>TACTICAL</span></span>
          <span style={{ color: '#444' }}>{time || '--:--:--'}</span>
        </div>
      </div>

      {/* ── Screen content ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            width: '400%',
            height: '100%',
            transform: `translateX(-${screen * 25}%)`,
            transition: 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)',
          }}
        >
          <div style={{ width: '25%', height: '100%', flexShrink: 0 }}>
            <ScreenOverview stats={stats} cpuPct={cpuPct} cpuHist={cpuHist}
              netDown={netDown} netUp={netUp} netHist={netHist} diskPct={diskPct} />
          </div>
          <div style={{ width: '25%', height: '100%', flexShrink: 0 }}>
            <ScreenProcesses procs={procs} />
          </div>
          <div style={{ width: '25%', height: '100%', flexShrink: 0 }}>
            <ScreenNetwork netDown={netDown} netUp={netUp} diskRead={diskRead}
              diskWrite={diskWrite} netHist={netHist} diskReadHist={diskReadHist}
              diskWriteHist={diskWriteHist} diskPct={diskPct} />
          </div>
          <div style={{ width: '25%', height: '100%', flexShrink: 0 }}>
            <ScreenSysInfo stats={stats} cpuPct={cpuPct} />
          </div>
        </div>
      </div>

      {/* ── Bottom nav tabs (Roman numeral style) ── */}
      <div style={{ borderTop: '1px solid #0d1a0d', background: '#000', flexShrink: 0 }}>
        {/* Timeline bar (colorful dots like in the image) */}
        <div className="timeline-bar">
          {Array.from({ length: 60 }).map((_, i) => {
            const colors = ['#00ff41', '#00e5ff', '#ffaa00', '#ff3b3b', '#666'];
            const isActive = Math.random() < 0.15;
            return (
              <React.Fragment key={i}>
                {i > 0 && <div className="tl-line" />}
                <div
                  className="tl-dot"
                  style={{ background: isActive ? colors[i % colors.length] : '#111', opacity: isActive ? 1 : 0.3 }}
                />
              </React.Fragment>
            );
          })}
        </div>

        {/* Screen tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 6, gap: 0 }}>
          {SCREENS.map((num, i) => (
            <React.Fragment key={num}>
              <div className={`screen-tab ${i === screen ? 'active' : ''}`} onClick={() => setScreen(i)}>
                {num}
                {i === screen && (
                  <div style={{ fontSize: 9, color: '#1a4a1a', letterSpacing: '0.1em', marginTop: 1 }}>
                    {SCREEN_LABELS[i]}
                  </div>
                )}
              </div>
              {i < SCREENS.length - 1 && (
                <div style={{ width: 1, height: 20, background: '#0d1a0d' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Bottom-right CONFIDENTIAL ── */}
      <div
        style={{
          position: 'fixed', bottom: 8, right: 12,
          fontSize: 9, color: '#1a2a1a',
          letterSpacing: '0.15em', pointerEvents: 'none',
        }}
      >
        CONFIDENTIAL
      </div>
    </div>
  );
};

export default App;
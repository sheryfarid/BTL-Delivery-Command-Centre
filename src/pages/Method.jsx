import React from 'react';
import { useStore } from '../store.jsx';
import { Panel, WaveRail } from '../ui.jsx';
import { PHASES, PHASE_META, DESIGN_AREAS, TEST_LAYERS, GATE_DECISIONS } from '../methodology.js';

export default function Method() {
  return (
    <div className="stack">
      <div className="page-h"><div><h1>One delivery method for every project</h1><p className="muted">Discovery is the only extra step, and only external client projects use it. Everything else is the same wave, and the Gate closes every wave.</p></div></div>
      <Panel title="External client project"><WaveRail project={{ kind: 'external' }} wave={{ phase: null, completedPhases: [], status: 'active' }} /></Panel>
      <Panel title="Internal BTL delivery" sub="Skips Discovery because the platform, systems and data are already known. Each release runs the wave from Design and the partners sign the gate."><WaveRail project={{ kind: 'internal' }} wave={{ phase: null, completedPhases: [], status: 'active' }} /></Panel>
      <div className="method-grid">
        {PHASES.map((ph) => {
          const m = PHASE_META[ph];
          return (
            <section key={ph} className="method">
              <h3>{m.label}</h3>
              <p className="small">{m.purpose}</p>
              <p className="small muted">{m.duration}</p>
              <p className="small"><strong>Output.</strong> {m.output}</p>
              <p className="small"><strong>Exit check.</strong> {m.exit}</p>
              <p className="small muted"><strong>Internal.</strong> {m.internal}</p>
            </section>
          );
        })}
      </div>
      <div className="grid-3">
        <Panel title="Design pack">{DESIGN_AREAS.map(([k, l, d]) => <p key={k} className="small"><strong>{l}.</strong> {d}</p>)}</Panel>
        <Panel title="Six layers of testing">{TEST_LAYERS.map(([k, l, d]) => <p key={k} className="small"><strong>{l}.</strong> {d}</p>)}</Panel>
        <Panel title="Three possible gate decisions">{Object.values(GATE_DECISIONS).map((d) => <p key={d.label} className="small"><strong>{d.label}.</strong> {d.text}.</p>)}</Panel>
      </div>
    </div>
  );
}

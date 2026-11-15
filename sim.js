// Dust Collection Explorer: the simulator (no graphics). One state machine for the wall controls, starters, Eatons,
// locks, blast gates, Flamex panels, motor levels, and the guided tour's states and actions (tour.json).
// app.js wires it to the 3D view; tools/test_sim.mjs drives it in node.
//   const SM = createSim(CT, SC, hooks)   hooks: say, renderAll, playClunk, playHiss, buildLockVisual, sparkInZone, now
export function createSim(CT, SC, hooks = {}) {
  const nop = () => {};
  const H = { say: nop, renderAll: nop, playClunk: nop, playHiss: nop, buildLockVisual: nop, sparkInZone: () => false, now: () => 0, ...hooks };
  const SM = { fl: null };
  const S = {}; // the state the procedures read
  function freshState() {
    const eaton = {}, starter = {};
    for (const c of CT.controls) {
      if (c.type === 'eaton') eaton[c.id] = { on: true, locked: false, lock: null };
      if (c.type === 'starter') starter[c.id] = false;
    }
    return {
      eaton, starter, airlockBox: !!CT.behavior.airlock_box_default_on,
      motor: { fan: { running: false, level: 0 }, blower: { running: false, level: 0 }, airlock: { running: false, level: 0 } },
      gates: { CNC1: false, CNC2: false, EB1: false, EB2: false, PanelSaw: false },
      air: { on: true, locked: false, lock: null },
      valve: { valve_A: { open: true, locked: false, lock: null }, valve_B: { open: true, locked: false, lock: null } },
      hatch: { hatch_cnc: { open: false, cleaned: false }, hatch_window: { open: false, cleaned: false }, hatch_riser: { open: false, cleaned: false } },
      bucket: { placed: false }, hose: { connected: true },
      flamex: { A: fxZone(), B: fxZone() }
    };
  }
  function fxZone() { return { key: 0, fire: false, cause: 0, buzzer: false, horns: false, extOff: false, spray: 0, sprayed: 0, lamp: 0, msgT: null, by: null }; }
  Object.assign(S, freshState());
  const CTL = Object.fromEntries(CT.controls.map(c => [c.id, c]));
  const MSG = CT.messages;

  const listeners = [];
  function emit(ev) { for (const f of listeners) f(ev); }
  function result(ctl, act, code, value, extra = {}) {
    const ev = { ctl, act, code, value, ok: !/^(locked_out|no_power|needs_key|reset_cause|reset_spray|eaton_locked|lock_needs_off|no_air|air_locked|hatch_closed|bypass_no_trip|nothing_to_reset|airlock_box_off|not_simulated)$/.test(code || ''), t: H.now(), ...extra };
    emit(ev);
    return ev;
  }
  function motorPowered(m) {
    const d = CT.motors[m];
    return S.eaton[d.inside_eaton].on && S.eaton[d.outside_eaton].on;
  }
  function motorLocked(m) {
    const d = CT.motors[m];
    return S.eaton[d.inside_eaton].locked || S.eaton[d.outside_eaton].locked;
  }
  function updateMotors() {
    for (const [m, d] of Object.entries(CT.motors)) {
      const run = motorPowered(m) && S.starter[d.starter] && (!d.enable || S.airlockBox);
      S.motor[m].running = run;
    }
  }
  function pressStarter(id, act) {
    const c = CTL[id], m = c.motor, d = CT.motors[m];
    if (act === 'stop') { S.starter[id] = false; if (d.enable) S.airlockBox = false; updateMotors(); H.say(MSG.stopped); return result(id, 'stop', 'stopped'); }
    // locked out: nothing starts, the starter does not pull in
    if (motorLocked(m)) { H.say(MSG.locked_out, 'bad'); return result(id, 'start', 'locked_out'); }
    // start: control power comes through the inside feeder Eaton
    if (!S.eaton[d.inside_eaton].on) { H.say(S.eaton[d.inside_eaton].locked ? MSG.locked_out : MSG.no_power, 'bad'); return result(id, 'start', S.eaton[d.inside_eaton].locked ? 'locked_out' : 'no_power'); }
    S.starter[id] = true; if (d.enable) S.airlockBox = true; updateMotors(); // the airlock box only shows ON/OFF; starter 1 runs the airlock (Wes 11-15)
    if (!S.eaton[d.outside_eaton].on) {
      H.say(S.eaton[d.outside_eaton].locked ? MSG.locked_out : MSG.no_power, 'bad');
      return result(id, 'start', S.eaton[d.outside_eaton].locked ? 'locked_out' : 'no_power');
    }
    H.say(MSG.started, 'ok');
    return result(id, 'start', 'started');
  }
  function pressAirlockBox(act) {
    S.airlockBox = act === 'on'; updateMotors();
    return result('airlock_box', act, act === 'on' ? 'started' : 'stopped');
  }
  function setEaton(id, on) {
    const e = S.eaton[id], c = CTL[id];
    if (on && e.locked) { H.say(MSG.eaton_locked, 'bad'); return result(id, 'on', 'eaton_locked'); }
    if (e.on === on) return result(id, on ? 'on' : 'off', 'same');
    e.on = on;
    if (!on && c.where === 'inside' && CT.behavior.inside_eaton_off_drops_starter) for (const s of c.feeds) S.starter[s] = false;
    const before = Object.fromEntries(Object.keys(CT.motors).map(m => [m, S.motor[m].running]));
    updateMotors();
    if (on && c.where === 'outside' && CT.behavior.outside_reclose_restarts_if_starter_latched) {
      for (const m of c.motors) if (!before[m] && S.motor[m].running) H.say(MSG.restarted_warn, 'bad');
    }
    H.playClunk();
    return result(id, on ? 'on' : 'off', on ? 'on' : 'off');
  }
  function lockable(id) { return S.eaton[id] || (id === 'air_valve' ? S.air : S.valve[id]); }
  function isOffForLock(id) { if (S.eaton[id]) return !S.eaton[id].on; if (id === 'air_valve') return !S.air.on; if (S.valve[id]) return !S.valve[id].open; return false; }
  function applyLock(id, tag) {
    const L = lockable(id);
    if (!isOffForLock(id)) { H.say(MSG.lock_needs_off, 'bad'); return result(id, 'lock', 'lock_needs_off'); }
    L.locked = true; L.lock = tag; H.say(MSG.lock_on, 'ok'); H.buildLockVisual(id); H.renderAll();
    return result(id, 'lock', 'locked');
  }
  function removeLock(id) {
    const L = lockable(id); if (!L.locked) return result(id, 'unlock', 'same');
    L.locked = false; L.lock = null; H.say(MSG.lock_off); H.buildLockVisual(id); H.renderAll();
    return result(id, 'unlock', 'unlocked');
  }
  function setGate(g, open) {
    if (!S.air.on) { H.say(MSG.no_air, 'bad'); return result('gate_panel', open ? 'open' : 'close', 'no_air', g); }
    S.gates[g] = open; H.playHiss();
    H.say(open ? MSG.gate_open : MSG.gate_closed, open ? 'ok' : '');
    return result('gate_panel', open ? 'open' : 'close', open ? 'open' : 'closed', g);
  }
  function setAir(on) {
    if (on && S.air.locked) { H.say(MSG.air_locked, 'bad'); return result('air_valve', 'on', 'air_locked'); }
    S.air.on = on; H.say(on ? MSG.air_on : MSG.air_off);
    return result('air_valve', on ? 'on' : 'off', on ? 'on' : 'off');
  }
  function setValve(id, open) {
    const v = S.valve[id];
    if (open && v.locked) { H.say(MSG.eaton_locked, 'bad'); return result(id, 'open', 'eaton_locked'); }
    v.open = open; H.say(open ? MSG.valve_open : MSG.valve_closed_water, open ? '' : 'ok');
    return result(id, open ? 'open' : 'close', open ? 'open' : 'closed');
  }
  function toggleHatch(id) {
    const h = S.hatch[id];
    if (!h.open) { h.open = true; H.say(MSG.hatch_open); }
    else { h.open = false; h.cleaned = true; H.say(MSG.hatch_closed_ok, 'ok'); }
    return result(id, h.open ? 'open' : 'close', h.open ? 'open' : 'closed');
  }
  function shine(zone) {
    const c = CTL[CT.flamex.panels[zone].detector_hatch];
    const z = S.flamex[zone];
    if (!S.hatch[c.id].open) { H.say(MSG.hatch_closed, 'bad'); return result('panel_' + zone, 'light', 'hatch_closed'); }
    H.say(MSG.light_on);
    SM.fl = { zone, t: 1.4 };
    if (z.key === 1 && CT.flamex.key_1_bypasses_trip) { H.say(MSG.bypass_no_trip, 'bad'); return result('panel_' + zone, 'light', 'bypass_no_trip'); }
    z.cause = Math.max(z.cause, 1.4);
    trip(zone, 'light');
    return result('panel_' + zone, 'light', 'tripped');
  }
  function trip(zone, by) {
    const z = S.flamex[zone];
    if (z.key === 1 && CT.flamex.key_1_bypasses_trip) return false;
    const was = z.fire;
    z.fire = true; z.buzzer = true; z.horns = true; z.extOff = false; z.by = by;
    z.spray = CT.flamex.spray_until_reset ? 1e9 : Math.max(z.spray, CT.flamex.spray_time_s); z.sprayed = 0; // this site: until reset
    if (!was) { z.msgT = new Date(); z.detectT = H.now(); H.say(MSG.tripped, 'bad'); }
    result('panel_' + zone, 'trip', 'tripped', by);
    H.renderAll();
    return true;
  }
  function fxButton(zone, btn) {
    const z = S.flamex[zone], P = 'panel_' + zone;
    switch (btn) {
      case 'key': z.key = z.key ? 0 : 1; H.renderAll(); return result(P, 'key', 'key' + z.key, z.key);
      case 'int': z.buzzer = false; H.say(MSG.int_ok); H.renderAll(); return result(P, 'int', 'int');
      case 'ext':
        if (z.key !== 1) { H.say(MSG.needs_key, 'bad'); return result(P, 'ext', 'needs_key'); }
        z.extOff = !z.extOff; if (z.extOff) z.horns = false; else if (z.fire) z.horns = true;
        H.say(z.extOff ? MSG.ext_off : MSG.ext_on); H.renderAll(); return result(P, 'ext', z.extOff ? 'ext_off' : 'ext_on');
      case 'lamp': z.lamp = CT.flamex.lamp_test_s; H.say(MSG.lamp_test); return result(P, 'lamp', 'lamp');
      case 'reset':
        if (z.key !== 1) { H.say(MSG.needs_key, 'bad'); return result(P, 'reset', 'needs_key'); }
        if (!z.fire) { H.say(MSG.nothing_to_reset); return result(P, 'reset', 'nothing_to_reset'); }
        if (z.cause > 0 || H.sparkInZone(zone) || hatchLightOpen(zone)) { H.say(MSG.reset_cause, 'bad'); return result(P, 'reset', 'reset_cause'); }
        if (z.spray > 0 && z.sprayed < CT.flamex.reset_block_s) { H.say(MSG.reset_spray, 'bad'); return result(P, 'reset', 'reset_spray'); }
        Object.assign(z, { fire: false, buzzer: false, horns: false, extOff: false, spray: 0, by: null });
        H.say(MSG.reset_ok, 'ok'); H.renderAll(); return result(P, 'reset', 'reset_ok');
      default: H.say(MSG.not_simulated); return result(P, btn, 'not_simulated');
    }
  }
  function hatchLightOpen(zone) { const id = CT.flamex.panels[zone].detector_hatch; return S.hatch[id].open; }

  // ---- motor and gate levels (spin up / coast down; gates slide)
  const LV = { fan: 0, blower: 0, airlock: 0 };
  const gateLv = { CNC1: 0, CNC2: 0, EB1: 0, EB2: 0, PanelSaw: 0 };
  function stepLevels(dt) {
    updateMotors();
    for (const [m, d] of Object.entries(CT.motors)) {
      const tgt = S.motor[m].running ? 1 : 0;
      if (LV[m] < tgt) LV[m] = Math.min(1, LV[m] + dt / d.spin_up_s);
      else if (LV[m] > tgt) LV[m] = Math.max(0, LV[m] - dt / d.coast_down_s);
      S.motor[m].level = LV[m];
    }
    for (const g of Object.keys(gateLv)) {
      const tgt = S.gates[g] ? 1 : 0, sp = dt / (CT.gate_panel.move_s || 0.6);
      if (gateLv[g] !== tgt) gateLv[g] = gateLv[g] < tgt ? Math.min(1, gateLv[g] + sp) : Math.max(0, gateLv[g] - sp);
    }
  }
  function stepFlamex(dt) {
    for (const z of ['A', 'B']) {
      const Z = S.flamex[z];
      if (Z.cause > 0) Z.cause = Math.max(0, Z.cause - dt);
      if (Z.lamp > 0) Z.lamp = Math.max(0, Z.lamp - dt);
      if (Z.spray > 0) { Z.spray = Math.max(0, Z.spray - dt); Z.sprayed += dt; if (Z.spray === 0) H.renderAll(); }
    }
    if (SM.fl) { SM.fl.t -= dt; if (SM.fl.t <= 0) SM.fl = null; }
  }
  function systemOn() {
    let blocked = false;
    for (const [m, d] of Object.entries(CT.motors)) {
      if (motorLocked(m) || !motorPowered(m)) { blocked = true; continue; }
      S.starter[d.starter] = true;
    }
    S.airlockBox = true;
    if (S.air.on) for (const g of SC.presets.system_on_like_video.gates_open) S.gates[g] = true;
    updateMotors();
    if (blocked) H.say(MSG.locked_out, 'bad');
    result('system', 'on', 'started');
    H.renderAll();
  }
  function systemOff() {
    for (const d of Object.values(CT.motors)) S.starter[d.starter] = false;
    for (const g of Object.keys(S.gates)) S.gates[g] = false;
    updateMotors(); result('system', 'off', 'stopped'); H.renderAll();
  }
  // ---- tour states and actions (tour.json)
  // state: { fresh, starters: [ids on], airlock_box, gates: [open], instant }  fresh = Eatons on and unlocked, Flamex normal
  function applyState(st, instant = st.instant !== false) {
    if (st.fresh) {
      const f = freshState();
      for (const k of ['eaton', 'air', 'valve', 'hatch', 'bucket', 'hose', 'flamex']) S[k] = f[k];
    }
    if (st.starters) for (const id of Object.keys(S.starter)) S.starter[id] = st.starters.includes(id);
    if (st.airlock_box !== undefined) S.airlockBox = !!st.airlock_box;
    if (st.gates) for (const g of Object.keys(S.gates)) S.gates[g] = st.gates.includes(g);
    updateMotors();
    if (instant) {
      for (const m of Object.keys(LV)) { LV[m] = S.motor[m].running ? 1 : 0; S.motor[m].level = LV[m]; }
      for (const g of Object.keys(gateLv)) gateLv[g] = S.gates[g] ? 1 : 0;
    }
    H.renderAll();
  }
  // action: { do: 'starter', id, act } | { do: 'airlock_box', act } | { do: 'gate', id, open } | { do: 'eaton', id, on }
  //         | { do: 'fx', zone, btn } | { do: 'state', state } | { do: 'system', on }
  // does the live state already include a tour state (everything it runs is running, every gate it opens is open)?
  function hasState(st) {
    if (!st) return true;
    if (st.starters && !st.starters.every(id => S.starter[id])) return false;
    if (st.airlock_box && !S.airlockBox) return false;
    if (st.gates && !st.gates.every(g => S.gates[g])) return false;
    return true;
  }
  function act(a, states = {}) {
    switch (a.do) {
      case 'starter': return pressStarter(a.id, a.act || 'start');
      case 'airlock_box': return pressAirlockBox(a.act || 'on');
      case 'gate': if (a.id === '*') { for (const g of Object.keys(S.gates)) if (S.gates[g] !== (a.open !== false)) setGate(g, a.open !== false); return null; } return setGate(a.id, a.open !== false);
      case 'eaton': return setEaton(a.id, a.on !== false);
      case 'fx': return fxButton(a.zone, a.btn);
      case 'state': return applyState(typeof a.state === 'string' ? states[a.state] : a.state, a.instant);
      case 'system': return a.on ? systemOn() : systemOff();
      default: return null;
    }
  }
  Object.assign(SM, { S, CTL, MSG, listeners, emit, result, motorPowered, motorLocked, updateMotors, pressStarter, pressAirlockBox,
    setEaton, lockable, isOffForLock, applyLock, removeLock, setGate, setAir, setValve, toggleHatch, shine, trip, fxButton,
    hatchLightOpen, freshState, fxZone, LV, gateLv, stepLevels, stepFlamex, systemOn, systemOff, applyState, hasState, act });
  return SM;
}

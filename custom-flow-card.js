class CustomFlowCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("custom-flow-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:custom-flow-card",
      title: "V-Guard Inverter Flow",
      entities: {
        grid_power: "sensor.inverter_in_1_power",
        inverter_output_power: "sensor.inverter_out_power",
        load_power: "sensor.inverter_out_power",
        grid_current: "sensor.shellyplus2pm_b0b21c108704_output_0_current",
        grid_voltage: "sensor.shellyplus2pm_b0b21c108704_output_0_voltage",
        load_current: "sensor.v_guard_inverter_load_current",
        load_voltage: "sensor.shellypmmini_348518e0a2a4_voltage",
        battery_percent: "sensor.v_guard_inverter_battery_percentage",
        battery_voltage: "sensor.v_guard_inverter_battery_voltage",
        solar_current: "sensor.v_guard_inverter_solar_current",
        mains_voltage: "sensor.v_guard_inverter_mains_voltage",
        details_today_energy: "sensor.inverter_out_energy",
        details_grid_energy: "sensor.inverter_in_1_energy",
        details_temperature: "sensor.v_guard_inverter_system_temperature",
        details_power_cuts_today: "sensor.v_guard_inverter_power_cuts_today",
        details_ble_status: "sensor.v_guard_inverter_inverter_ble_status",
        details_battery_remaining: "sensor.v_guard_inverter_battery_remaining",
        details_cutoff_remaining: "sensor.v_guard_inverter_cutoff_remaining",
        details_load_percentage: "sensor.v_guard_inverter_load_percentage",
        details_solar_savings: "sensor.v_guard_inverter_solar_savings_today",
        gateway_status: "sensor.v_guard_inverter_inverter_ble_status"
      },
      grid_online_voltage_min: 90,
      icons: {
        grid: "mdi:transmission-tower",
        inverter: "mdi:power",
        battery: "mdi:battery",
        home: "mdi:home-lightning-bolt",
        solar: "mdi:solar-power"
      },
      appearance: "light"
    };
  }

  setConfig(config) {
    const entities = config.entities || {};
    const hasGridData = Boolean(entities.grid_power) || (Boolean(entities.grid_current) && Boolean(entities.grid_voltage));
    const hasLoadData = Boolean(entities.load_power) || (Boolean(entities.load_current) && Boolean(entities.load_voltage));
    const hasOutputData = Boolean(entities.inverter_output_power) || hasLoadData;

    if (!hasGridData || !hasOutputData) {
      throw new Error(
        "Define grid data (entities.grid_power or entities.grid_current + entities.grid_voltage) and output data (entities.inverter_output_power or load sensors)"
      );
    }

    this._config = {
      title: "Power Flow",
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.content) {
      this.render();
    }
    this.update();
  }

  getCardSize() {
    return 5;
  }

  render() {
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <ha-card>
        <div class="card-header" id="title"></div>
        <div class="status-badge" id="status-badge" hidden>Data source offline</div>
        <div class="wrapper">
          <svg viewBox="0 0 100 100" class="flow-svg" role="img" aria-label="Power flow">
            <defs>
              <marker id="arrow" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="6.2" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 z" fill="var(--flow-arrow)"></path>
              </marker>
            </defs>

            <line id="line-grid-inverter" x1="20" y1="50" x2="50" y2="50" class="flow-line"></line>
            <line id="line-solar-inverter" x1="50" y1="20" x2="50" y2="42" class="flow-line"></line>
            <line id="line-battery-inverter" x1="50" y1="58" x2="50" y2="80" class="flow-line"></line>
            <line id="line-inverter-home" x1="50" y1="50" x2="80" y2="50" class="flow-line"></line>
          </svg>

          <div id="node-grid" class="node node-grid" style="--x:20%;--y:50%;">
            <ha-icon id="icon-grid"></ha-icon>
            <div class="label">Grid</div>
            <div class="value" id="value-grid"></div>
          </div>

          <div id="node-solar" class="node node-solar" style="--x:50%;--y:17%;">
            <ha-icon id="icon-solar"></ha-icon>
            <div class="label">Solar</div>
            <div class="value" id="value-solar"></div>
          </div>

          <div id="node-inverter" class="node node-inverter" style="--x:50%;--y:50%;">
            <ha-icon id="icon-inverter"></ha-icon>
            <div class="label">Inverter</div>
            <div class="value" id="value-inverter"></div>
          </div>

          <div id="node-battery" class="node node-battery" style="--x:50%;--y:83%;">
            <ha-icon id="icon-battery"></ha-icon>
            <div class="label">Battery</div>
            <div class="value" id="value-battery"></div>
          </div>

          <div id="node-home" class="node node-home" style="--x:80%;--y:50%;">
            <ha-icon id="icon-home"></ha-icon>
            <div class="label">Load</div>
            <div class="value" id="value-home"></div>
          </div>
        </div>
        <div class="flow-status" id="flow-status"></div>
        <div class="solar-current-panel" id="solar-current-panel" hidden>
          <div class="solar-current-head">
            <span>Solar current today</span>
            <strong id="solar-current-peak">Peak --</strong>
          </div>
          <svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
            <polyline id="solar-current-line" points="" fill="none"></polyline>
          </svg>
        </div>
        <div class="flow-breakdown">
          <div class="breakdown-item solar"><span>Solar to load</span><strong id="breakdown-solar">--</strong></div>
          <div class="breakdown-item grid"><span>Grid to load</span><strong id="breakdown-grid">--</strong></div>
          <div class="breakdown-item battery"><span>Battery</span><strong id="breakdown-battery">--</strong></div>
        </div>
        <div class="details" id="details-row">
          <div class="detail"><span class="k">Out Today</span><span id="detail-today-energy">--</span></div>
          <div class="detail"><span class="k">Grid Today</span><span id="detail-grid-energy">--</span></div>
          <div class="detail"><span class="k">Temp</span><span id="detail-temp">--</span></div>
          <div class="detail"><span class="k">Cuts</span><span id="detail-cuts">--</span></div>
          <div class="detail"><span class="k">BLE</span><span id="detail-ble">--</span></div>
          <div class="detail"><span class="k">Battery Left</span><span id="detail-battery-remaining">--</span></div>
          <div class="detail"><span class="k">Cutoff Left</span><span id="detail-cutoff-remaining">--</span></div>
          <div class="detail"><span class="k">Load %</span><span id="detail-load-percentage">--</span></div>
          <div class="detail"><span class="k">Solar Today</span><span id="detail-solar-savings">--</span></div>
          <div class="detail"><span class="k">Mains V</span><span id="detail-mains-voltage">--</span></div>
          <div class="detail"><span class="k">Grid Calc</span><span id="detail-grid-calc">--</span></div>
          <div class="detail"><span class="k">Load Calc</span><span id="detail-load-calc">--</span></div>
          <div class="detail"><span class="k">Solar Calc</span><span id="detail-solar-calc">--</span></div>
          <div class="detail"><span class="k">Battery Calc</span><span id="detail-battery-calc">--</span></div>
          <div class="detail"><span class="k">In Power</span><span id="detail-in-power">--</span></div>
          <div class="detail"><span class="k">Out Power</span><span id="detail-out-power">--</span></div>
          <div class="detail"><span class="k">Inv Consumption</span><span id="detail-inverter-consumption">--</span></div>
        </div>
      </ha-card>
      <style>
        :host {
          --flow-node-size: 74px;
          --flow-ok: var(--success-color, #43a047);
          --flow-muted: var(--disabled-color, #8a8a8a);
          --flow-grid: #1e88e5;
          --flow-battery: #8e24aa;
          --flow-home: #fb8c00;
          --flow-solar: #fbc02d;
          --flow-inverter: #3949ab;
          --flow-bg: #f8fafc;
          --flow-text: #25324d;
          --flow-detail-bg: #ffffff;
          --flow-node-bg: #ffffff;
          --flow-border: rgba(76, 94, 124, 0.25);
          --flow-arrow: #1f9d55;
          display: block;
        }

        :host([appearance="dark"]) {
          --flow-bg: #181d29;
          --flow-text: #dbe4f5;
          --flow-detail-bg: #20293a;
          --flow-node-bg: var(--ha-card-background, var(--card-background-color));
          --flow-border: rgba(157, 177, 214, 0.3);
        }

        .card-header {
          font-size: 1.03rem;
          line-height: 1.4rem;
          padding: 14px 16px 0;
          font-weight: 600;
        }

        .status-badge {
          margin: 8px 12px 0;
          padding: 6px 10px;
          border-radius: 8px;
          background: #fff3e0;
          color: #8a4b00;
          border: 1px solid #ffd08a;
          font-size: 0.76rem;
          line-height: 1rem;
        }

        :host([appearance="dark"]) .status-badge {
          background: #402c13;
          color: #ffd18d;
          border-color: #81541f;
        }

        .wrapper {
          position: relative;
          height: 360px;
          padding: 10px;
          overflow: hidden;
          background: var(--flow-bg);
          border-radius: 16px;
          margin: 10px 12px 0;
          border: 1px solid var(--flow-border);
        }

        .flow-svg {
          width: 100%;
          height: 100%;
          opacity: 0.85;
          position: relative;
          z-index: 1;
        }

        .flow-line {
          stroke: var(--line-color, var(--flow-ok));
          stroke-width: 2.35;
          stroke-opacity: 0.9;
          stroke-linecap: round;
          marker-end: url(#arrow);
          transition: opacity 0.25s ease, stroke-width 0.25s ease;
          opacity: 0.18;
          filter: drop-shadow(0 0 2px rgba(31, 157, 85, 0.45));
        }

        .flow-line.active {
          opacity: 0.95;
          stroke-width: 2.7;
          animation: fadePulse 1.2s ease infinite;
        }

        #line-grid-inverter { --line-color: var(--flow-grid); }
        #line-solar-inverter { --line-color: var(--flow-solar); }
        #line-battery-inverter { --line-color: var(--flow-battery); }
        #line-inverter-home { --line-color: var(--flow-home); }

        @keyframes fadePulse {
          0% { opacity: 0.72; }
          50% { opacity: 1; }
          100% { opacity: 0.72; }
        }

        .node {
          position: absolute;
          left: var(--x);
          top: var(--y);
          transform: translate(-50%, -50%);
          z-index: 2;
          width: var(--flow-node-size);
          min-height: var(--flow-node-size);
          border-radius: 50%;
          background: var(--flow-node-bg);
          border: 2px solid var(--flow-border);
          box-shadow: var(--ha-card-box-shadow, none);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 6px;
          box-sizing: border-box;
        }

        .node ha-icon {
          --mdc-icon-size: 20px;
          margin-bottom: 4px;
        }

        .label {
          font-size: 0.74rem;
          line-height: 1rem;
          opacity: 0.85;
          color: var(--flow-text);
        }

        .value {
          font-size: 0.64rem;
          line-height: 0.8rem;
          opacity: 0.95;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 92%;
          color: var(--flow-text);
        }

        .node-grid ha-icon { color: var(--flow-grid); }
        .node-inverter ha-icon { color: var(--flow-inverter); }
        .node-battery ha-icon { color: var(--flow-battery); }
        .node-home ha-icon { color: var(--flow-home); }
        .node-solar ha-icon { color: var(--flow-solar); }

        #value-battery {
          white-space: normal;
        }

        .flow-status {
          margin: 10px 12px 0;
          min-height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-radius: 8px;
          padding: 7px 10px;
          background: var(--flow-detail-bg);
          border: 1px solid var(--flow-border);
          color: var(--flow-text);
          font-size: 0.76rem;
          line-height: 1.2rem;
        }

        .solar-current-panel {
          margin: 8px 12px 0;
          border-radius: 8px;
          border: 1px solid rgba(251, 192, 45, 0.52);
          background: var(--flow-detail-bg);
          color: var(--flow-text);
          padding: 7px 9px;
          box-sizing: border-box;
        }

        .solar-current-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
          font-size: 0.66rem;
          line-height: 0.9rem;
        }

        .solar-current-head span {
          opacity: 0.72;
        }

        .solar-current-head strong {
          font-size: 0.68rem;
          white-space: nowrap;
        }

        .solar-current-panel svg {
          display: block;
          width: 100%;
          height: 28px;
          background: rgba(251, 192, 45, 0.08);
          border-radius: 6px;
        }

        #solar-current-line {
          stroke: var(--flow-solar);
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          vector-effect: non-scaling-stroke;
        }

        .flow-breakdown {
          margin: 8px 12px 0;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .breakdown-item {
          border-radius: 8px;
          border: 1px solid var(--flow-border);
          background: var(--flow-detail-bg);
          color: var(--flow-text);
          padding: 7px 8px;
          min-width: 0;
          text-align: center;
          box-sizing: border-box;
        }

        .breakdown-item span {
          display: block;
          color: var(--flow-text);
          opacity: 0.72;
          font-size: 0.62rem;
          line-height: 0.85rem;
          margin-bottom: 3px;
        }

        .breakdown-item strong {
          display: block;
          font-size: 0.78rem;
          line-height: 1rem;
          color: var(--flow-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .breakdown-item.solar { border-color: rgba(251, 192, 45, 0.55); }
        .breakdown-item.grid { border-color: rgba(30, 136, 229, 0.45); }
        .breakdown-item.battery { border-color: rgba(142, 36, 170, 0.45); }

        .details {
          border-top: 1px solid var(--flow-border);
          margin: 0 12px 12px;
          padding-top: 10px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .detail {
          display: flex;
          flex-direction: column;
          align-items: center;
          border-radius: 8px;
          background: var(--flow-detail-bg);
          border: 1px solid var(--flow-border);
          padding: 7px 6px;
          line-height: 1.15;
        }

        .detail .k {
          font-size: 0.64rem;
          opacity: 0.75;
          margin-bottom: 4px;
          color: var(--flow-text);
        }

        .detail span:last-child {
          font-size: 0.72rem;
          word-break: break-word;
          text-align: center;
          color: var(--flow-text);
        }

        @media (max-width: 480px) {
          :host {
            --flow-node-size: 68px;
          }

          .wrapper {
            height: 292px;
            padding: 8px;
          }

          #node-grid { --x: 16%; --y: 50%; }
          #node-solar { --x: 50%; --y: 18%; }
          #node-inverter { --x: 50%; --y: 50%; }
          #node-battery { --x: 50%; --y: 82%; }
          #node-home { --x: 84%; --y: 50%; }

          .details {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .flow-breakdown {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;

    this.content = root;
  }

  update() {
    if (!this._hass || !this._config || !this.content) {
      return;
    }

    const cfg = this._config;
    this.setAppearance(cfg.appearance || "light");
    const entities = cfg.entities || {};
    const icons = cfg.icons || {};

    this.content.getElementById("title").textContent = cfg.title || "Power Flow";

    const gridResult = this.resolvePowerWithFormula(entities.grid_power, entities.grid_current, entities.grid_voltage, entities.mains_voltage);
    const loadResult = this.resolvePowerWithFormula(entities.load_power, entities.load_current, entities.load_voltage, entities.mains_voltage);
    const rawGridPower = gridResult.power;
    const gridOnline = this.isGridOnline(entities, rawGridPower, cfg.grid_online_voltage_min);
    const inverterOutputResult = this.resolveInverterOutputPower(entities, loadResult);
    const solarResult = this.resolveSolarPower(entities, cfg.grid_online_voltage_min);
    const gridPower = gridOnline ? rawGridPower : 0;
    const inverterOutputPower = inverterOutputResult.power;
    const loadPower = loadResult.power;
    const solarPower = solarResult.power;
    const batteryPercent = this.readNumber(entities.battery_percent);
    const batteryVoltage = this.readNumber(entities.battery_voltage);

    const loadDemand = Number.isFinite(loadPower) && loadPower > 0 ? loadPower : inverterOutputPower;
    const gridSupplyPower = Math.max(0, gridPower);
    const solarSupplyPower = Math.max(0, solarPower);
    const solarToLoad = Math.min(solarSupplyPower, Math.max(0, loadDemand));
    const remainingAfterSolar = Math.max(0, loadDemand - solarToLoad);
    const gridToLoad = gridOnline ? Math.min(gridSupplyPower, remainingAfterSolar) : 0;
    const remainingAfterGrid = Math.max(0, remainingAfterSolar - gridToLoad);
    const batteryToLoad = remainingAfterGrid;
    const batteryPower = loadDemand - gridSupplyPower - solarSupplyPower;
    const batteryChargingPower = Math.max(0, solarSupplyPower + gridSupplyPower - loadDemand);
    const batteryState = batteryPower > 10 ? "discharging" : batteryPower < -10 ? "charging" : "idle";

    this.setIcon("icon-grid", icons.grid || "mdi:transmission-tower");
    this.setIcon("icon-inverter", icons.inverter || "mdi:power");
    this.setIcon("icon-battery", this.pickBatteryIcon(batteryPercent));
    this.setIcon("icon-home", icons.home || "mdi:home-lightning-bolt");
    this.setIcon("icon-solar", icons.solar || "mdi:solar-power");

    this.setText("value-grid", gridOnline ? this.formatPower(gridToLoad) : "Cutoff");
    this.setText("value-inverter", this.formatPower(inverterOutputPower));
    this.setText(
      "value-battery",
      this.formatBatteryNodeValue(batteryState, batteryToLoad, batteryChargingPower, batteryPercent)
    );
    this.setText("value-home", this.formatPower(loadDemand));
    this.setText("value-solar", this.formatPower(solarToLoad));
    this.updateSolarCurrentGraph(entities.solar_current);

    this.setDetails(entities, gridResult, loadResult, solarResult, batteryPower, rawGridPower, inverterOutputPower);
    this.updateGatewayStatus(entities);
    this.updateBreakdown({
      gridOnline,
      solarToLoad,
      gridToLoad,
      batteryToLoad,
      batteryChargingPower,
      batteryState,
      batteryPercent
    });
    this.updateFlowStatus({
      gridOnline,
      gridPower,
      solarPower,
      batteryPower,
      batteryState,
      loadDemand,
      solarToLoad,
      gridToLoad,
      batteryToLoad,
      batteryChargingPower
    });

    this.applyFlow("line-grid-inverter", gridOnline && gridToLoad > 5, gridPower < 0);
    this.applyFlow("line-solar-inverter", solarPower > 5, false);

    if (batteryState === "charging") {
      this.applyFlow("line-battery-inverter", true, false);
    } else if (batteryState === "discharging") {
      this.applyFlow("line-battery-inverter", true, true);
    } else {
      this.applyFlow("line-battery-inverter", false, false);
    }

    this.applyFlow("line-inverter-home", loadDemand > 5, false);
  }

  readState(entityId) {
    if (!entityId || !this._hass.states[entityId]) {
      return null;
    }
    return this._hass.states[entityId];
  }

  setAppearance(mode) {
    if (!this.content) return;
    const host = this.content.host;
    if (!host) return;
    if (mode === "dark") {
      host.setAttribute("appearance", "dark");
    } else {
      host.removeAttribute("appearance");
    }
  }

  setDetails(entities, gridResult, loadResult, solarResult, batteryPower, inverterInputPower, inverterOutputPower) {
    this.setText("detail-today-energy", this.formatStateValue(entities.details_today_energy));
    this.setText("detail-grid-energy", this.formatStateValue(entities.details_grid_energy));
    this.setText("detail-temp", this.formatStateValue(entities.details_temperature));
    this.setText("detail-cuts", this.formatStateValue(entities.details_power_cuts_today));
    this.setText("detail-ble", this.formatStateValue(entities.details_ble_status));
    this.setText("detail-battery-remaining", this.formatStateValue(entities.details_battery_remaining));
    this.setText("detail-cutoff-remaining", this.formatStateValue(entities.details_cutoff_remaining));
    this.setText("detail-load-percentage", this.formatStateValue(entities.details_load_percentage));
    this.setText("detail-solar-savings", this.formatStateValue(entities.details_solar_savings));
    this.setText("detail-mains-voltage", this.formatStateValue(entities.mains_voltage));
    this.setText("detail-grid-calc", gridResult?.formulaText || "direct");
    this.setText("detail-load-calc", loadResult?.formulaText || "direct");
    this.setText("detail-solar-calc", solarResult?.formulaText || "direct");
    this.setText("detail-battery-calc", this.formatBatteryPower(batteryPower));
    this.setText("detail-in-power", this.formatPower(inverterInputPower));
    this.setText("detail-out-power", this.formatPower(inverterOutputPower));
    this.setText("detail-inverter-consumption", this.formatInverterConsumption(inverterInputPower, inverterOutputPower));
  }

  async updateSolarCurrentGraph(entityId) {
    const panel = this.content.getElementById("solar-current-panel");
    if (!panel || !entityId || !this._hass?.callApi) {
      if (panel) panel.hidden = true;
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cacheKey = `${entityId}|${today.toISOString().slice(0, 10)}`;
    const now = Date.now();

    if (this._solarCurrentGraph?.key === cacheKey && now - this._solarCurrentGraph.fetchedAt < 5 * 60 * 1000) {
      this.renderSolarCurrentGraph(this._solarCurrentGraph.samples);
      return;
    }

    if (this._solarCurrentGraphPending === cacheKey) {
      return;
    }
    this._solarCurrentGraphPending = cacheKey;

    try {
      const start = encodeURIComponent(today.toISOString());
      const end = encodeURIComponent(new Date().toISOString());
      const entity = encodeURIComponent(entityId);
      const history = await this._hass.callApi(
        "GET",
        `history/period/${start}?filter_entity_id=${entity}&end_time=${end}&minimal_response=1&significant_changes_only=0`
      );
      const raw = Array.isArray(history) && Array.isArray(history[0]) ? history[0] : [];
      const samples = raw
        .map((point) => ({
          value: Number(point.state ?? point.s),
          time: point.last_changed || point.last_updated || point.lu || point.lc
        }))
        .filter((point) => Number.isFinite(point.value) && point.time);

      const current = this.readNumber(entityId);
      if (Number.isFinite(current)) {
        samples.push({ value: current, time: new Date().toISOString() });
      }

      this._solarCurrentGraph = { key: cacheKey, fetchedAt: now, samples };
      this.renderSolarCurrentGraph(samples);
    } catch (_err) {
      panel.hidden = true;
    } finally {
      this._solarCurrentGraphPending = "";
    }
  }

  renderSolarCurrentGraph(samples) {
    const panel = this.content.getElementById("solar-current-panel");
    const line = this.content.getElementById("solar-current-line");
    if (!panel || !line || !Array.isArray(samples) || samples.length < 2) {
      if (panel) panel.hidden = true;
      return;
    }

    const values = samples.map((sample) => Math.max(0, sample.value));
    const max = Math.max(...values);
    if (!Number.isFinite(max) || max <= 0) {
      panel.hidden = true;
      return;
    }

    const points = values
      .map((value, index) => {
        const x = samples.length === 1 ? 0 : (index / (samples.length - 1)) * 100;
        const y = 26 - (value / max) * 23;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    line.setAttribute("points", points);

    const peakIndex = values.indexOf(max);
    const peakTime = this.formatTime(samples[peakIndex]?.time);
    this.setText("solar-current-peak", `Peak ${max.toFixed(2)} A${peakTime ? ` at ${peakTime}` : ""}`);
    panel.hidden = false;
  }

  updateBreakdown({ gridOnline, solarToLoad, gridToLoad, batteryToLoad, batteryChargingPower, batteryState, batteryPercent }) {
    this.setText("breakdown-solar", this.formatPower(solarToLoad));
    this.setText("breakdown-grid", gridOnline ? this.formatPower(gridToLoad) : "Cutoff");

    const percent = this.safePercent(batteryPercent);
    if (batteryState === "charging") {
      this.setText("breakdown-battery", `${this.formatPower(batteryChargingPower)} charging | ${percent}`);
      return;
    }
    if (batteryToLoad > 5) {
      this.setText("breakdown-battery", `${this.formatPower(batteryToLoad)} discharging | ${percent}`);
      return;
    }
    this.setText("breakdown-battery", `Idle | ${percent}`);
  }

  updateFlowStatus({ gridOnline, gridPower, solarPower, batteryPower, batteryState, loadDemand, solarToLoad, gridToLoad, batteryToLoad, batteryChargingPower }) {
    const node = this.content.getElementById("flow-status");
    if (!node) return;

    const sources = [];
    if (solarToLoad > 5) {
      sources.push(`Solar ${this.formatPower(solarToLoad)}`);
    }
    if (gridOnline && gridToLoad > 5) {
      sources.push(`Grid ${this.formatPower(gridToLoad)}`);
    }
    if (batteryToLoad > 5) {
      sources.push(`Battery ${this.formatPower(batteryToLoad)}`);
    }

    const prefix = !gridOnline ? "Mains cutoff | " : "";

    if (batteryState === "charging") {
      node.textContent = `${prefix}${sources.join(" + ") || "Supply"} -> Load ${this.formatPower(loadDemand)} | Battery charging ${this.formatPower(batteryChargingPower)}`;
      return;
    }

    if (sources.length) {
      node.textContent = `${prefix}${sources.join(" + ")} -> Load ${this.formatPower(loadDemand)}`;
      return;
    }

    node.textContent = gridOnline ? "No active load flow detected" : "Mains cutoff | Waiting for solar or battery flow";
  }

  formatStateValue(entityId) {
    const state = this.readState(entityId);
    if (!state) {
      return "--";
    }

    const unit = state.attributes.unit_of_measurement || "";
    const value = state.state;
    if (!unit) {
      return value;
    }
    return `${value} ${unit}`;
  }

  updateGatewayStatus(entities) {
    const badge = this.content.getElementById("status-badge");
    if (!badge) return;
    const state = this.readState(entities.gateway_status);
    if (!state) {
      badge.hidden = true;
      return;
    }
    const val = String(state.state || "").toLowerCase();
    const offline = ["offline", "off", "unavailable", "unknown"].includes(val);
    badge.hidden = !offline;
    badge.textContent = offline ? `Data source offline (${state.state})` : "";
  }

  readNumber(entityId) {
    const state = this.readState(entityId);
    if (!state) {
      return NaN;
    }
    return Number(state.state);
  }

  readPower(entityId) {
    const state = this.readState(entityId);
    if (!state) {
      return 0;
    }

    const value = Number(state.state);
    if (!Number.isFinite(value)) {
      return 0;
    }

    const unit = state.attributes.unit_of_measurement || "";
    if (unit.toLowerCase() === "kw") {
      return value * 1000;
    }
    return value;
  }

  resolveInverterOutputPower(entities, loadResult) {
    if (entities.inverter_output_power) {
      return {
        power: this.readPower(entities.inverter_output_power),
        formulaText: "direct power sensor"
      };
    }
    return {
      power: loadResult.power,
      formulaText: loadResult.formulaText || "derived from load"
    };
  }

  resolveSolarPower(entities, gridOnlineVoltageMin) {
    if (entities.solar_power) {
      return {
        power: this.readPower(entities.solar_power),
        formulaText: "direct power sensor"
      };
    }

    const current = this.readNumber(entities.solar_current);
    const voltageChoice = this.pickSolarVoltage(entities, gridOnlineVoltageMin);

    if (!Number.isFinite(current) || !Number.isFinite(voltageChoice.value)) {
      return { power: 0, formulaText: "" };
    }
    return {
      power: current * voltageChoice.value,
      formulaText: `${current.toFixed(2)}A x ${voltageChoice.value.toFixed(0)}V${voltageChoice.label ? ` ${voltageChoice.label}` : ""}`
    };
  }

  pickSolarVoltage(entities, gridOnlineVoltageMin) {
    const directSolarVoltage = this.readNumber(entities.solar_voltage);
    if (Number.isFinite(directSolarVoltage) && directSolarVoltage > 0) {
      return { value: directSolarVoltage, label: "solar" };
    }

    const threshold = Number.isFinite(Number(gridOnlineVoltageMin)) ? Number(gridOnlineVoltageMin) : 90;
    const mainsVoltage = this.readNumber(entities.mains_voltage);
    if (Number.isFinite(mainsVoltage) && mainsVoltage >= threshold) {
      return { value: mainsVoltage, label: "mains" };
    }

    const gridVoltage = this.readNumber(entities.grid_voltage);
    if (!Number.isFinite(mainsVoltage) && Number.isFinite(gridVoltage) && gridVoltage >= threshold) {
      return { value: gridVoltage, label: "grid" };
    }

    const batteryVoltage = this.readNumber(entities.battery_voltage);
    if (Number.isFinite(batteryVoltage) && batteryVoltage > 0) {
      return { value: batteryVoltage, label: "battery" };
    }

    if (Number.isFinite(mainsVoltage) && mainsVoltage > 0) {
      return { value: mainsVoltage, label: "low mains" };
    }

    if (Number.isFinite(gridVoltage) && gridVoltage > 0) {
      return { value: gridVoltage, label: "low grid" };
    }

    return { value: NaN, label: "" };
  }

  resolvePowerWithFormula(powerEntity, currentEntity, voltageEntity, fallbackVoltageEntity) {
    if (powerEntity) {
      return {
        power: this.readPower(powerEntity),
        formulaText: "direct power sensor"
      };
    }

    const current = this.readNumber(currentEntity);
    const voltage = this.pickBestVoltage([voltageEntity, fallbackVoltageEntity]);

    if (!Number.isFinite(current) || !Number.isFinite(voltage)) {
      return { power: 0, formulaText: "" };
    }

    return {
      power: current * voltage,
      formulaText: `${current.toFixed(2)}A x ${voltage.toFixed(0)}V`
    };
  }

  isGridOnline(entities, gridPower, minVoltage) {
    const threshold = Number.isFinite(Number(minVoltage)) ? Number(minVoltage) : 90;
    const mainsVoltage = this.readNumber(entities.mains_voltage);

    if (Number.isFinite(mainsVoltage)) {
      return mainsVoltage >= threshold;
    }

    const gridVoltage = this.readNumber(entities.grid_voltage);
    if (Number.isFinite(gridVoltage)) {
      return gridVoltage >= threshold;
    }

    return Math.abs(gridPower) > 5;
  }

  pickBestVoltage(entityIds) {
    for (const entityId of entityIds) {
      const value = this.readNumber(entityId);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }
    return NaN;
  }

  formatNodeValue(power, formulaText) {
    const powerText = this.formatPower(power);
    if (!formulaText) return powerText;
    return `${powerText} | ${formulaText}`;
  }

  safePercent(value) {
    if (!Number.isFinite(value)) {
      return "--%";
    }
    const bounded = Math.max(0, Math.min(100, Math.round(value)));
    return `${bounded}%`;
  }

  pickBatteryIcon(percent) {
    if (!Number.isFinite(percent)) {
      return "mdi:battery-unknown";
    }
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    if (p >= 95) return "mdi:battery";
    if (p >= 85) return "mdi:battery-90";
    if (p >= 75) return "mdi:battery-80";
    if (p >= 65) return "mdi:battery-70";
    if (p >= 55) return "mdi:battery-60";
    if (p >= 45) return "mdi:battery-50";
    if (p >= 35) return "mdi:battery-40";
    if (p >= 25) return "mdi:battery-30";
    if (p >= 15) return "mdi:battery-20";
    if (p >= 5) return "mdi:battery-10";
    return "mdi:battery-outline";
  }

  setIcon(id, icon) {
    const node = this.content.getElementById(id);
    if (node) {
      node.icon = icon;
    }
  }

  setText(id, text) {
    const node = this.content.getElementById(id);
    if (node) {
      node.textContent = text;
    }
  }

  formatPower(value) {
    if (!Number.isFinite(value)) {
      return "--";
    }

    const abs = Math.abs(value);
    if (abs >= 1000) {
      return `${(value / 1000).toFixed(2)} kW`;
    }
    return `${Math.round(value)} W`;
  }

  formatTime(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  formatBatteryPower(value) {
    if (!Number.isFinite(value)) {
      return "--";
    }
    if (value > 10) {
      return `discharging ${this.formatPower(value)}`;
    }
    if (value < -10) {
      return `charging ${this.formatPower(Math.abs(value))}`;
    }
    return "idle";
  }

  formatInverterConsumption(inputPower, outputPower) {
    if (!Number.isFinite(inputPower) || !Number.isFinite(outputPower)) {
      return "--";
    }
    const consumption = inputPower - outputPower;
    if (consumption > 10) {
      return this.formatPower(consumption);
    }
    if (outputPower > inputPower + 10) {
      return "0 W (backup)";
    }
    return "0 W";
  }

  formatBatteryNodeValue(batteryState, batteryToLoad, batteryChargingPower, batteryPercent) {
    const percent = this.safePercent(batteryPercent);
    if (batteryState === "discharging" && batteryToLoad > 5) {
      return `${this.formatPower(batteryToLoad)} out | ${percent}`;
    }
    if (batteryState === "charging" && batteryChargingPower > 5) {
      return `${this.formatPower(batteryChargingPower)} in | ${percent}`;
    }
    return percent;
  }

  applyFlow(id, active, reverse) {
    const line = this.content.getElementById(id);
    if (!line) {
      return;
    }
    if (!line.dataset.baseX1) {
      line.dataset.baseX1 = line.getAttribute("x1");
      line.dataset.baseY1 = line.getAttribute("y1");
      line.dataset.baseX2 = line.getAttribute("x2");
      line.dataset.baseY2 = line.getAttribute("y2");
    }

    const x1 = line.dataset.baseX1;
    const y1 = line.dataset.baseY1;
    const x2 = line.dataset.baseX2;
    const y2 = line.dataset.baseY2;
    line.setAttribute("x1", reverse ? x2 : x1);
    line.setAttribute("y1", reverse ? y2 : y1);
    line.setAttribute("x2", reverse ? x1 : x2);
    line.setAttribute("y2", reverse ? y1 : y2);
    line.classList.toggle("active", Boolean(active));
  }
}

class CustomFlowCardEditor extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  setConfig(config) {
    this._config = config;
    this.render();
  }

  render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    const cfg = this._config || {};
    const entities = cfg.entities || {};

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 8px 0 0;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .field {
          display: grid;
          gap: 4px;
        }
        .field label {
          font-size: 0.85rem;
          color: var(--secondary-text-color);
        }
        .field input,
        .field select {
          box-sizing: border-box;
          width: 100%;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          color: var(--primary-text-color);
          background: var(--card-background-color);
        }
        ha-entity-picker {
          width: 100%;
        }
        .picker-wrap {
          margin-top: 6px;
        }
        .hint {
          color: var(--secondary-text-color);
          line-height: 1.5;
          font-size: 0.82rem;
          margin-top: 8px;
        }
        .section {
          margin: 6px 0 2px;
          font-size: 0.88rem;
          font-weight: 600;
        }
      </style>
      <div class="grid">
        ${this.field("title", "Title", cfg.title || "V-Guard Inverter Flow")}
        ${this.select("appearance", "Appearance", cfg.appearance || "light", [
          ["light", "Light (default)"],
          ["dark", "Dark"]
        ])}
        ${this.field("grid_online_voltage_min", "Grid Online Voltage Min", cfg.grid_online_voltage_min ?? 90)}

        <div class="section">Flow Entities</div>
        ${this.field("entities.grid_power", "Grid Power (optional direct)", entities.grid_power || "")}
        ${this.field("entities.grid_current", "Grid Current", entities.grid_current || "")}
        ${this.field("entities.grid_voltage", "Grid Voltage", entities.grid_voltage || "")}
        ${this.field("entities.inverter_output_power", "Inverter Output Power (optional direct)", entities.inverter_output_power || "")}
        ${this.field("entities.load_power", "Load Power", entities.load_power || "")}
        ${this.field("entities.load_current", "Load Current", entities.load_current || "")}
        ${this.field("entities.load_voltage", "Load Voltage", entities.load_voltage || "")}
        ${this.field("entities.solar_power", "Solar Power", entities.solar_power || "")}
        ${this.field("entities.solar_current", "Solar Current", entities.solar_current || "")}
        ${this.field("entities.solar_voltage", "Solar Voltage", entities.solar_voltage || "")}
        ${this.field("entities.mains_voltage", "Mains Voltage", entities.mains_voltage || "")}
        ${this.field("entities.battery_percent", "Battery Percentage", entities.battery_percent || "")}
        ${this.field("entities.battery_voltage", "Battery Voltage", entities.battery_voltage || "")}

        <div class="section">Details Strip</div>
        ${this.field("entities.details_today_energy", "Output Energy Today", entities.details_today_energy || "")}
        ${this.field("entities.details_grid_energy", "Grid Energy Today", entities.details_grid_energy || "")}
        ${this.field("entities.details_temperature", "System Temperature", entities.details_temperature || "")}
        ${this.field("entities.details_power_cuts_today", "Power Cuts Today", entities.details_power_cuts_today || "")}
        ${this.field("entities.details_ble_status", "BLE Status", entities.details_ble_status || "")}
        ${this.field("entities.details_battery_remaining", "Battery Remaining", entities.details_battery_remaining || "")}
        ${this.field("entities.details_cutoff_remaining", "Cutoff Remaining", entities.details_cutoff_remaining || "")}
        ${this.field("entities.details_load_percentage", "Load Percentage", entities.details_load_percentage || "")}
        ${this.field("entities.details_solar_savings", "Solar Savings Today", entities.details_solar_savings || "")}
        ${this.field("entities.gateway_status", "Gateway Status (offline detection)", entities.gateway_status || "")}
      </div>
      <div class="hint">
        Tip: use the built-in entity picker under each entity field for reliable selection. You can still switch to YAML mode for advanced icon customization.
      </div>
    `;

    this.shadowRoot.querySelectorAll("input[data-path],select[data-path]").forEach((el) => {
      el.addEventListener("change", (event) => this.handleInput(event));
    });
    this.bindEntityPickers();
  }

  field(path, label, value) {
    return `
      <div class="field">
        <label for="${path}">${label}</label>
        <input id="${path}" data-path="${path}" value="${value}" />
        ${path.startsWith("entities.")
          ? `<div class="picker-wrap"><ha-entity-picker data-picker-path="${path}"></ha-entity-picker></div>`
          : ""}
      </div>
    `;
  }

  select(path, label, value, options) {
    const opts = options
      .map(([v, l]) => `<option value="${v}" ${value === v ? "selected" : ""}>${l}</option>`)
      .join("");
    return `
      <div class="field">
        <label for="${path}">${label}</label>
        <select id="${path}" data-path="${path}">
          ${opts}
        </select>
      </div>
    `;
  }

  handleInput(event) {
    const path = event.target.dataset.path;
    const value = event.target.value.trim();
    const next = structuredClone(this._config || {});

    if (path === "title") {
      next.title = value;
    } else if (path === "appearance") {
      next.appearance = value || "light";
    } else if (path === "grid_online_voltage_min") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        next.grid_online_voltage_min = parsed;
      } else {
        delete next.grid_online_voltage_min;
      }
    } else if (path.startsWith("entities.")) {
      const key = path.replace("entities.", "");
      next.entities = next.entities || {};
      if (value) {
        next.entities[key] = value;
      } else {
        delete next.entities[key];
      }
    }

    this._config = next;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: next },
      bubbles: true,
      composed: true
    }));
  }

  bindEntityPickers() {
    if (!this._hass) return;
    this.shadowRoot.querySelectorAll("ha-entity-picker[data-picker-path]").forEach((picker) => {
      const path = picker.dataset.pickerPath;
      if (!path) return;
      picker.hass = this._hass;
      picker.value = this.getPathValue(path) || "";
      picker.addEventListener("value-changed", (event) => {
        const value = event.detail?.value || "";
        const input = this.shadowRoot.querySelector(`input[data-path="${path}"]`);
        if (input) input.value = value;
        this.handleInput({ target: { dataset: { path }, value } });
      });
    });
  }

  getPathValue(path) {
    if (path === "title") return this._config?.title || "";
    if (path === "grid_online_voltage_min") return this._config?.grid_online_voltage_min ?? "";
    if (!path.startsWith("entities.")) return "";
    const key = path.replace("entities.", "");
    return this._config?.entities?.[key] || "";
  }
}

if (!customElements.get("custom-flow-card-editor")) {
  customElements.define("custom-flow-card-editor", CustomFlowCardEditor);
}

if (!customElements.get("custom-flow-card")) {
  customElements.define("custom-flow-card", CustomFlowCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "custom-flow-card",
  name: "Custom Flow Card",
  description: "Energy style flow card for inverter, grid, battery and load sensors."
});

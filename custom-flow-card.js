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
    return 6;
  }

  render() {
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <ha-card>
        <div class="card-top">
          <div class="card-header" id="title"></div>
          <div class="mode-pill" id="mode-pill">Reading sensors</div>
        </div>
        <div class="status-badge" id="status-badge" hidden>Data source offline</div>
        <div class="power-layout">
          <div class="source-stack">
            <div class="source-card source-grid" id="card-grid">
              <div class="source-head">
                <ha-icon id="icon-grid"></ha-icon>
                <span>Grid / Mains</span>
              </div>
              <div class="source-power" id="value-grid"></div>
              <div class="source-detail" id="detail-grid-role"></div>
              <div class="meter"><span id="bar-grid"></span></div>
            </div>

            <div class="source-card source-solar" id="card-solar">
              <div class="source-head">
                <ha-icon id="icon-solar"></ha-icon>
                <span>Solar</span>
              </div>
              <div class="source-power" id="value-solar"></div>
              <div class="source-detail" id="detail-solar-role"></div>
              <div class="meter"><span id="bar-solar"></span></div>
            </div>

            <div class="source-card source-battery" id="card-battery">
              <div class="source-head">
                <ha-icon id="icon-battery"></ha-icon>
                <span>Battery</span>
              </div>
              <div class="source-power" id="value-battery"></div>
              <div class="source-detail" id="detail-battery-role"></div>
              <div class="meter"><span id="bar-battery"></span></div>
            </div>
          </div>

          <div class="center-story">
            <div class="inverter-chip">
              <ha-icon id="icon-inverter"></ha-icon>
              <div>
                <span class="chip-label">Inverter output</span>
                <strong id="value-inverter"></strong>
              </div>
            </div>
            <div class="flow-status" id="flow-status"></div>
            <div class="flow-list">
              <div class="flow-row" id="row-solar">
                <span class="from">Solar</span><span class="arrow">-></span><span class="to">Load</span><strong id="flow-solar">--</strong>
              </div>
              <div class="flow-row" id="row-grid">
                <span class="from">Grid</span><span class="arrow">-></span><span class="to">Load</span><strong id="flow-grid">--</strong>
              </div>
              <div class="flow-row" id="row-battery">
                <span class="from" id="battery-flow-from">Battery</span><span class="arrow">-></span><span class="to" id="battery-flow-to">Load</span><strong id="flow-battery">--</strong>
              </div>
            </div>
          </div>

          <div class="load-panel">
            <div class="load-icon"><ha-icon id="icon-home"></ha-icon></div>
            <span class="chip-label">Current load</span>
            <strong id="value-home"></strong>
            <div class="load-copy" id="load-copy"></div>
            <div class="meter load-meter"><span id="bar-load"></span></div>
          </div>
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
        </div>
      </ha-card>
      <style>
        :host {
          --flow-ok: var(--success-color, #43a047);
          --flow-muted: var(--disabled-color, #8a8a8a);
          --flow-grid: #2563eb;
          --flow-battery: #8b5cf6;
          --flow-home: #ea580c;
          --flow-solar: #d97706;
          --flow-inverter: #0f766e;
          --flow-bg: #f8fafc;
          --flow-text: #25324d;
          --flow-subtle: #5f6f89;
          --flow-detail-bg: #ffffff;
          --flow-border: rgba(76, 94, 124, 0.25);
          display: block;
        }

        :host([appearance="dark"]) {
          --flow-bg: #181d29;
          --flow-text: #dbe4f5;
          --flow-subtle: #aebbd1;
          --flow-detail-bg: #20293a;
          --flow-border: rgba(157, 177, 214, 0.3);
        }

        ha-card {
          overflow: hidden;
        }

        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 16px 0;
        }

        .card-header {
          font-size: 1.03rem;
          line-height: 1.4rem;
          font-weight: 600;
          color: var(--primary-text-color, var(--flow-text));
        }

        .mode-pill {
          flex: 0 0 auto;
          max-width: 48%;
          border-radius: 999px;
          border: 1px solid var(--flow-border);
          padding: 5px 9px;
          color: var(--flow-text);
          background: var(--flow-detail-bg);
          font-size: 0.68rem;
          line-height: 0.95rem;
          text-align: center;
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

        .power-layout {
          display: grid;
          grid-template-columns: minmax(118px, 0.9fr) minmax(150px, 1.15fr) minmax(118px, 0.9fr);
          gap: 10px;
          align-items: stretch;
          background: var(--flow-bg);
          border-radius: 14px;
          margin: 10px 12px 0;
          padding: 10px;
          border: 1px solid var(--flow-border);
        }

        .source-stack,
        .center-story,
        .load-panel {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .source-card,
        .center-story,
        .load-panel {
          border: 1px solid var(--flow-border);
          border-radius: 8px;
          background: var(--flow-detail-bg);
          color: var(--flow-text);
        }

        .source-card {
          min-height: 86px;
          padding: 9px;
          box-sizing: border-box;
          opacity: 0.72;
          transition: opacity 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }

        .source-card.active {
          opacity: 1;
          transform: translateY(-1px);
        }

        .source-grid.active { border-color: rgba(37, 99, 235, 0.58); }
        .source-solar.active { border-color: rgba(217, 119, 6, 0.58); }
        .source-battery.active { border-color: rgba(139, 92, 246, 0.58); }

        .source-head {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          line-height: 1rem;
          color: var(--flow-subtle);
        }

        .source-head ha-icon {
          --mdc-icon-size: 18px;
        }

        .source-power,
        .load-panel strong,
        .inverter-chip strong {
          display: block;
          margin-top: 6px;
          font-size: 1.08rem;
          line-height: 1.25rem;
          color: var(--flow-text);
        }

        .source-detail,
        .load-copy,
        .chip-label {
          margin-top: 3px;
          font-size: 0.68rem;
          line-height: 0.95rem;
          color: var(--flow-subtle);
        }

        .meter {
          margin-top: 8px;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(100, 116, 139, 0.16);
          overflow: hidden;
        }

        .meter span {
          display: block;
          width: 0%;
          height: 100%;
          border-radius: inherit;
          transition: width 0.25s ease;
        }

        #bar-grid { background: var(--flow-grid); }
        #bar-solar { background: var(--flow-solar); }
        #bar-battery { background: var(--flow-battery); }
        #bar-load { background: var(--flow-home); }

        .source-grid ha-icon { color: var(--flow-grid); }
        .source-solar ha-icon { color: var(--flow-solar); }
        .source-battery ha-icon { color: var(--flow-battery); }
        .load-panel ha-icon { color: var(--flow-home); }
        .inverter-chip ha-icon { color: var(--flow-inverter); }

        .center-story {
          justify-content: space-between;
          padding: 10px;
        }

        .inverter-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--flow-border);
        }

        .inverter-chip ha-icon {
          --mdc-icon-size: 24px;
        }

        .flow-status {
          min-height: 42px;
          padding: 4px 0;
          font-size: 0.84rem;
          line-height: 1.2rem;
          font-weight: 600;
        }

        .flow-list {
          display: grid;
          gap: 6px;
        }

        .flow-row {
          display: grid;
          grid-template-columns: minmax(44px, 1fr) 22px minmax(38px, 1fr) minmax(58px, auto);
          align-items: center;
          gap: 5px;
          min-height: 30px;
          border-radius: 8px;
          padding: 5px 7px;
          background: rgba(100, 116, 139, 0.1);
          color: var(--flow-subtle);
          font-size: 0.7rem;
          line-height: 0.9rem;
          opacity: 0.6;
        }

        .flow-row.active {
          opacity: 1;
          color: var(--flow-text);
        }

        .flow-row .arrow {
          color: var(--flow-ok);
          font-weight: 800;
          text-align: center;
        }

        .flow-row strong {
          font-size: 0.78rem;
          color: var(--flow-text);
          text-align: right;
          white-space: nowrap;
        }

        .load-panel {
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 12px 10px;
        }

        .load-icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(234, 88, 12, 0.12);
        }

        .load-icon ha-icon {
          --mdc-icon-size: 24px;
        }

        .load-meter {
          max-width: 110px;
        }

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
          .card-top {
            align-items: flex-start;
            flex-direction: column;
          }

          .mode-pill {
            max-width: 100%;
          }

          .power-layout {
            grid-template-columns: 1fr;
          }

          .details {
            grid-template-columns: repeat(2, minmax(0, 1fr));
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
    const inverterOutputResult = this.resolveInverterOutputPower(entities, loadResult);
    const solarResult = this.resolveSolarPower(entities);

    const rawGridPower = gridResult.power;
    const gridOnline = this.isGridOnline(entities, rawGridPower, cfg.grid_online_voltage_min);
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

    this.setText("value-grid", this.formatPower(gridPower));
    this.setText("value-inverter", this.formatPower(inverterOutputPower));
    this.setText(
      "value-battery",
      `${this.safePercent(batteryPercent)}${Number.isFinite(batteryVoltage) ? ` | ${batteryVoltage.toFixed(1)}V` : ""}`
    );
    this.setText("value-home", this.formatPower(loadDemand));
    this.setText("value-solar", this.formatPower(solarPower));

    this.setDetails(entities, gridResult, loadResult, solarResult, batteryPower);
    this.updateGatewayStatus(entities);
    this.updatePowerCards({
      gridOnline,
      batteryState,
      batteryPercent,
      batteryVoltage,
      loadDemand,
      loadPower,
      inverterOutputPower,
      solarToLoad,
      gridToLoad,
      batteryToLoad,
      batteryChargingPower
    });
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

  setDetails(entities, gridResult, loadResult, solarResult, batteryPower) {
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
  }

  updatePowerCards({
    gridOnline,
    batteryState,
    batteryPercent,
    batteryVoltage,
    loadDemand,
    loadPower,
    inverterOutputPower,
    solarToLoad,
    gridToLoad,
    batteryToLoad,
    batteryChargingPower
  }) {
    const loadForPercent = Math.max(1, loadDemand || loadPower || inverterOutputPower || 0);
    const sourceMax = Math.max(loadForPercent, gridToLoad, solarToLoad, batteryToLoad, batteryChargingPower);

    this.setText("value-grid", gridOnline ? this.formatPower(gridToLoad) : "0 W");
    this.setText("value-solar", this.formatPower(solarToLoad));
    this.setText("detail-grid-role", gridOnline ? `${this.formatPower(gridToLoad)} feeding load` : "Mains cutoff");
    this.setText("detail-solar-role", solarToLoad > 5 ? `${this.formatPower(solarToLoad)} feeding load` : "No useful solar now");
    this.setText("detail-battery-role", this.describeBatteryRole(batteryState, batteryToLoad, batteryChargingPower, batteryPercent, batteryVoltage));
    this.setText("load-copy", this.describeLoad(loadDemand, solarToLoad, gridToLoad, batteryToLoad));
    this.setText("value-battery", this.formatBatteryTilePower(batteryState, batteryToLoad, batteryChargingPower));

    this.setBar("bar-grid", gridToLoad, sourceMax);
    this.setBar("bar-solar", solarToLoad, sourceMax);
    this.setBar("bar-battery", batteryState === "charging" ? batteryChargingPower : batteryToLoad, sourceMax);
    this.setBar("bar-load", loadDemand, sourceMax);

    this.setActive("card-grid", gridOnline && gridToLoad > 5);
    this.setActive("card-solar", solarToLoad > 5);
    this.setActive("card-battery", batteryToLoad > 5 || batteryChargingPower > 5);
    this.setText("mode-pill", this.describeMode(gridOnline, solarToLoad, gridToLoad, batteryToLoad, batteryChargingPower));

    this.setFlowRow("row-solar", "flow-solar", solarToLoad, solarToLoad > 5);
    this.setFlowRow("row-grid", "flow-grid", gridToLoad, gridOnline && gridToLoad > 5);

    const batteryFlowFrom = this.content.getElementById("battery-flow-from");
    const batteryFlowTo = this.content.getElementById("battery-flow-to");
    if (batteryState === "charging") {
      if (batteryFlowFrom) batteryFlowFrom.textContent = "Surplus";
      if (batteryFlowTo) batteryFlowTo.textContent = "Battery";
      this.setFlowRow("row-battery", "flow-battery", batteryChargingPower, batteryChargingPower > 5);
    } else {
      if (batteryFlowFrom) batteryFlowFrom.textContent = "Battery";
      if (batteryFlowTo) batteryFlowTo.textContent = "Load";
      this.setFlowRow("row-battery", "flow-battery", batteryToLoad, batteryToLoad > 5);
    }

    this.updateFlowStatus({
      gridOnline,
      gridToLoad,
      solarToLoad,
      batteryToLoad,
      batteryChargingPower,
      batteryState,
      loadDemand
    });
  }

  updateFlowStatus({ gridOnline, gridToLoad, solarToLoad, batteryToLoad, batteryChargingPower, batteryState, loadDemand }) {
    const node = this.content.getElementById("flow-status");
    if (!node) return;

    const sources = [];
    if (solarToLoad > 5) {
      sources.push(`solar is giving ${this.formatPower(solarToLoad)}`);
    }
    if (gridOnline && gridToLoad > 5) {
      sources.push(`grid is giving ${this.formatPower(gridToLoad)}`);
    }
    if (batteryToLoad > 5) {
      sources.push(`battery is giving ${this.formatPower(batteryToLoad)}`);
    }

    const prefix = !gridOnline ? "Mains is cut off. " : "";

    if (batteryState === "charging") {
      node.textContent = `${prefix}${sources.join(", ") || "Load is covered"}; extra ${this.formatPower(batteryChargingPower)} is charging the battery.`;
      return;
    }

    if (sources.length) {
      node.textContent = `${prefix}Load needs ${this.formatPower(loadDemand)}; ${sources.join(", ")}.`;
      return;
    }

    node.textContent = gridOnline ? "No active load flow detected." : "Mains is cut off. Waiting for solar or battery flow.";
  }

  describeMode(gridOnline, solarToLoad, gridToLoad, batteryToLoad, batteryChargingPower) {
    if (!gridOnline && solarToLoad > 5 && batteryToLoad > 5) {
      return "Backup: solar + battery";
    }
    if (!gridOnline && batteryToLoad > 5) {
      return "Backup: battery";
    }
    if (!gridOnline && solarToLoad > 5) {
      return "Backup: solar";
    }
    if (batteryChargingPower > 5) {
      return "Battery charging";
    }
    if (solarToLoad > 5 && gridToLoad > 5) {
      return "Solar + grid";
    }
    if (solarToLoad > 5) {
      return "Solar running load";
    }
    if (gridToLoad > 5) {
      return "Grid running load";
    }
    return gridOnline ? "Idle" : "Mains cutoff";
  }

  describeBatteryRole(batteryState, batteryToLoad, batteryChargingPower, batteryPercent, batteryVoltage) {
    const batteryMeta = [
      Number.isFinite(batteryPercent) ? this.safePercent(batteryPercent) : "",
      Number.isFinite(batteryVoltage) ? `${batteryVoltage.toFixed(1)}V` : ""
    ].filter(Boolean).join(" | ");

    if (batteryState === "discharging" && batteryToLoad > 5) {
      return `${this.formatPower(batteryToLoad)} helping load${batteryMeta ? ` | ${batteryMeta}` : ""}`;
    }
    if (batteryState === "charging" && batteryChargingPower > 5) {
      return `${this.formatPower(batteryChargingPower)} charging${batteryMeta ? ` | ${batteryMeta}` : ""}`;
    }
    return `Idle${batteryMeta ? ` | ${batteryMeta}` : ""}`;
  }

  formatBatteryTilePower(batteryState, batteryToLoad, batteryChargingPower) {
    if (batteryState === "discharging" && batteryToLoad > 5) {
      return this.formatPower(batteryToLoad);
    }
    if (batteryState === "charging" && batteryChargingPower > 5) {
      return `+${this.formatPower(batteryChargingPower)}`;
    }
    return "0 W";
  }

  describeLoad(loadDemand, solarToLoad, gridToLoad, batteryToLoad) {
    const parts = [];
    if (solarToLoad > 5) parts.push(`solar ${this.formatPower(solarToLoad)}`);
    if (gridToLoad > 5) parts.push(`grid ${this.formatPower(gridToLoad)}`);
    if (batteryToLoad > 5) parts.push(`battery ${this.formatPower(batteryToLoad)}`);
    if (!parts.length) return "No meaningful consumption right now";
    return `${this.formatPower(loadDemand)} supplied by ${parts.join(" + ")}`;
  }

  setFlowRow(rowId, valueId, power, active) {
    this.setText(valueId, active ? this.formatPower(power) : "0 W");
    this.setActive(rowId, active);
  }

  setBar(id, value, max) {
    const node = this.content.getElementById(id);
    if (!node) return;
    const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    node.style.width = `${percent}%`;
  }

  setActive(id, active) {
    const node = this.content.getElementById(id);
    if (node) {
      node.classList.toggle("active", Boolean(active));
    }
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

  resolveSolarPower(entities) {
    if (entities.solar_power) {
      return {
        power: this.readPower(entities.solar_power),
        formulaText: "direct power sensor"
      };
    }

    const current = this.readNumber(entities.solar_current);
    const solarVoltage = this.pickBestVoltage([
      entities.solar_voltage,
      entities.mains_voltage,
      entities.grid_voltage
    ]);

    if (!Number.isFinite(current) || !Number.isFinite(solarVoltage)) {
      return { power: 0, formulaText: "" };
    }
    return {
      power: current * solarVoltage,
      formulaText: `${current.toFixed(2)}A x ${solarVoltage.toFixed(0)}V`
    };
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

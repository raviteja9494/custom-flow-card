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
        battery_percent: "sensor.v_guard_inverter_battery_percentage",
        battery_voltage: "sensor.v_guard_inverter_battery_voltage",
        solar_current: "sensor.v_guard_inverter_solar_current",
        mains_voltage: "sensor.v_guard_inverter_mains_voltage",
        details_today_energy: "sensor.inverter_out_energy",
        details_grid_energy: "sensor.inverter_in_1_energy",
        details_temperature: "sensor.v_guard_inverter_system_temperature",
        details_power_cuts_today: "sensor.v_guard_inverter_power_cuts_today",
        details_ble_status: "sensor.v_guard_inverter_inverter_ble_status"
      },
      icons: {
        grid: "mdi:transmission-tower",
        inverter: "mdi:power",
        battery: "mdi:battery",
        home: "mdi:home-lightning-bolt",
        solar: "mdi:solar-power"
      }
    };
  }

  setConfig(config) {
    if (!config.entities || !config.entities.grid_power || !config.entities.inverter_output_power) {
      throw new Error("You need to define at least entities.grid_power and entities.inverter_output_power");
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
        <div class="wrapper">
          <svg viewBox="0 0 360 210" class="flow-svg" role="img" aria-label="Power flow">
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="currentColor"></path>
              </marker>
            </defs>

            <line id="line-grid-inverter" x1="78" y1="105" x2="180" y2="105" class="flow-line"></line>
            <line id="line-solar-inverter" x1="180" y1="28" x2="180" y2="85" class="flow-line"></line>
            <line id="line-battery-inverter" x1="180" y1="125" x2="180" y2="185" class="flow-line"></line>
            <line id="line-inverter-home" x1="180" y1="105" x2="282" y2="105" class="flow-line"></line>
          </svg>

          <div id="node-grid" class="node node-grid" style="left:18px;top:75px;">
            <ha-icon id="icon-grid"></ha-icon>
            <div class="label">Grid</div>
            <div class="value" id="value-grid"></div>
          </div>

          <div id="node-solar" class="node node-solar" style="left:145px;top:8px;">
            <ha-icon id="icon-solar"></ha-icon>
            <div class="label">Solar</div>
            <div class="value" id="value-solar"></div>
          </div>

          <div id="node-inverter" class="node node-inverter" style="left:145px;top:75px;">
            <ha-icon id="icon-inverter"></ha-icon>
            <div class="label">Inverter</div>
            <div class="value" id="value-inverter"></div>
          </div>

          <div id="node-battery" class="node node-battery" style="left:145px;top:142px;">
            <ha-icon id="icon-battery"></ha-icon>
            <div class="label">Battery</div>
            <div class="value" id="value-battery"></div>
          </div>

          <div id="node-home" class="node node-home" style="left:272px;top:75px;">
            <ha-icon id="icon-home"></ha-icon>
            <div class="label">Load</div>
            <div class="value" id="value-home"></div>
          </div>
        </div>
        <div class="details" id="details-row">
          <div class="detail"><span class="k">Out Today</span><span id="detail-today-energy">--</span></div>
          <div class="detail"><span class="k">Grid Today</span><span id="detail-grid-energy">--</span></div>
          <div class="detail"><span class="k">Temp</span><span id="detail-temp">--</span></div>
          <div class="detail"><span class="k">Cuts</span><span id="detail-cuts">--</span></div>
          <div class="detail"><span class="k">BLE</span><span id="detail-ble">--</span></div>
        </div>
      </ha-card>
      <style>
        :host {
          --flow-node-size: 70px;
          --flow-ok: var(--success-color, #43a047);
          --flow-muted: var(--disabled-color, #8a8a8a);
          --flow-grid: #1e88e5;
          --flow-battery: #8e24aa;
          --flow-home: #fb8c00;
          --flow-solar: #fbc02d;
          --flow-inverter: #3949ab;
          display: block;
        }

        .card-header {
          font-size: 1.1rem;
          line-height: 1.4rem;
          padding: 16px 16px 0;
          font-weight: 500;
        }

        .wrapper {
          position: relative;
          height: 220px;
          padding: 6px 10px 14px;
          overflow: hidden;
        }

        .flow-svg {
          width: 100%;
          height: 100%;
          color: var(--flow-ok);
          opacity: 0.85;
        }

        .flow-line {
          stroke: currentColor;
          stroke-width: 3.5;
          stroke-linecap: round;
          marker-end: url(#arrow);
          transition: opacity 0.25s ease;
          opacity: 0.2;
        }

        .flow-line.active {
          opacity: 1;
          animation: pulse 1.2s ease infinite;
        }

        .flow-line.reverse {
          marker-end: none;
          marker-start: url(#arrow);
        }

        @keyframes pulse {
          0% { stroke-width: 3.5; }
          50% { stroke-width: 5; }
          100% { stroke-width: 3.5; }
        }

        .node {
          position: absolute;
          width: var(--flow-node-size);
          min-height: var(--flow-node-size);
          border-radius: 50%;
          background: var(--ha-card-background, var(--card-background-color));
          border: 2px solid var(--divider-color, rgba(128, 128, 128, 0.4));
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
          font-size: 0.72rem;
          line-height: 1rem;
          opacity: 0.85;
        }

        .value {
          font-size: 0.66rem;
          line-height: 0.9rem;
          opacity: 0.95;
          word-break: break-word;
        }

        .node-grid ha-icon { color: var(--flow-grid); }
        .node-inverter ha-icon { color: var(--flow-inverter); }
        .node-battery ha-icon { color: var(--flow-battery); }
        .node-home ha-icon { color: var(--flow-home); }
        .node-solar ha-icon { color: var(--flow-solar); }

        .details {
          border-top: 1px solid var(--divider-color, rgba(128, 128, 128, 0.35));
          margin: 0 12px 12px;
          padding-top: 10px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
        }

        .detail {
          display: flex;
          flex-direction: column;
          align-items: center;
          border-radius: 8px;
          background: color-mix(in srgb, var(--ha-card-background, #111) 85%, var(--primary-text-color, #fff) 6%);
          padding: 7px 6px;
          line-height: 1.15;
        }

        .detail .k {
          font-size: 0.64rem;
          opacity: 0.75;
          margin-bottom: 4px;
        }

        .detail span:last-child {
          font-size: 0.72rem;
          word-break: break-word;
          text-align: center;
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
    const entities = cfg.entities || {};
    const icons = cfg.icons || {};

    this.content.getElementById("title").textContent = cfg.title || "Power Flow";

    const gridPower = this.readPower(entities.grid_power);
    const inverterOutputPower = this.readPower(entities.inverter_output_power);
    const loadPower = this.readPower(entities.load_power ?? entities.inverter_output_power);
    const solarPower = this.resolveSolarPower(entities);
    const batteryPercent = this.readNumber(entities.battery_percent);
    const batteryVoltage = this.readNumber(entities.battery_voltage);

    const batteryPower = inverterOutputPower - (gridPower + solarPower);
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
    this.setText("value-home", this.formatPower(loadPower));
    this.setText("value-solar", this.formatPower(solarPower));

    this.setDetails(entities);

    this.applyFlow("line-grid-inverter", Math.abs(gridPower) > 5, gridPower < 0);
    this.applyFlow("line-solar-inverter", solarPower > 5, false);

    if (batteryState === "charging") {
      this.applyFlow("line-battery-inverter", true, false);
    } else if (batteryState === "discharging") {
      this.applyFlow("line-battery-inverter", true, true);
    } else {
      this.applyFlow("line-battery-inverter", false, false);
    }

    this.applyFlow("line-inverter-home", loadPower > 5, false);
  }

  readState(entityId) {
    if (!entityId || !this._hass.states[entityId]) {
      return null;
    }
    return this._hass.states[entityId];
  }

  setDetails(entities) {
    this.setText("detail-today-energy", this.formatStateValue(entities.details_today_energy));
    this.setText("detail-grid-energy", this.formatStateValue(entities.details_grid_energy));
    this.setText("detail-temp", this.formatStateValue(entities.details_temperature));
    this.setText("detail-cuts", this.formatStateValue(entities.details_power_cuts_today));
    this.setText("detail-ble", this.formatStateValue(entities.details_ble_status));
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

  resolveSolarPower(entities) {
    if (entities.solar_power) {
      return this.readPower(entities.solar_power);
    }

    const current = this.readNumber(entities.solar_current);
    const mainsVoltage = this.readNumber(entities.mains_voltage);
    const fallbackVoltage = Number.isFinite(mainsVoltage) ? mainsVoltage : 230;

    if (!Number.isFinite(current)) {
      return 0;
    }
    return current * fallbackVoltage;
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

  applyFlow(id, active, reverse) {
    const line = this.content.getElementById(id);
    if (!line) {
      return;
    }
    line.classList.toggle("active", Boolean(active));
    line.classList.toggle("reverse", Boolean(reverse));
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
    const entityOptions = this.buildEntityOptions();

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
        .field input {
          box-sizing: border-box;
          width: 100%;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          color: var(--primary-text-color);
          background: var(--card-background-color);
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
      <datalist id="entity-list">${entityOptions}</datalist>
      <div class="grid">
        ${this.field("title", "Title", cfg.title || "V-Guard Inverter Flow")}

        <div class="section">Flow Entities</div>
        ${this.field("entities.grid_power", "Grid Power (required)", entities.grid_power || "")}
        ${this.field("entities.inverter_output_power", "Inverter Output Power (required)", entities.inverter_output_power || "")}
        ${this.field("entities.load_power", "Load Power", entities.load_power || "")}
        ${this.field("entities.solar_power", "Solar Power", entities.solar_power || "")}
        ${this.field("entities.solar_current", "Solar Current", entities.solar_current || "")}
        ${this.field("entities.mains_voltage", "Mains Voltage", entities.mains_voltage || "")}
        ${this.field("entities.battery_percent", "Battery Percentage", entities.battery_percent || "")}
        ${this.field("entities.battery_voltage", "Battery Voltage", entities.battery_voltage || "")}

        <div class="section">Details Strip</div>
        ${this.field("entities.details_today_energy", "Output Energy Today", entities.details_today_energy || "")}
        ${this.field("entities.details_grid_energy", "Grid Energy Today", entities.details_grid_energy || "")}
        ${this.field("entities.details_temperature", "System Temperature", entities.details_temperature || "")}
        ${this.field("entities.details_power_cuts_today", "Power Cuts Today", entities.details_power_cuts_today || "")}
        ${this.field("entities.details_ble_status", "BLE Status", entities.details_ble_status || "")}
      </div>
      <div class="hint">
        Tip: values auto-complete from existing entities. You can still switch to YAML mode for advanced icon customization.
      </div>
    `;

    this.shadowRoot.querySelectorAll("input[data-path]").forEach((el) => {
      el.addEventListener("change", (event) => this.handleInput(event));
    });
  }

  field(path, label, value) {
    return `
      <div class="field">
        <label for="${path}">${label}</label>
        <input id="${path}" data-path="${path}" list="entity-list" value="${value}" />
      </div>
    `;
  }

  buildEntityOptions() {
    if (!this._hass || !this._hass.states) {
      return "";
    }

    return Object.keys(this._hass.states)
      .sort()
      .map((entityId) => `<option value="${entityId}"></option>`)
      .join("");
  }

  handleInput(event) {
    const path = event.target.dataset.path;
    const value = event.target.value.trim();
    const next = structuredClone(this._config || {});

    if (path === "title") {
      next.title = value;
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

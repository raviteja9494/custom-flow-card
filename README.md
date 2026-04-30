# Custom Flow Card

Custom Lovelace card for Home Assistant that visualizes inverter power flow in an Energy Dashboard style.

Works well for setups like:

- Grid input power from Shelly device
- Inverter output power from Shelly device
- Battery and solar telemetry from BLE -> ESP32 -> MQTT sensors

## Preview

The card keeps the familiar Home Assistant Energy-style node and arrow flow, with extra labels on each path so it is easier to read.

![Custom Flow Card Preview](./preview.svg)

`preview.svg` is only for README/demo.  
The real card UI is rendered from inline SVG in `custom-flow-card.js`.

## HACS Installation

1. Push this repo to GitHub.
2. In Home Assistant, go to HACS -> Frontend -> Custom repositories.
3. Add your repository URL and category **Dashboard**.
4. Install **Custom Flow Card**.
5. Restart Home Assistant (or reload resources).

The card JS is served from:

- `/hacsfiles/custom-flow-card/custom-flow-card.js`

## Manual Resource (if needed)

In Settings -> Dashboards -> Resources, add:

- URL: `/hacsfiles/custom-flow-card/custom-flow-card.js`
- Type: `JavaScript Module`

## Example Card Config (Your Sensors)

```yaml
type: custom:custom-flow-card
title: V-Guard Inverter Flow
appearance: light
grid_online_voltage_min: 90
entities:
  grid_current: sensor.shellyplus2pm_b0b21c108704_output_0_current
  grid_voltage: sensor.shellyplus2pm_b0b21c108704_output_0_voltage
  inverter_output_power: sensor.inverter_out_power
  load_current: sensor.v_guard_inverter_load_current
  load_voltage: sensor.shellypmmini_348518e0a2a4_voltage
  battery_percent: sensor.v_guard_inverter_battery_percentage
  battery_voltage: sensor.v_guard_inverter_battery_voltage
  solar_current: sensor.v_guard_inverter_solar_current
  mains_voltage: sensor.v_guard_inverter_mains_voltage
  details_today_energy: sensor.inverter_out_energy
  details_grid_energy: sensor.inverter_in_1_energy
  details_temperature: sensor.v_guard_inverter_system_temperature
  details_power_cuts_today: sensor.v_guard_inverter_power_cuts_today
  details_ble_status: sensor.v_guard_inverter_inverter_ble_status
  details_battery_remaining: sensor.v_guard_inverter_battery_remaining
  details_cutoff_remaining: sensor.v_guard_inverter_cutoff_remaining
  details_load_percentage: sensor.v_guard_inverter_load_percentage
  details_solar_savings: sensor.v_guard_inverter_solar_savings_today
  gateway_status: sensor.v_guard_inverter_inverter_ble_status
icons:
  grid: mdi:transmission-tower
  inverter: mdi:power
  battery: mdi:battery
  home: mdi:home-lightning-bolt
  solar: mdi:solar-power
```

## UI-Based Configuration

This card now supports visual editor configuration in Lovelace UI mode.

In **Edit Dashboard -> Add Card -> Custom: Custom Flow Card**, you can set:

- Card title
- Appearance (Light/Dark)
- Grid / inverter / load / solar / battery entities
- Details strip entities (today energy, temperature, cuts, BLE status)

You can still use YAML for advanced keys like custom icons.

## Entity Mapping

- `entities.grid_power` (optional): Direct grid power in W/kW.
- `entities.grid_current` + `entities.grid_voltage` (recommended if no direct power): card computes grid power as `A x V`.
- `entities.inverter_output_power` (optional): Direct inverter output power in W/kW.
- `entities.load_power` (optional): Direct load power in W/kW.
- `entities.load_current` + `entities.load_voltage` (recommended): card computes load power as `A x V`.
- `entities.solar_power` (optional): Direct solar power in W/kW.
- `entities.solar_current` + (`entities.solar_voltage` or `entities.mains_voltage`) (recommended): card computes solar power as `A x V`.
- `entities.battery_percent` (optional): Battery percentage label and icon.
- `entities.battery_voltage` (optional): Extra battery metric label.
- `grid_online_voltage_min` (optional): Voltage threshold for considering grid/mains available. Default is `90`, so mains cutoff hides the grid flow.
- `entities.details_today_energy` (optional): Details strip item, output energy today.
- `entities.details_grid_energy` (optional): Details strip item, grid energy today.
- `entities.details_temperature` (optional): Details strip item, inverter/system temperature.
- `entities.details_power_cuts_today` (optional): Details strip item, power cut count.
- `entities.details_ble_status` (optional): Details strip item, BLE connectivity state.
- `entities.gateway_status` (optional): Shows offline badge when this entity is `offline`, `off`, `unavailable`, or `unknown`.

## Notes

- Card keeps the Energy-style diagram and adds inline flow labels such as `Solar -> Inverter: 420 W`.
- Battery flow direction is inferred from power balance: `load - grid supply - solar supply`.
- When mains voltage is below `grid_online_voltage_min`, the card treats grid as unavailable and can show `Mains cutoff | Load 700 W from solar 420 W + battery 280 W`.
- `kW` values are automatically converted to `W` internally.
- Details show calculation sources such as `2.69A x 230V` so you can verify where the numbers came from.
- Direct power entity is used first when present; formula-based fallback is used when direct power is missing.
- Visual editor now includes HA-native entity picker controls under each entity field for easier selection.
- Default appearance is `light`. Set `appearance: dark` if you prefer dark mode.
- Native Home Assistant Energy Dashboard cannot be directly modified with custom cards; this custom card is the right approach for inverter-specific logic.
- Recommended setup: use this card for inverter-only visualization, and keep overall home energy tracking in Home Assistant Energy Dashboard.

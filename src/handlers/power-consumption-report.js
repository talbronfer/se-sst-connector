const moment = require('moment');
const {housePower} = require('../lib/house-model')
const {solarPower} = require('../lib/solar-model')
const {getPowerMeter, getSolarPanel} = require('../lib/devices')
const { getEnergyDelta, getPowerAverage } = require('../lib/monitoring-api')

/**
 * Send events for the power consumption and energy usage for the house, solar panels, and grid. The power consumption
 * and energy usage are calculated for the period of time specified by the period configuration parameter.
 *
 * @param context - SmartApp context object that encapsulates the client for calling the SmartThings API.
 * @param _ The scheduled event object (unused)
 * @returns {Promise<void>}
 */
module.exports = async (context, _) => {
	let end = moment();
	let energyResponse, powerResponse;
	let start = moment().subtract(15, 'minutes');
	console.log('Starting update...');
	try {
		energyResponse = await getEnergyDelta(start, end);
		powerResponse = await getPowerAverage(start, end);
	}

	catch (e) {
		console.log(e);
	}

	const data = {
		productionEnergyDelta: energyResponse.data.energyDetails.meters.find((i) => i.type == "Production").values[0].value,
		consumptionEnergyDelta: energyResponse.data.energyDetails.meters.find((i) => i.type == "Consumption").values[0].value,
		productionPowerAverage: powerResponse.data.powerDetails.meters.find((i) => i.type == "Production").values[0].value,
		consumptionPowerAverage: powerResponse.data.powerDetails.meters.find((i) => i.type == 'Consumption').values[0].value,
		importEnergyDelta: energyResponse.data.energyDetails.meters.find((i) => i.type == "Purchased").values[0].value,
		importPowerAverage: powerResponse.data.powerDetails.meters.find((i) => i.type == 'Purchased').values[0].value,
		exportEnergyDelta: energyResponse.data.energyDetails.meters.find((i) => i.type == 'FeedIn').values[0].value,
		exportPowerAverage: powerResponse.data.powerDetails.meters.find((i) => i.type == 'FeedIn').values[0].value,
	}

	// Get the house power and solar panel devices, which are created when the app is first installed.
	const [powerMeter, solarPanel] = await Promise.all([
		getPowerMeter(context),
		getSolarPanel(context)
	])

	const [powerMeterStatus, solarPanelStatus] = await Promise.all([
		context.api.devices.getStatus(powerMeter.deviceId),
		context.api.devices.getStatus(solarPanel.deviceId)
	])

	// The house power meter events, with energyMeter and powerConsumptionReport events for the house and grid, as well
	// as the powerMeter event for the house.
	const powerMeterEvents = [
		{
			component: 'main',
			capability: 'powerMeter',
			attribute: 'power',
			value: data.consumptionPowerAverage,
			unit: 'W'
		},
		{
			component: 'main',
			capability: 'energyMeter',
			attribute: 'energy',
			value: powerMeterStatus.components.main.energyMeter.energy.value + data.consumptionEnergyDelta,
			unit: 'kWh'
		},
		{
			component: 'main',
			capability: 'powerConsumptionReport',
			attribute: 'powerConsumption',
			value: {
				power: importPowerAverage,
				energy: powerMeterStatus.components.main.powerConsumptionReport.powerConsumption.value.energy + data.importEnergyDelta,
				deltaEnergy: data.importEnergyDelta,
				start: start.toISOString(),
				end: end.toISOString()
			}
		},
		{
			component: 'component1',
			capability: 'energyMeter',
			attribute: 'energy',
			value: powerMeterStatus.components.component1.energyMeter.energy.value + data.exportEnergyDelta,
			unit: 'kWh'
		},
		{
			component: 'component1',
			capability: 'powerConsumptionReport',
			attribute: 'powerConsumption',
			value: {
				power: data.exportPowerAverage,
				energy: powerMeterStatus.components.component1.powerConsumptionReport.powerConsumption.value.energy + data.exportEnergyDelta,
				deltaEnergy: data.exportEnergyDelta,
				start: start.toISOString(),
				end: end.toISOString()
			}
		},
		{
			component: 'component2',
			capability: 'energyMeter',
			attribute: 'energy',
			value: powerMeterStatus.components.component2.energyMeter.energy.value + data.consumptionEnergyDelta,
			unit: 'kWh'
		},
		{
			component: 'component2',
			capability: 'powerConsumptionReport',
			attribute: 'powerConsumption',
			value: {
				power: data.consumptionPowerAverage,
				energy: powerMeterStatus.components.component2.powerConsumptionReport.powerConsumption.value.energy + data.consumptionEnergyDelta,
				deltaEnergy: data.consumptionEnergyDelta,
				start: start.toISOString(),
				end: end.toISOString()
			}
		}
	]

	// The solar panel events, with powerMeter, energyMeter and powerConsumptionReport capabilities.
	const solarPanelEvents = [
		{
			component: 'main',
			capability: 'powerMeter',
			attribute: 'power',
			value: data.productionPowerAverage,
			unit: 'W'
		},
		{
			component: 'main',
			capability: 'energyMeter',
			attribute: 'energy',
			value: solarPanelStatus.components.main.energyMeter.energy.value + data.productionEnergyDelta,
			unit: 'kWh'
		},
		{
			component: 'main',
			capability: 'powerConsumptionReport',
			attribute: 'powerConsumption',
			value: {
				power: solarWatts,
				energy: (powerMeterStatus.components.main.powerConsumptionReport ?
					powerMeterStatus.components.main.powerConsumptionReport.powerConsumption.value.energy : 0) + data.productionEnergyDelta,
				deltaEnergy: productionEnergyDelta,
				start: start.toISOString(),
				end: end.toISOString()
			}
		}
	]

	// Send the events to SmartThings
	await Promise.all([
		context.api.devices.createEvents(powerMeter.deviceId, powerMeterEvents),
		context.api.devices.createEvents(solarPanel.deviceId, solarPanelEvents)
	])

	console.log(`${end.toISOString()} - ${context.installedAppId}: houseWatts: ${data.consumptionPowerAverage}, solarWatts: ${data.productionPowerAverage}, fromGridWatts: ${data.importEnergyDelta}, toGridWatts: ${dat.exportEnergyDelta}`)
}


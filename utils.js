/*const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const ALLDATA = require('./merged_data.json');
const DIRECTIONS = require('./directions.json');
const INFOS = require('./infos.json');

const all_data = ALLDATA;

function getTripHeadsign(stopName) {
	const tripHeadsigns = [];
	all_data.forEach(item => {
		if (item.stop_name === stopName) {
			tripHeadsigns.push(item.trip_headsign);
		}
	});
	const uniqueTripHeadsigns = tripHeadsigns.filter((value, index, self) => self.indexOf(value) === index);
	uniqueTripHeadsigns.sort();

	return uniqueTripHeadsigns.length ? uniqueTripHeadsigns : ['Stop non trouvé'];
}

function getDirections(stopName) {
	var stop = DIRECTIONS[stopName];
	if(stop == null || stop == undefined)
		return null;
	
	return stop["directions"];
}

function getLines(stopName) {
	var stop = DIRECTIONS[stopName];
	if(stop == null || stop == undefined)
		return null;
	
	return stop["lines"];
}

function getAllStops() {
	let allStop = all_data.map(objet => objet.stop_name);
	allStop = [...new Set(allStop)];
	allStop.sort();
	return allStop;
}

function timestampToTime(timestamp) {
	const date = new Date(timestamp.time * 1000);
	const hours = date.getHours();
	const minutes = `0${date.getMinutes()}`.slice(-2);
	const seconds = `0${date.getSeconds()}`.slice(-2);
	return `${hours}:${minutes}:${seconds}`;
}

function showTrip(tripData) {
	const data = all_data.find(item => item.trip.find(it => it.id.includes(tripData.tripId)));
	if (data) {
		if (data.hasOwnProperty('trip_headsign') && data.trip_headsign !== '') {
			return data.trip_headsign;
		}
	}
	return 'Destination inconnue';
}

function searchStopAndDirection(stopName, direction) {
	const results = [];
	all_data.forEach(item => {
		for(var i = 0; i < direction.length; i++) {
			if(item.stop_name === stopName && item.trip_headsign === direction[i]) {
				results.push({
					stop_id: item.stop_id,
					route_id: item.route_id,
					trip_headsign: item.trip_headsign,
					stop_name: item.stop_name,
				});
			}
		}
	});

	return results;
}

function getStopName(stopId) {
	var results = "";
	for(var i = 0; i < all_data.length; i++) 
		if(all_data[i].stop_id == stopId){
			results = all_data[i].stop_name;
			break
		}

	return results
}

async function getAlert(line) {	
	if(line === undefined || line.length === 0 || line === null) {
		console.error("Error [-1]");
		return null;
	}

	var response = null;
	try {
		response = await fetch(
			'https://data.montpellier3m.fr/TAM_MMM_GTFSRT/Alert.pb',
			{
				mode: 'cors',
				headers: {
					'Access-Control-Allow-Origin': '*',
				},
			},
		);
	}catch(e) {
		console.error("Error [4]");
		return null;
	}

	if (!response.ok) {
		const error = new Error(`${response.url}: ${response.status} ${response.statusText}`);
		error.response = response;
		console.log(error);
		return [];
	}
	const buffer = await response.arrayBuffer();
		
	const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
	
	var data = [];
	feed.entity.forEach((elt) => {
		if(elt.alert.informedEntity) {
			for(var i = 0; i < line.length; i++) {
				elt.alert.informedEntity.forEach(element => {
					if(element.routeId.endsWith("-" + line[i])) {
						elt.alert.descriptionText.translation.forEach(e => {
							if(e.language == "fr") {
								data.push({
									routeId: line[i],
									text: e.text
								});
								
							}
						});
					}
					
				});
			}
		}
	});
	
	return data;
	
}

async function findData(direction, line) {
	
	if(direction === undefined || direction.length === 0 || direction === null) {
		console.error("Error [0]");
		return null;
	}

	if(line === undefined || line.length === 0 || line === null) {
		console.error("Error [1]");
		return null;
	}
	var response = null;
	try {
		response = await fetch(
			'https://data.montpellier3m.fr/TAM_MMM_GTFSRT/TripUpdate.pb',
			{
				mode: 'cors',
				headers: {
					'Access-Control-Allow-Origin': '*',
				},
			},
		);
	}catch(e) {
		console.error("Error [2]");
		return null;
	}
	
	if (!response.ok) {
		const error = new Error(`${response.url}: ${response.status} ${response.statusText}`);
		error.response = response;
		throw error;
	}
	const buffer = await response.arrayBuffer();
		
	const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
	const data = [];
	feed.entity.forEach(entity => {			
		if(entity.tripUpdate) {
			for(var i = 0; i < direction.length; i++) {				
				for(var j = 0; j < line.length; j++) {					
					if(entity.tripUpdate.trip.routeId === direction[i].route_id && direction[i].route_id.endsWith("-" + line[j])) {
						if(entity.tripUpdate.stopTimeUpdate) {
							entity.tripUpdate.stopTimeUpdate.forEach(stop => {								
								if(direction[i].stop_id === stop.stopId) {								
									if(stop.arrival && stop.arrival.time) {
										if(typeof stop.arrival.time.low === 'number' && stop.arrival.time > Date.now() / 1000) {
											if(entity.tripUpdate && entity.tripUpdate.trip) {
												const trip = showTrip(entity.tripUpdate.trip);
												if(trip === direction[i].trip_headsign) {
													data.push({
														trip_headsign: trip,
														departure_time: stop.arrival.time.toString(),
														route_short_name: direction[i].route_id.split('-')[1],
														stop_name: direction[i].stop_name,
														vehicle_id: (entity.tripUpdate.vehicle!=null?entity.tripUpdate.vehicle.id:null),
														trip_id: entity.tripUpdate.trip.tripId,
														theoretical: false
													});
												}
											}
										}
									}
								}
							});
						}
					}
				}
			}
		}
	});

	//var oData = getTheoretical(direction);
	/*var oData = [];
	var rData = [];
	oData.forEach(element => {
		var conti = true;
		for(var i = 0; i < data.length; i++) {
			if(data[i].trip_id == element.trip_id) {
				rData.push(data[i]);
				conti = false;
				break;
			}
		}

		if(conti)
			rData.push(element);
	});
	rData.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
	
	return rData;*//*

	data.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
	return data;
}

function createDate(h, m, s) {
	var time = new Date(0);
	time.setHours(h);
	time.setMinutes(m);
	time.setSeconds(s);

	var now = new Date();
	if(now.getTimezoneOffset() != 0)
		now.setMinutes(-now.getTimezoneOffset());
	if(time.getHours() == now.getHours()) {
		if(time.getMinutes() < now.getMinutes()) {
			return new Date();
		}
		now.setMinutes(time.getMinutes());
		now.setSeconds(time.getSeconds());
	}else if(time.getHours() < now.getHours()) {
		now.setDate(now.getDate() + 1);
		now.setHours(time.getHours());
		now.setMinutes(time.getMinutes());
		now.setSeconds(time.getSeconds());
	}else {
		now.setHours(time.getHours());
		now.setMinutes(time.getMinutes());
		now.setSeconds(time.getSeconds());
	}

	return now;
}

function getTheoretical(directions) {
	var result = [];
	all_data.forEach(elt => {		
		directions.forEach(dir => {
			if(elt.route_id == dir.route_id && elt.stop_name == dir.stop_name && elt.trip_headsign == dir.trip_headsign) {
				
				elt.trip.forEach(trip => {
					var h = trip.time.split(":")[0], m = trip.time.split(":")[1], s = trip.time.split(":")[2];
					var n = new Date();
					if(n.getTimezoneOffset() != 0)
						n.setMinutes(-n.getTimezoneOffset());
					
					var c = createDate(h, m, s);
					if(c.getTime() >= n.getTime() && c.getTime() - n.getTime() <= 3600000) {
						result.push({
							trip_headsign: elt.trip_headsign,
							departure_time: (c.getTime()).toString().substring(0, c.getTime().toString().length-3),
							route_short_name: elt.route_id.split("-")[1],
							stop_name: elt.stop_name,
							vehicle_id: null,
							trip_id: trip.id, 
							theoretical: true
						});
					}
				});
			}
		});
	});

	return result;
}


async function getTripData(tripId) {
	if(tripId === undefined || tripId == "") {
		console.error("Error [3]");
		return null;
	}

	var response = null;
	try {
		response = await fetch(
			'https://data.montpellier3m.fr/TAM_MMM_GTFSRT/TripUpdate.pb',
			{
				mode: 'cors',
				headers: {
					'Access-Control-Allow-Origin': '*',
				},
			},
		);
	}catch(e) {
		console.error("Error [2.1]");
		return null;
	}
	
	if (!response.ok) {
		const error = new Error(`${response.url}: ${response.status} ${response.statusText}`);
		error.response = response;
		throw error;
	}
	const buffer = await response.arrayBuffer();
		
	const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
	const data = [];
	
	feed.entity.forEach(entity => {				
		if(entity.tripUpdate && entity.tripUpdate.trip.tripId == tripId) {
			entity.tripUpdate.stopTimeUpdate.forEach(elt => {
				var stopName = getStopName(elt.stopId);
				if(stopName != "") {
					var t = elt.departure.time - (Date.now() / 1000);
					var stationState = -1;
					if(t > -20 && t < 17)
						stationState = 0;
					else if(t > 17)
						stationState = 1;

					data.push({
						departure_time: elt.departure.time.toString(),
						station_name: stopName,
						state: stationState,
						vehicle_id: (entity.tripUpdate.vehicle!=null?entity.tripUpdate.vehicle.id:null),
						trip_id: entity.tripUpdate.trip.tripId,
						route_short_name: entity.tripUpdate.trip.routeId.split('-')[1],
					})
				}
			});
		}
	});
	
	data.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
	
	return data;
}

async function getTripByVehiculeId(vehiculeId) {
	if(vehiculeId === undefined || vehiculeId == "") {
		console.error("Error [3.1]");
		return null;
	}

	var response = null;
	try {
		response = await fetch(
			'https://data.montpellier3m.fr/TAM_MMM_GTFSRT/TripUpdate.pb',
			{
				mode: 'cors',
				headers: {
					'Access-Control-Allow-Origin': '*',
				},
			},
		);
	}catch(e) {
		console.error("Error [2.3]");
		return null;
	}
	
	if (!response.ok) {
		const error = new Error(`${response.url}: ${response.status} ${response.statusText}`);
		error.response = response;
		throw error;
	}
	const buffer = await response.arrayBuffer();
		
	const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
	var data = undefined;
	
	for(var i = 0; i < feed.entity.length; i++) {
		var entity = feed.entity[i];
		if(entity.tripUpdate.vehicle && entity.tripUpdate.vehicle.id == vehiculeId) {
			data = entity.tripUpdate.trip.tripId;
			break;
		}
	}

	return data;
}

async function getVehiculeInfo(vehiculeId) {
	var data = INFOS[vehiculeId];
	if(data == null) {
		return null;
	}

	var trip = await getTripByVehiculeId(vehiculeId);
	data["trip_id"] = trip;
	return data;
}

function toPascalCase(str) {
	return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

async function getData(stopName, direction, line) {
	let obj = await searchStopAndDirection(stopName, direction);
	if (obj.length === 0) {
		const new_stopName = toPascalCase(stopName);
		obj = await searchStopAndDirection(new_stopName, direction);
	}

	return await findData(obj, line);
}

module.exports = {
	getTripHeadsign,
	getAllStops,
	timestampToTime,
	showTrip,
	searchStopAndDirection,
	findData,
	getTripData,
	toPascalCase,
	getData,
	getAlert,
	getDirections,
	getLines,
	getVehiculeInfo,
	getTripByVehiculeId
};*/
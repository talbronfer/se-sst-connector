const axios = require('axios');
const SITE_ID = process.env.site_id;
const API_KEY = process.env.api_key;

const client = axios.create({ baseUrl : 'https://monitoringapi.solaredge.com'  });

module.exports.getEnergyDelta = (start,end) => {
    start = start.format('yyyy-MM-DD hh:mm:ss');
    end = end.format('yyyy-MM-DD hh:mm:ss');
    return axios.get(`https://monitoringapi.solaredge.com/site/${SITE_ID}/energyDetails`, { params: {
        startTime: start,
        endTime: end,
        api_key: API_KEY
    } });
};

module.exports.getPowerAverage = (start,end) => {
    start = start.format('yyyy-MM-DD hh:mm:ss');
    end = end.format('yyyy-MM-DD hh:mm:ss');
    return axios.get(`https://monitoringapi.solaredge.com/site/${SITE_ID}/powerDetails`, { params: {        startDate: start,
    startTime: start,
    endTime: end,
    api_key: API_KEY } });
}

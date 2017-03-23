'use strict';

const Alexa = require('alexa-sdk');
const https = require('https');
const moment = require('moment');


exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const handlers = {
    'LaunchRequest': function () {
        this.emit('GetMealsForMensa');
    },

    'GetMealsForMensa': function () {
        const dateSlot = this.event.request.intent.slots.Date
        const today = moment().format('YYYY-MM-DD')
        const date = dateSlot != undefined && dateSlot.value != undefined ? dateSlot.value : today;
        const dateName = dateSlot != undefined && dateSlot.value != undefined && dateSlot.value != today ? moment(date).locale('de').format('dddd') : 'Heute';

        console.log('Date:', date, 'DateName:', dateName)

        const requestParams = {
            'mensaId': 139,
            'date': date
        }

        queryMeals(requestParams,  myResult => {
            const meals = getFormattedMeals(myResult)
            const outputSpeech = meals.slice(0, meals.length - 1).join(', <break time="600ms" /> ') + ' <break time="500ms" />' + ' und zuletzt auch noch ' + meals[meals.length - 1];
            console.log(outputSpeech);
            this.emit(':tell', dateName + ' gibt es ' + outputSpeech);
        }
        );

    }
};

function getFormattedMeals(jsonResponse) {
    /* Returns an array of formatted meals like ">Schinkennudeln (Vorderschinken) mit Zwiebeln und Ei für 1.9€" */
    const categoryFilter = ['Tagesgericht 1', 'Tagesgericht 2', 'Tagesgericht 3', 'Tagesgericht 4', 'Aktionsessen 1', 'Aktionsessen 2', 'Aktionsessen 3', 'Aktionsessen 4', 'Biogericht 1', 'Biogericht 2', 'Biogericht 3', 'Biogericht 4'];
    return jsonResponse.filter( meal => categoryFilter.indexOf(meal.category) !== -1 )
                       .map( meal => meal.prices.students != null ? meal.name + ' für ' + meal.prices.students + '€' : meal.name );
}

function queryMeals(myData, callback) {
    const options = {
        host: 'openmensa.org',
        port: 443,
        path: '/api/v2/canteens/' + myData.mensaId + '/days/' + myData.date + '/meals',
        method: 'GET'
    };

    const req = https.request(options, res => {
        res.setEncoding('utf8');
        let returnData = '';

        res.on('data', chunk => {
            returnData = returnData + chunk;
        });

        res.on('end', () => {
            callback(JSON.parse(returnData));

        });

        res.on('error', e => {
            console.log('ERROR', e);
        });

    });
    req.end();
}


// handlers.GetMealsForMensa();


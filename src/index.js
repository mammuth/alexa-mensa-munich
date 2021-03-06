'use strict';
const Alexa = require('alexa-sdk');
const https = require('https');
const moment = require('moment');

const languageStrings = require('./languageStrings.js');
const canteens = require('./canteens.js');

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context);
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const handlers = {
    'LaunchRequest': function () {
        this.emit(':ask', this.t('WELCOME_MESSAGE'), this.t('WELCOME_REPROMPT'));
    },

    'Unhandled': function () {
        this.emit(':ask', this.t('WELCOME_MESSAGE'), this.t('WELCOME_REPROMPT'));
    },

    'GetMealsForMensa': function () {
        const canteenSlot = this.event.request.intent.slots.Canteen;
        if (canteenSlot == undefined || canteenSlot.value == undefined) {
            this.emit('AMAZON.HelpIntent');
            return false;
        }

        const date = getDate(this.event.request.intent.slots.Date);
        const canteen = getCanteen(this, canteenSlot);
        const requestParams = {
            'mensaId': canteen.id,
            'date': date.date
        };
        console.log('requestParams', requestParams);
        queryMeals(requestParams, (success, myResult) => {
            if (!success) {
                this.emit(':tell', date.dateName + ' scheint es kein Essen zu geben. Sorry, du musst hungern.');
                return false;
            }
            const meals = getFormattedMeals(myResult);
            const outputSpeech = meals.slice(0, meals.length - 1).join(', <break time="600ms" /> ') + ' <break time="500ms" />' + ' und zuletzt auch noch ' + meals[meals.length - 1];
            console.log(outputSpeech);
            this.emit(':tell', 'In der ' + canteen.verboseName + ' gibt es ' + date.dateName + ' ' + outputSpeech);
        });
    },

    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', randomPhrase(this.t('STOP_MESSAGE')));
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', randomPhrase(this.t('STOP_MESSAGE')));
    },
    'SessionEndedRequest': function () {
        this.emit(':tell', randomPhrase(this.t('STOP_MESSAGE')));
    },
};

function getCanteen(that, canteenSlot) {
    const canteenQuery = canteenSlot.value.toLowerCase();
    console.log('canteenQuery', canteenQuery);
    const resultCanteens = canteens.filter(canteen => canteen.synonyms.indexOf(canteenQuery) !== -1);
    if (resultCanteens.length === 0) {
        that.emit('AMAZON.HelpIntent');
        return false;
    } else {
        return {
            'verboseName': resultCanteens[0].verboseName,
            'id': resultCanteens[0].id
        };
    }
}

function getDate(dateSlot) {
    const today = moment().format('YYYY-MM-DD');
    const date = dateSlot != undefined && dateSlot.value != undefined && dateSlot.value !== '' ? dateSlot.value : today;
    const dateName = dateSlot != undefined && dateSlot.value != undefined && dateSlot.value != today && dateSlot.value !== '' ? 'Am ' + moment(date).locale('de').format('dddd') : 'Heute';
    console.log('Date:', date, 'DateName:', dateName);
    return {
        'dateName': dateName,
        'date': date
    };
}

function getFormattedMeals(jsonResponse) {
    /* Returns an array of formatted meals like ">Schinkennudeln (Vorderschinken) mit Zwiebeln und Ei für 1.9€" */
    // const categoryFilter = ['Tagesgericht 1', 'Tagesgericht 2', 'Tagesgericht 3', 'Tagesgericht 4', 'Aktionsessen 1', 'Aktionsessen 2', 'Aktionsessen 3', 'Aktionsessen 4', 'Biogericht 1', 'Biogericht 2', 'Biogericht 3', 'Biogericht 4'];
    const categoriesToIgnore = ['Beilagen', 'Aktion'];
    return jsonResponse
        .filter(meal => categoriesToIgnore.indexOf(meal.category) === -1)
        // .map(meal => meal.prices.students != null ? meal.name + ' für ' + meal.prices.students + '€' : meal.name);
        .map(meal => meal.name);
}

function randomPhrase(phrasesArray) {
    var i = 0;
    i = Math.floor(Math.random() * phrasesArray.length);
    return phrasesArray[i];
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
            if (returnData == '') {
                callback(false, returnData)
            } else {
                callback(true, JSON.parse(returnData));
            }
        });

        res.on('error', e => {
            console.log('ERROR', e);
        });

    });
    req.end();
}

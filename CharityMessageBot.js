// Built from the Twitch code from https://dev.twitch.tv/docs/irc
// CharityBot
//
// This bot checks a just giving page once a minute and announces each donation.
// For every £1, £5 or £10 donated the bot messages the channels to with a trigger
// !1reward, !5reward, !10reward. Every time the total passes a threshold (£100)
// the bot sends out !100reward.
//
// That page also explains how to install node.js 
// Which can be downloaded from https://nodejs.org/en/


// Required packages 
// Use 'npm install <package.js>' to install if needed 
const tmi = require('tmi.js');
const axios = require("axios");
const cheerio = require("cheerio");
const pretty = require("pretty");
const https = require('https');
const fs = require("fs");

// Configuration options
// Everything you need to edit should be here
// appID is the JustGiving AppID
//	 The documentation is found at
//	 https://developer.justgiving.com/apidocs/documentation
//	 Sign up and you can create you own.
// pageShortName is the name in the link to you fundraising page
// twitchUserName is the name account the bot will log in as
// twitchOauth is the Oauth token for the twitch account
// 	use https://twitchapps.com/tmi/ to generate a token
//	this means the bot doesn't have your password.
// twitchChannel is the channel you want the bot to join.
// donationRollBack is the number of donations to reannounce on 
//	loading the bot.
// 


const appID = "yourJustGivingAppID" ;
const pageShortName = "yourJustGivingPage";
const twitchUserName = "yourBotAccount";
const twitchOauth = "oauth:---------";
const twitchChannel = 'yourTwitchChannel';
const donationRollBack = 1;
const totalRollBack = 99;


// Define Twitch Configuration options
const opts = {
  identity: {
    username: twitchUserName,
    password: twitchOauth
  },
  channels: [
    twitchChannel
  ]
};


// Sleep function
// Used to avoid spamming the channel.
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

sleep(1000);

// Called every time a message comes in
// Left the example dice commant, as it's useful check the bot is alive.
 
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim();

  // If the command is known, let's execute it
  if (commandName === '!dicetest') {
    const num = rollDice();
    client.say(target, `You rolled a ${num}`);
    console.log(`* Executed ${commandName} command`);
  } else if (commandName === '!total') {
    totalMsg()
  }
}

// Function called when the "dicetest" command is issued
function rollDice () {
  const sides = 6;
  return Math.floor(Math.random() * sides) + 1;
}

// Function called when the "total" command is issued
async function totalMsg () {
    //getting total
    total = await getTotal();
    console.log('-> The total so far is £', total, 
	'. Thank you for you support, you can donate at http://justgiving.com/fundraising/' + pageShortName);
    client.say(twitchChannel, 'The total so far is £'+ total +
	'. Thank you for you support, you can donate at http://justgiving.com/fundraising/' + pageShortName);
}

async function getTotal () {
    var { data } = await axios.get(url_GetFundraising);
    var myjson = JSON.parse(JSON.stringify(data));
    total =  Number(myjson['totalRaisedOnline']);
    console.log('Total Raised: ', total);
    return total;
}


// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}


//Start Justgiving API code

const url_GetPledges = "https://api.justgiving.com/" + appID + "/v1/fundraising/pages/" + pageShortName + "/donations"
const url_GetFundraising = "https://api.justgiving.com/" + appID + "/v1/fundraising/pages/" + pageShortName + "/"


// Fetch current number of dontations
async function getLastDonationID() {
	var { data } = await axios.get(url_GetPledges);
	// console.log(data);
	var myjson = JSON.parse(JSON.stringify(data));
	var lastDonationID = Number(myjson['pagination']['totalResults']);
	console.log('Total Donations at start: ', Number(lastDonationID))

	// If we have more than zero donations, roll back one.
	// I need to confirm if it is zero counting... in which cause need > 0 
	if (lastDonationID > donationRollBack)
	{
		lastDonationID = lastDonationID - donationRollBack
	}

	return lastDonationID;
}


var lastDonationID = 0;
getLastDonationID().then(res => lastDonationID = res);

var totalAnnounce = 100;
const totalAnnounceIncrease = 100;

//get the total on load and rollback by a set ammount
getTotal().then(res => totalAnnounce = Math.ceil((res - totalRollBack)/100)*100)
//.then(console.log('Rolled back annountment target of: ', totalAnnounce));




// Async function which scrapes the data
async function scrapeData() {
    // Fetch HTML of the page we want to scrape using API
    var { data } = await axios.get(url_GetPledges);
    var myjson = JSON.parse(JSON.stringify(data));

    
    var newDonationID = Number(myjson['pagination']['totalResults'])
    
    console.log('Total Donations: ', newDonationID);
    console.log('New Donations: ', newDonationID - lastDonationID);

    for(var donation in myjson['donations']) {
	if (donation >= newDonationID - lastDonationID) { 
		break; 
	} else {
		if (myjson['donations'][donation]['amount'] !=null) {
			console.log(donation+"-> Thank you "   + myjson['donations'][donation]['donorDisplayName']+
	 				     " for donating " + myjson['donations'][donation]['amount'].slice(0,-2)+
					     " " + myjson['donations'][donation]['currencyCode']+
				    	     " to Cancer Research UK"
				    )
			client.say(twitchChannel,   " Thank you "  + myjson['donations'][donation]['donorDisplayName']+  
	 				     " for donating " + myjson['donations'][donation]['amount'].slice(0,-2)+
					     " " + myjson['donations'][donation]['currencyCode']+
				    	     " to Cancer Research UK"
				    )			
			if(Number(myjson['donations'][donation]['amount'].slice(0,-2))>=10) {
				console.log('-> !10reward');
				await sleep(1000);
				client.say(twitchChannel, `!10reward`);
			} else if(Number(myjson['donations'][donation]['amount'].slice(0,-2))>=5) {
				console.log('-> !5reward');
				await sleep(1000);
				client.say(twitchChannel, `!5reward`);
			} else if(Number(myjson['donations'][donation]['amount'].slice(0,-2))>=1) {
				console.log('-> !5reward');
				await sleep(1000);
				client.say(twitchChannel, `!1reward`);
			}
		} else {
			console.log(donation+" Thank you "+ myjson['donations'][donation]['donorDisplayName']+
			" for your donation to Cancer Research UK.")          
		}
    	}
    }

    lastDonationID = newDonationID;	

    //getting total
    var { data } = await axios.get(url_GetFundraising);
    var myjson = JSON.parse(JSON.stringify(data));

    console.log('Total Target: ', Number(myjson['fundraisingTarget']));
    console.log('Total Raised: ', Number(myjson['totalRaisedOnline']));
    console.log('Next Total Announce: ',totalAnnounce);	    


    await sleep(1000);

    if(Number(myjson['totalRaisedOnline']) > totalAnnounce) {
	 console.log('->We just passed £' + totalAnnounce +'! Thank you for all the support!')
	 client.say(twitchChannel, 'We just passed £' + totalAnnounce +'! Thank you for all the support!');
	 console.log('->!100reward')
	 await sleep(1000);
	 client.say(twitchChannel, `!100reward`);
	 totalAnnounce = totalAnnounce + totalAnnounceIncrease
	}

}
// Invoke the above function


var minutes = 1, the_interval = minutes * 60 * 1000;
setInterval(function() {
  console.log("\n I am doing my 1 minutes check \n");

  // do stuff here
  scrapeData();

  }, the_interval);


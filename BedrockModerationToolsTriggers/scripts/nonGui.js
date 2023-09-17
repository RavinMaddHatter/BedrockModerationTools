import { world, system } from '@minecraft/server';

//////////////////////////////
//////// Globals /////////////
//////////////////////////////

const ticksAverage = 20
var startTime = Date.now();
var modForTPS 
var activeMonitors = {} 
var latestJoin 
var msptMod
var msptStart=0
var msptStop=0
var msptArray=[]
var msptCounter=0
var monitorRate=20


//////////////////////////////
////// Subscriptions /////////
//////////////////////////////

//Subscribe to world event player join to 
world.afterEvents.playerSpawn.subscribe(event =>{ 
	removeSpectator(event);
});


world.afterEvents.itemUse.subscribe(event => {
	let moderator = event.source
	if (event.itemStack.typeId === "minecraft:stick" && (moderator.hasTag("menuAccess")||moderator.hasTag("root"))){
		moderator.addTag("mainMenu")
	}
});

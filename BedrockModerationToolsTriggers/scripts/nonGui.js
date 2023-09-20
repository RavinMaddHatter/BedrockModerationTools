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
system.runInterval(tagChecker,1)

function tagChecker(){
	let players=world.getPlayers()
	for(let player of players){
		if(player.hasTag("inventory")){
			getInventories(player)
			player.removeTag("inventory")
		}
		if(player.hasTag("invMon")){
			printTaggedInv(player)
			player.removeTag("invMon")
		}
	}
}

world.afterEvents.itemUse.subscribe(event => {
	let moderator = event.source
	if (event.itemStack.typeId === "minecraft:stick" && (moderator.hasTag("menuAccess")||moderator.hasTag("root"))){
		moderator.addTag("mainMenu")
	}
});
/**
 * Removes Spectator tag and returns a player to survival upon login. This is parterned with enter spectator as there is no way for the spectator to interact with the server
*/
function removeSpectator(event){
	if(event.player.hasTag("spectator")){
		event.player.removeTag("spectator");
		world.getDimension("overworld").runCommandAsync("gamemode survival "+event.player.name);
	}
}

/**
 * Prints all online players inventories to whisper chat
 * @param (player) moderator The moderator that executed the request
*/
function getInventories(moderator){
	let players = world.getPlayers();
	let inventory_text = ""
	for (let i = 0; i < players.length; i++){
		inventory_text = "\u00A74"+players[i].name+": \u00A7f"
		let inventory = players[i].getComponent("inventory");
		for (let slot = 0; slot<36;slot++){
			let itemStack = inventory.container.getItem(slot);
			if(!((typeof itemStack) === 'undefined')){
				inventory_text+=itemStack.typeId + ", "; 
			}
		}
		sayInChat(moderator,inventory_text)
	}
}

function printTaggedInv(moderator){
	let players=world.getPlayers()
	for(let player of players){
		if(player.hasTag(moderator.name)){
			player.removeTag(moderator.name)
			let inventory_text = "\u00A74" + player.name+": \u00A7f"
			let inventory = player.getComponent("inventory");
			for (let slot = 0; slot<36;slot++){
				let itemStack = inventory.container.getItem(slot);
				if(!((typeof itemStack) === 'undefined')){
					inventory_text+=itemStack.typeId + ", "; 
				}
			}
			sayInChat(moderator, inventory_text)
		}
	}
}

function sayInChat(target,text){
	text=text.split("minecraft:").join("")
	target.runCommandAsync('tellraw @s {"rawtext":[{"text":"'+text+'"}]}')
}
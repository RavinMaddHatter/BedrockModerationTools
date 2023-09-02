import { world, system } from '@minecraft/server';
import {ActionFormData, ModalFormData,MessageFormData } from "@minecraft/server-ui";
 

//////////////////////////////
////// Static Forms //////////
//////////////////////////////
const mainForm = new ActionFormData()
  .title("Moderator Tools")
  .body("What do you need")
  .button("Inspect")
  .button("Monitor")
  .button("Administrate")
const inspectForm = new ActionFormData()
  .title("Inspection Tools")
  .body("What do you need")
  .button("Spectator")
  .button("Teleport")
  .button("Ticks Per Second")
  .button("Get Player Location")
  .button("Get Player Inventory")
  .button("Teleport to player")
  .button("Stealth Teleport to player")
  .button("MSPT")
const monitorForm = new ActionFormData()
  .title("Monitoring Tools")
  .body("What do you need")
  .button("Ticks per Second")
  .button("Player Position")
  .button("Player Inventory(Not implemented)")
const adminForm = new ActionFormData()
  .title("Administration Tools")
  .body("What do you need")
  .button("Kick")
  .button("Allow List")
  .button("setup moderators(Not implemented)")
const allowListform = new ModalFormData()
  .title("Administration Tools")
  .textField("Username","enter user name")
  .dropdown("opperation",["Add","Remove"],0)
  

const teleport = new ModalFormData()
  .title("Allow List Menu")
  .textField("X","location X")
  .textField("Y","location Y")
  .textField("Z","location Z")
  
const splashMenu = new MessageFormData()
  .title("Welcome")
  .body("This is a user owned server and we are required to inform you:\n\r\n\rTHIS SERVER IS NOT AN OFFICIAL MINECRAFT SERVER. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT")
  .button1("Aknowledge")
  .button2("Don't show me again")
 
var startTime = Date.now();
var modForTPS 
var activeMonitors = {} 
const ticksAverage = 20
var latestJoin 
var msptMod
var msptStart=0
var msptStop=0
var msptArray=[]
var msptCounter=0


//////////////////////////////
////// Subscriptions /////////
//////////////////////////////

//Subscribe to world event player join to 
world.afterEvents.playerSpawn.subscribe(event =>{ 
	removeSpectator(event);

	showSplash(event); 
});

world.afterEvents.itemUse.subscribe(event => {
	if (event.itemStack.typeId === "minecraft:stick" && event.itemStack.nameTag === "mod") {
		var nextForm = 99;
		mainForm.show(event.source).then((response) => {
			switch(response.selection){
				case 0://Inspect
					openInspect(event.source)
					break;
				case 1://Monitor
					openMonitor(event.source)
					break;
				case 2://Admin
					openAdmin(event.source)
					break;
				default:
					break;
				}
		});
	}
});

function openInspect(moderator){
	inspectForm.show(moderator).then((response) =>{
		switch(response.selection){
			case 0://spectator
				enterSpectator(moderator);
				break;
			case 1://Teleport
				teleportFunction(moderator);
				break;
			case 2://TPS
				modForTPS=moderator;
				startTime = Date.now();
				system.runTimeout(ticksPerSecond,ticksAverage);
				break;// get locations
			case 3:
				getPlayerLocation(moderator);
				break;
			case 4:// get inventories
				getInventories(moderator);
				break;
			case 5://tp to player
				tpToPlayerShow(moderator);
				break;
			case 6://stealth tp to player
				stealthTpToPlayerShow(moderator);
				break;
			case 7:
				msptStart=Date.now()
				msptStop=Date.now()
				msptCounter=0;
				msptArray=[];
				msptMod=moderator;
				msptRouter();
			default:
				break;
		}
	});
}


function openMonitor(moderator){
		monitorForm.show(moderator).then((response) =>{
		switch(response.selection){
			case 0://TPS continous
				if("tps" in activeMonitors){
					if (moderator.name in activeMonitors["tps"]["users"]){
						delete activeMonitors["tps"]["users"][moderator.name]
						console.warn(!activeMonitors["tps"]["users"])
						const keys = Object.keys(activeMonitors["tps"]["users"]);
						console.log(keys.length)
						if(keys.length==0){
							system.clearRun(activeMonitors["tps"]["handle"])
							delete activeMonitors["tps"]
						}
					}
				}else{
					activeMonitors["tps"]={}
					activeMonitors["tps"]["users"]={}
					activeMonitors["tps"]["users"][moderator.name]=moderator
					console.warn(activeMonitors["tps"]["users"])
					activeMonitors["tps"]["startTime"]=Date.now()
					if(!("handle" in activeMonitors["tps"])){
						activeMonitors["tps"]["handle"]=system.runInterval(ticksPerSecondRepeat,ticksAverage)
					}
				}
				break;
			case 1:// player position repeat
				monitorPlayerLocationForm(moderator)
				break;
			case 2://player intentory updates
				break;
			default:
				break;
		}
			
	});
}
function openAdmin(moderator){
	adminForm.show(moderator).then((response) =>{
		switch(response.selection){
			case 0://kick
				showKickMenu(moderator)
				break;
			case 1://allow list add
				allowListAdd(moderator)
				break;
			default:
				break;
		}
	});
}
//////////////////////////////
////// Form functions ////////
//////////////////////////////

function showSplash(event){
	if(!event.player.hasTag("hasPlayed")){
		latestJoin=event.player
		system.runTimeout(showSplashMenu,200)
	}
}
function showSplashMenu(){
	splashMenu.show(latestJoin).then(r =>{
		if (r.canceled){
			return;
		}
		switch(r.selection){
			case 0:
				break;
			case 1:
				latestJoin.addTag("hasPlayed");
				break;
			default:
				break;
		}
	});
}
/**
 * Displays form for kicking a player then executes the kick command when completed.
 * @param (player) moderator The moderator that executed the request
 */
function showKickMenu(moderator){
	let kickForm = new ModalFormData();
	let names = world.getPlayers().map((player) => player.name);
	kickForm.title("Kick Player")
	kickForm.dropdown("Player",names)
	kickForm.textField("Reason","tells the player why they were kicked")
	kickForm.show(moderator).then((r)=>{
		if (r.canceled) return;
		let [player, reason] = r.formValues;
		moderator.runCommandAsync(`kick "${names[player]}" ${reason}`);
	});
	
}
/**
 * Displays form for monitoring a player then loops
 * @param (player) moderator The moderator that executed the request
 */
function monitorPlayerLocationForm(moderator){
	var kickForm = new ModalFormData;
	var names = ["None"]
	var playerHandle={}
	let players = world.getPlayers();
	for (let i = 0; i < players.length; i++){
		names.push(players[i].name)
		playerHandle[players[i].name]=players[i]
	}
	kickForm.dropdown("Player",names)
	kickForm.show(moderator).then((r)=>{
		if (r.canceled) return;
		let [player, reason] = r.formValues;
		if (!("loc" in activeMonitors)){
			activeMonitors["loc"]={}
			activeMonitors["loc"]["moderator"]={}
		}
		if (names[player]==="None"){
			delete activeMonitors["loc"]["moderator"][moderator.name]
			const keys = Object.keys(activeMonitors["loc"]["moderator"]);
			if(keys.length==0){
				system.clearRun(activeMonitors["loc"]["thread"])
				delete activeMonitors["loc"]
			}
		}else{
			activeMonitors["loc"]["moderator"][moderator.name]={}
			activeMonitors["loc"]["moderator"][moderator.name]["player"]=playerHandle[names[player]]
			activeMonitors["loc"]["moderator"][moderator.name]["moderator"]=moderator
			console.warn("here")
			if(!("thread" in activeMonitors["loc"])){
				console.warn("starting thread")
				activeMonitors["loc"]["thread"]=system.runInterval(repeatMonitorPlayer,20)
			}
		}
	});
	
}
/**
 * Displays form for teleport to player then executes the teleport command when completed.
 * @param (player) moderator The moderator that executed the request
 */
function tpToPlayerShow(moderator){
	var tpForm = new ModalFormData;
	let names = world.getPlayers().map((player) => player.name);
	tpForm.dropdown("Player",names)
	tpForm.show(moderator).then((r)=>{
		if (r.canceled) return;
		let [player] = r.formValues;
		moderator.runCommandAsync("tp @s " + names[player])
	});
}

function stealthTpToPlayerShow(moderator){
	var tpForm = new ModalFormData;
	let names = world.getPlayers().map((player) => player.name);
	tpForm.dropdown("Player",names)
	tpForm.show(moderator).then((r)=>{
		if (r.canceled) return;
		let [player] = r.formValues;
		enterSpectator(moderator)
		moderator.runCommandAsync("tp @s " + names[player])
	});
}
/**
 * Displays form for allow list and executes modifications to the allow list
 * @param (player) moderator The moderator that executed the request
 */
function allowListAdd(moderator){
	allowListform.show(moderator).then((r)=>{
		if (r.canceled) return;
		let [name, process] = r.formValues;
		switch(process){
			case 0:
				moderator.runCommandAsync("allowlist add " + name)
				moderator.runCommandAsync("allowlist on")
				break;
			case 1:
				moderator.runCommand("allowlist remove " + name)
				moderator.runCommand("allowlist reload")
				break;
			default:
				break;
		}
	});
}
/**
 * Displays form for teleport then executes the teleport command when completed.
 * @param (player) moderator The moderator that executed the request
 */
function teleportFunction(moderator){
	teleport.show(moderator).then((r)=>{
		if (r.canceled) return;
		let [x, y, z] = r.formValues;
		if (isNumeric(x) && isNumeric(y) && isNumeric(z)){
			moderator.runCommandAsync("tp @s " + x + " " + y + " "+ z + " ")
		}
	});
}
//////////////////////////////
////// Action functions //////
//////////////////////////////


/**
 * Prints the location of all online players along with the dimension
 * @param (player) moderator The moderator that executed the request
*/
function getPlayerLocation(moderator){
	let players = world.getPlayers();
	var playerLoc
	
	for (let i = 0; i < players.length; i++){
		playerLoc = players[i].name + ": " + players[i].dimension.id + " " + players[i].location.x.toFixed(0)+", " + players[i].location.y.toFixed(0)+", " + players[i].location.z.toFixed(0)
		
		moderator.runCommandAsync("w @s " + playerLoc)
	}
}
/**
 * Places a player into spectator mode and tags them as a spectator to be put into survival on next login
 * @param (player) moderator The moderator that executed the request
*/
function enterSpectator(moderator){
	moderator.addTag("spectator");
	moderator.runCommandAsync("gamemode spectator");
}


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
	var inventory_text = ""
	for (let i = 0; i < players.length; i++){
		inventory_text = players[i].name+": "
		var inventory = players[i].getComponent("inventory");
		console.warn("here ")
		for (let slot = 0; slot<36;slot++){
			var itemStack = inventory.container.getItem(slot);
			if(!((typeof itemStack) === 'undefined')){
				inventory_text+=itemStack.type.id + ", "; 
			}
		}
		moderator.runCommandAsync("w @s " + inventory_text)
	}
	
}
/**
 * Function to be executed on an delay of ticksAverage to enable testing of lag on the server. 20 ticks should occur per second.
 */
function ticksPerSecond(){
	var ticksPerSecond = 1000 * ticksAverage/(Date.now()-startTime)
	modForTPS.runCommandAsync("w @s " + ticksPerSecond.toFixed(2))
}
/**
 * A function that manages routing and delay processes for the MSPT measurements.
 * RELIES ON GLOBAL VARIABLE INITILAIZATION
 */
function msptRouter(){
	if(ticksAverage== msptCounter){
		system.runTimeout(msptEnd,1)
	}else{
		system.runTimeout(msptMiddle,1)
	}
	while(msptStop-msptStart<50){//insures that there will be lag to measure the CPU time use by the remaing minecraft processes 
		msptStop=Date.now()
	}
}
/**
 * A function that manages the data collection and storage MSPT measurements. this function automatically calls the msptRouter
 * RELIES ON GLOBAL VARIABLE INITILAIZATION
 */
function msptMiddle(){
	msptArray.push(Date.now()-msptStop)
	msptCounter=1+msptCounter
	msptStart=Date.now()
	msptStop=Date.now()
	msptRouter()
}
/**
 * A termination function to be scheduled the tick after the last measured MSPT tick, this prints the data to the moderator
 * RELIES ON GLOBAL VARIABLE INITILAIZATION
 */
function msptEnd(){
	//msptArray.push(Date.now()-msptStop)
	var meanStd= meanAndSTD(msptArray)
//	msptMod.runCommandAsync("w @s mspt can only be measured in steps of 1ms, averaging provides the decimal places")
	msptMod.runCommandAsync("w @s average mspt is " +meanStd[1].toFixed(1)+ " standard devation of "+meanStd[0].toFixed(1))
//	var printVal="MSPT measurements: "+msptArray.toString()
//	msptMod.runCommandAsync("w @s "+printVal)w
	console.warn(msptArray.toString())
}

//////////////////////////////
////// Monitor functions /////
//////////////////////////////

/**
 * Function to be executed on an interval of ticksAverage to enable testing of lag on the server. 20 ticks should occur per second.
 */
function ticksPerSecondRepeat(){
	if ("tps" in activeMonitors){
		var ticksPerSecond = 1000 * ticksAverage/(Date.now()-activeMonitors["tps"]["startTime"])
		//console.warn("running");
		for (var key in activeMonitors["tps"]["users"]) {
			activeMonitors["tps"]["users"][key].runCommandAsync("w @s " + ticksPerSecond.toFixed(2))
		}
		activeMonitors["tps"]["startTime"]=Date.now()
	}
}
/**
 * A function to be scheduled that will get the players location and print it to chat
 */
function repeatMonitorPlayer(){
	if ("loc" in activeMonitors){
		for (var moderatorName in activeMonitors["loc"]["moderator"]){ 
			var player = activeMonitors["loc"]["moderator"][moderatorName]["player"]
			var moderator = activeMonitors["loc"]["moderator"][moderatorName]["moderator"]
			var playerLoc = player.name + ": " + player.dimension.id + " " + player.location.x.toFixed(0)+", " + player.location.y.toFixed(0)+", " + player.location.z.toFixed(0)
			moderator.runCommandAsync("w @s " + playerLoc)
		}

	}
}
/////////////////////////////
////// Helper functions /////
/////////////////////////////

/**
 * Checks if a string is numeric
 * @param (string) str The sting to verify
 */
function isNumeric(str) {
  if (typeof str != "string") return false // we only process strings!  
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}
/**
 * calculates the mean and standard deviation
 * @param (numeric[]) an array for computing the average and standard deviation
 * @returrn ([StD, Mean]) returns an array with mean and standard deviation 
 */
function  meanAndSTD(arr){
	// taken from https://www.geeksforgeeks.org/how-to-get-the-standard-deviation-of-an-array-of-numbers-using-javascript/
    // Creating the mean with Array.reduce
    let mean = arr.reduce((acc, curr) => {
        return acc + curr
    }, 0) / arr.length;
 
    // Assigning (value - mean) ^ 2 to
    // every array item
    arr = arr.map((k) => {
        return (k - mean) ** 2
    });
 
    // Calculating the sum of updated array
    let sum = arr.reduce((acc, curr) => acc + curr, 0);
 
    // Calculating the variance
    let variance = sum / arr.length
 
    // Returning the standard deviation
    return [Math.sqrt(sum / arr.length),mean]
}

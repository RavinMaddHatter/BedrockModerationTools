import { world, system } from '@minecraft/server';
import {ActionFormData, ModalFormData,MessageFormData } from "@minecraft/server-ui";

//////////////////////////////
////// Static Forms //////////
//////////////////////////////

const allowListform = new ModalFormData()
  .title("Administration Tools")
  .textField("Username","enter user name")
  .dropdown("opperation",["Add","Remove"],0)
  

const teleport = new ModalFormData()
  .title("Allow List Menu")
  .textField("X","location X")
  .textField("Y","location Y")
  .textField("Z","location Z")
  

 
const monitorRateForm = new ModalFormData()
  .title("Set Monitor Rate")
  .textField("Monitor Rate ","Seconds")
//////////////////////////////
//////// Globals /////////////
//////////////////////////////
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
var monitorRate=20
	

//////////////////////////////
////// Subscriptions /////////
//////////////////////////////

//Subscribe to world event player join to 
world.afterEvents.playerSpawn.subscribe(event =>{ 
	removeSpectator(event);

	showSplash(event); 
});

world.afterEvents.itemUse.subscribe(event => {
	if (event.itemStack.typeId === "minecraft:stick" && event.itemStack.nameTag === "mod" && (event.source.hasTag("menuAccess")||event.source.hasTag("root"))) {
		var buttons = []
		if(event.source.hasTag("mod")||event.source.hasTag("inspect")||event.source.hasTag("teleport")||event.source.hasTag("spectatorOkay")||event.source.hasTag("root")){
			buttons.push("Inspect")
		}
		if(event.source.hasTag("monitor")||event.source.hasTag("root")){
			buttons.push("Monitor")
		}
		if(event.source.hasTag("admin")||event.source.hasTag("allowList")||event.source.hasTag("root")){
			buttons.push("Administrate")
		}
		let mainForm = new ActionFormData()
		mainForm.title("Moderator Tools")
		mainForm.body("What do you need")
		for (const text of buttons){
			mainForm.button(text)
		}
		var nextForm = 99;
		mainForm.show(event.source).then((response) => {
			switch(buttons[response.selection]){
				case "Inspect"://Inspect
					openInspect(event.source)
					break;
				case "Monitor"://Monitor
					openMonitor(event.source)
					break;
				case "Administrate"://Admin
					openAdmin(event.source)
					break;
				default:
					break;
				}
		});
	}
});

function openInspect(moderator){
	let inspectForm = new ActionFormData()
	var buttons = []
	inspectForm.title("Inspection Tools")
	inspectForm.body("What do you need")
	if(moderator.hasTag("mod")||moderator.hasTag("root")){
		buttons.push("Ticks Per Second")
		buttons.push("MSPT")
	}
	
	if(moderator.hasTag("spectatorOkay")||moderator.hasTag("root")){
		buttons.push("Spectator")
	}
	if(moderator.hasTag("teleport")||moderator.hasTag("root")){
		buttons.push("Teleport to player")
		buttons.push("Teleport")
	}
	if ((moderator.hasTag("teleport")&&moderator.hasTag("spectator"))||moderator.hasTag("root")){
		("Stealth Teleport to player")
	}
	if(moderator.hasTag("inspect")||moderator.hasTag("root")){
		buttons.push("Get Player Location")
		buttons.push("Get Player Inventory")
	}
	for(const text of buttons){
		inspectForm.button(text)
	}
	
	inspectForm.show(moderator).then((response) =>{
		switch(buttons[response.selection]){
			case "Spectator"://spectator
				enterSpectator(moderator);
				break;
			case "Teleport"://Teleport
				teleportFunction(moderator);
				break;
			case "Ticks Per Second"://TPS
				modForTPS=moderator;
				startTime = Date.now();
				system.runTimeout(ticksPerSecond,ticksAverage);
				break;// get locations
			case "Get Player Location":
				getPlayerLocation(moderator);
				break;
			case "Get Player Inventory":// get inventories
				getInventories(moderator);
				break;
			case "Teleport to player"://tp to player
				tpToPlayerShow(moderator);
				break;
			case "Stealth Teleport to player"://stealth tp to player
				stealthTpToPlayerShow(moderator);
				break;
			case "MSPT":
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
	var buttons=[]
	let monitorForm = new ActionFormData()
	monitorForm.title("Monitoring Tools")
	monitorForm.body("What do you need")
	buttons.push("Ticks per Second")
	if(moderator.hasTag("inspect")||moderator.hasTag("root")){
		buttons.push("Player Position")
		buttons.push("Player Inventory")
	}
	buttons.push("Set Monitoring Rate")
	for(const text of buttons){
		monitorForm.button(text)
	}
	monitorForm.show(moderator).then((response) =>{
	switch(buttons[response.selection]){
		case "Ticks per Second"://TPS continous
			if("tps" in activeMonitors){
				if (moderator.name in activeMonitors["tps"]["users"]){
					delete activeMonitors["tps"]["users"][moderator.name]
					const keys = Object.keys(activeMonitors["tps"]["users"]);
					if(keys.length==0){
						system.clearRun(activeMonitors["tps"]["handle"])
						delete activeMonitors["tps"]
					}
				}
			}else{
				activeMonitors["tps"]={}
				activeMonitors["tps"]["users"]={}
				activeMonitors["tps"]["users"][moderator.name]=moderator
				activeMonitors["tps"]["startTime"]=Date.now()
				if(!("handle" in activeMonitors["tps"])){
					activeMonitors["tps"]["handle"]=system.runInterval(ticksPerSecondRepeat,ticksAverage)
				}
			}
			break;
		case "Player Position":// player position repeat
			monitorPlayerLocationForm(moderator)
			break;
		case "Player Inventory"://player intentory updates
			monitorPlayerInvForm(moderator)
			break;
		case "Set Monitoring Rate":
			setMonitorRateForm(moderator)
		default:
			break;
	}		
	});
}
function openAdmin(moderator){
	var buttons=[]
	let adminForm = new ActionFormData()
	adminForm.title("Administration Tools")
	adminForm.body("What do you need")
	if(moderator.hasTag("admin")||moderator.hasTag("root")){
		buttons.push("Kick")
	}
	if(moderator.hasTag("allowList")||moderator.hasTag("root")){
		buttons.push("Allow List")
	}
	if(moderator.hasTag("root")){
		buttons.push("Setup Moderators")
	}
	for(const text of buttons){
		adminForm.button(text)
	}
	adminForm.show(moderator).then((response) =>{
		switch(buttons[response.selection]){
			case "Kick"://kick
				showKickMenu(moderator)
				break;
			case "Allow List"://allow list add
				allowListAdd(moderator)
				break;
			case "Setup Moderators":
				showPermissionsForm(moderator)
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
	var buttons=["Acknowledge","Don't show me again"]
	const splashMenu = new MessageFormData()
		.title("Welcome")
		.body("This is a user owned server and we are required to inform you:\n\r\n\rTHIS SERVER IS NOT AN OFFICIAL MINECRAFT SERVER. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT")
		.button1(buttons[0])
		.button2(buttons[1])
	splashMenu.show(latestJoin).then(r =>{
		if (r.canceled){
			return;
		}
		switch(buttons[r.selection]){
			case "Acknowledge":
				break;
			case "Don't show me again":
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

function showPermissionsForm(moderator){
	var names = []
	let permissionForm = new ModalFormData()
	permissionForm.title("Select player to Manage")
	var playerHandle={}
	let players = world.getPlayers();
	for (let i = 0; i < players.length; i++){
		names.push(players[i].name)
		playerHandle[players[i].name]=players[i]
	}
	permissionForm.dropdown("Player",names)
	permissionForm.show(moderator).then((r)=>{
		if (r.canceled) return;
		let [player] = r.formValues;
		showPlayerPermissionsForm(moderator,playerHandle[names[player]])
		
	});
}
function showPlayerPermissionsForm(moderator,player){
	var tags= 	[["Access Everything (including permissions)","root"],
				 ["Moderation Basic", "mod"],
				 ["Inspect Players","inspect"],
				 ["Teleport","teleport"],
				 ["Spectator","spectatorOkay"],
				 ["Monitor ","monitor"],
				 ["Kick","admin"],
				 ["Allow List","allowList"]]
	let playerPerm = new ModalFormData()
	playerPerm.title(player.name)
	for( const setting of tags){
		playerPerm.toggle(setting[0],player.hasTag(setting[1]))
	}
	var menuAccess=false
	playerPerm.show(moderator).then((r)=>{
		if (r.canceled) return;
		let settings = r.formValues;
		for(const i in settings){
			if(settings[i]){
				menuAccess=true
				player.addTag(tags[i][1])
			}else{
				player.removeTag(tags[i][1])
			}
		}
		if(menuAccess){
			player.addTag("menuAccess")
		}else{
			player.removeTag("menuAccess")
			
		}
	});
}
/**
 * Displays form for monitoring a player then loops
 * @param (player) moderator The moderator that executed the request
 */
function monitorPlayerLocationForm(moderator){
	var monitorLocForm = new ModalFormData;
	var names = ["None"]
	var playerHandle={}
	let players = world.getPlayers();
	for (let i = 0; i < players.length; i++){
		names.push(players[i].name)
		playerHandle[players[i].name]=players[i]
	}
	monitorLocForm.dropdown("Player",names)
	monitorLocForm.title("Monitor Player")
	monitorLocForm.show(moderator).then((r)=>{
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
			if(!("thread" in activeMonitors["loc"])){
				activeMonitors["loc"]["thread"]=system.runInterval(repeatMonitorPlayer,monitorRate)
			}
		}
	});
	
}
/**
 * sets up a monitor rule for a player.
 * @param (player) moderator The moderator that executed the request
 */
function monitorPlayerInvForm(moderator){
	var monPlayerInvForm = new ModalFormData;
	var names = ["None"]
	var playerHandle={}
	let players = world.getPlayers();
	for (let i = 0; i < players.length; i++){
		names.push(players[i].name)
		playerHandle[players[i].name]=players[i]
	}
	monPlayerInvForm.title("Monitor Player")
	monPlayerInvForm.dropdown("Player",names)
	monPlayerInvForm.show(moderator).then((r)=>{
		if (r.canceled) return;
		let [player, reason] = r.formValues;
		if (!("inv" in activeMonitors)){
			activeMonitors["inv"]={}
			activeMonitors["inv"]["moderator"]={}
		}
		if (names[player]==="None"){
			delete activeMonitors["inv"]["moderator"][moderator.name]
			const keys = Object.keys(activeMonitors["inv"]["moderator"]);
			if(keys.length==0){
				system.clearRun(activeMonitors["inv"]["thread"])
				delete activeMonitors["inv"]
			}
		}else{
			activeMonitors["inv"]["moderator"][moderator.name]={}
			activeMonitors["inv"]["moderator"][moderator.name]["player"]=playerHandle[names[player]]
			activeMonitors["inv"]["moderator"][moderator.name]["moderator"]=moderator
			if(!("thread" in activeMonitors["inv"])){
				activeMonitors["inv"]["thread"]=system.runInterval(repeatMonitorPlayerInv,monitorRate)
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
/**
 * Sets the monitor rates
 * @param (player) moderator The moderator that executed the request
 */
function setMonitorRateForm(moderator){
	monitorRateForm.then((r)=>{
		if (r.canceled) return;
		let [seconds] = r.formValues;
		if (isNumeric(seconds)){
			monitorRate = parseInt(parseFloat(seconds)/20)
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
		for (let slot = 0; slot<36;slot++){
			var itemStack = inventory.container.getItem(slot);
			if(!((typeof itemStack) === 'undefined')){
				inventory_text+=itemStack.type.id + ", "; 
			}
		}
		inventory_text=inventory_text.split("minecraft:").join("")
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
	msptArray.push(Date.now()-msptStop)
	var meanStd= meanAndSTD(msptArray)
	msptMod.runCommandAsync("w @s average mspt is " +meanStd[1].toFixed(1)+ " standard devation of "+meanStd[0].toFixed(1))

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
/**
 * A function to be scheduled that will get the players Inventory and print it to chat
 */
function repeatMonitorPlayerInv(){
	if ("inv" in activeMonitors){
		for (var moderatorName in activeMonitors["inv"]["moderator"]){ 
			var player = activeMonitors["inv"]["moderator"][moderatorName]["player"]
			var moderator = activeMonitors["inv"]["moderator"][moderatorName]["moderator"]
			var inventory_text = player.name+": "
			var inventory = player.getComponent("inventory");
			for (let slot = 0; slot<36;slot++){
				var itemStack = inventory.container.getItem(slot);
				if(!((typeof itemStack) === 'undefined')){
					inventory_text+=itemStack.type.id + ", "; 
				}
			}
			inventory_text=inventory_text.split("minecraft:").join("")
			moderator.runCommandAsync("w @s " + inventory_text)

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

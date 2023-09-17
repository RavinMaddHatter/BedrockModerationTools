import { world, system } from '@minecraft/server';
import { ModalFormData,MessageFormData } from "@minecraft/server-ui";

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
		switch(event.itemStack.nameTag){
			case "menu":
				moderator.addTag("mainMenu")
				break;
			case "tps":
				if(moderator.hasTag("mod")||moderator.hasTag("root")){
					sayInChat(moderator,"\u00A74Running Ticks Per second....")
					modForTPS=moderator;
					startTime = Date.now();
					system.runTimeout(ticksPerSecond,ticksAverage);
				}
				break;
			case "mspt":
				if(moderator.hasTag("mod")||moderator.hasTag("root")){
					sayInChat(moderator,"\u00A74Running Milliseconds Per Tick....")
					msptStart=Date.now()
					msptStop=Date.now()
					msptCounter=0;
					msptArray=[];
					msptMod=moderator;
					msptRouter();
				}
				break;
			case "mobs":
				if(moderator.hasTag("inspect")||moderator.hasTag("root")){
					sayInChat(moderator,"\u00A74Running Mob Query....")
					getMobsFunction(moderator);
				}
				break;
			default:
				break;
		}
	}
});

function showPlayerPermissionsForm(moderator,player){
	let tags= 	[["Access Everything (including permissions)","root"],
				 ["Moderation Basic", "mod"],
				 ["Inspect Players","inspect"],
				 ["Teleport","teleport"],
				 ["Spectator","spectatorOkay"],
				 ["Effects","effects"],
				 ["Monitor ","monitor"],
				 ["Kick","admin"],
				 ["Allow List","allowList"]]
	let playerPerm = new ModalFormData()
	playerPerm.title(player.name)
	for( const setting of tags){
		playerPerm.toggle(setting[0],player.hasTag(setting[1]))
	}
	let menuAccess=false
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
 * sets up a monitor rule for a player.
 * @param (player) moderator The moderator that executed the request
 */
function monitorPlayerInvForm(moderator){
	let monPlayerInvForm = new ModalFormData;
	let names = ["None"]
	let playerHandle={}
	let players = world.getPlayers();
	for (let i = 0; i < players.length; i++){
		names.push(players[i].name)
		playerHandle[players[i].name]=players[i]
	}
	monPlayerInvForm.title("Monitor Player Inventory")
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
	let tpForm = new ModalFormData;
	tpForm.title("Teleport To Player")
	let names = world.getPlayers().map((player) => player.name);
	tpForm.dropdown("Player",names)
	tpForm.show(moderator).then((r)=>{
		if (r.canceled) return;
		let [player] = r.formValues;
		moderator.runCommandAsync("tp @s " + names[player])
	});
}

function stealthTpToPlayerShow(moderator){
	let tpForm = new ModalFormData;
	let names = world.getPlayers().map((player) => player.name);
	tpForm.title("Stealth Teleport To Player")
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
	let dims= ["Overworld", "Nether", "The End"]
	let teleport = new ModalFormData()
	  .title("Teleport Menu")
	  //.dropdown("Dimension",dims,0)
	  .textField("X","location X",moderator.location.x.toFixed(2))
	  .textField("Y","location Y",moderator.location.y.toFixed(2))
	  .textField("Z","location Z",moderator.location.z.toFixed(2))
	teleport.show(moderator).then((r)=>{
		if (r.canceled) return;
		let [ x, y, z] = r.formValues;
		
		if (isNumeric(x) && isNumeric(y) && isNumeric(z)){
			moderator.teleport({x:parseFloat(x),y:parseFloat(y),z:parseFloat(z)})
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
	let playerLoc
	
	for (let i = 0; i < players.length; i++){
		playerLoc ="\u00A74" + players[i].name + ": \u00A7a" + players[i].dimension.id + "\u00A7f " + players[i].location.x.toFixed(0)+", " + players[i].location.y.toFixed(0)+", " + players[i].location.z.toFixed(0)
		
		sayInChat(moderator, playerLoc)
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
	let inventory_text = ""
	for (let i = 0; i < players.length; i++){
		inventory_text = "\u00A74"+players[i].name+": \u00A7f"
		let inventory = players[i].getComponent("inventory");
		for (let slot = 0; slot<36;slot++){
			let itemStack = inventory.container.getItem(slot);
			if(!((typeof itemStack) === 'undefined')){
				inventory_text+=itemStack.type.id + ", "; 
			}
		}
		sayInChat(moderator,inventory_text)
	}
	
}
/**
 * Function to be executed on an delay of ticksAverage to enable testing of lag on the server. 20 ticks should occur per second.
 */
function ticksPerSecond(){
	let tps = 1000 * ticksAverage/(Date.now()-startTime)
	sayInChat(modForTPS,"\u00A74Ticks Per Second: \u00A7f"+tps.toFixed(2))
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
	let meanStd= meanAndSTD(msptArray)
	sayInChat(msptMod,"\u00A74Average mspt: \u00A7f" +meanStd[1].toFixed(1)+ " \u00A7estandard devation: \u00A7f"+meanStd[0].toFixed(1))

}
/**
 * Prints all mobs, types, and counts to chat per dimnesion and per player
 * @param (player) moderator The moderator that executed the request
*/
function getMobsFunction(moderator){

	let [globalMobs,overworldMobs,netherMobs,endMobs] = getMobsNearPlayers(moderator)
	let overworldPrint = ""
	let netherPrint = ""
	let endPrint = ""
	let globalPrint = ""
	let globalCap = 0
	let overworldCount = 0
	let netherCount=0
	let endCount=0
	for (const [name, count] of Object.entries(overworldMobs)) {
		if(overworldCount>0){
			overworldPrint += ", "
		}
		overworldPrint = overworldPrint + ' ' + count + 'x'+name
		overworldCount += count
	}
	for (const [name, count] of Object.entries(netherMobs)) {
		if(netherCount>0){
			netherPrint += ", "
		}
		netherPrint = netherPrint + ' ' + count+'x' + name
		netherCount += count
	}
	for (const [name, count] of Object.entries(endMobs)) {
		if(endCount>0){
			endPrint += ", "
		}
		endPrint = endPrint + ' ' + count + 'x' + name
		endCount += count
	}
	for (const [name, count] of Object.entries(globalMobs)) {
		if(globalCap>0){
			globalPrint += ", "
		}
		globalPrint = globalPrint + ' ' + count + 'x' + name
		globalCap += count
	}
	if(overworldCount>0){
		sayInChat(moderator,"\u00A74Overworld: \u00A7f"+ overworldPrint)
	}
	if (netherCount>0){
		sayInChat(moderator,"\u00A74Nether: \u00A7f"   + netherPrint)
	}
	if(endCount>0){
		sayInChat(moderator,"\u00A74The End: \u00A7f"  + endPrint)
	}
	sayInChat(moderator, '\u00A76Global: \u00A7f'  + globalPrint)
	sayInChat(moderator, '\u00A76Global Mob Cap: \u00A7f' + globalCap)
}

/**
 * Prints all mobs around each player.
 * @param (player) moderator The moderator that executed the request
 * @return [global,overworld,nether,end] Returns an array of dicts that contain mob count
*/
function getMobsNearPlayers(moderator){
	let players = world.getPlayers()
	let overworldMobs = {}
	let netherMobs = {}
	let endMobs = {}
	let globalMobs = {}
	let counted = []
	for(const player of players){
		const dimension = world.getDimension(player.dimension.id);
		const dimensionEntities = dimension.getEntities({
			location: player.location,
			maxDistance: 128,
			})
		let playerEntityTypes={}
		let mobsPrint=""
		
		for(const entity of dimensionEntities){
			if(mobcapEntity(entity.typeId)){
				switch (entity.dimension.id){
					case "minecraft:overworld":
						if(!(entity.typeId in overworldMobs)){
							overworldMobs[entity.typeId] = 0		
						}
						overworldMobs[entity.typeId]++
						break;
					case "minecraft:nether":
						if(!(entity.typeId in netherMobs)){
							netherMobs[entity.typeId] = 0		
						}
						netherMobs[entity.typeId]++
						break;
					case "minecraft:the_end":
						if(!(entity.typeId in endMobs)){
							endMobs[entity.typeId] = 0		
						}
						endMobs[entity.typeId]++
						break;
				}
				
				if(!counted.includes(entity.id)){
					if(!(entity.typeId in globalMobs)){
						globalMobs[entity.typeId] = 0		
					}
					globalMobs[entity.typeId]++
					counted.push(entity.id)
				}
				if (entity.dimension.id === player.dimension.id){
					if(!(entity.typeId in playerEntityTypes)){
						playerEntityTypes[entity.typeId] = 0		
					}
					playerEntityTypes[entity.typeId]++
				}
			}
		}
		let playerMobCount = 0
		for (const [name, count] of Object.entries(playerEntityTypes)) {
			if(playerMobCount>0){
				mobsPrint += ", "
			}
			mobsPrint=mobsPrint + ' ' + count + 'x' + name
			playerMobCount += count
		}
		sayInChat(moderator, "\u00A74" + player.name + ": \u00A7e"+player.dimension.id+" \u00A7f"+mobsPrint)
	}
	return [globalMobs,overworldMobs,netherMobs,endMobs]
}

//////////////////////////////
////// Monitor functions /////
//////////////////////////////

/**
 * Function to be executed on an interval of ticksAverage to enable testing of lag on the server. 20 ticks should occur per second.
 */
function ticksPerSecondRepeat(){
	if ("tps" in activeMonitors){
		let ticksPerSecond = 1000 * ticksAverage/(Date.now()-activeMonitors["tps"]["startTime"])
		for (let key in activeMonitors["tps"]["users"]) {
			sayInChat(activeMonitors["tps"]["users"][key],"\u00A74 Ticks Per Second: \u00A7f" + ticksPerSecond.toFixed(2))
		}
		activeMonitors["tps"]["startTime"]=Date.now()
	}
}
/**
 * A function to be scheduled that will get the players location and print it to chat
 */
function repeatMonitorPlayer(){
	if ("loc" in activeMonitors){
		for (let moderatorName in activeMonitors["loc"]["moderator"]){ 
			let player = activeMonitors["loc"]["moderator"][moderatorName]["player"]
			let moderator = activeMonitors["loc"]["moderator"][moderatorName]["moderator"]
			let playerLoc = "\u00A74" + player.name + ": \u00A7a" + player.dimension.id + " \u00A7f" + player.location.x.toFixed(0)+", " + player.location.y.toFixed(0)+", " + player.location.z.toFixed(0)
			sayInChat(moderator, playerLoc)
		}

	}
}
/**
 * A function to be scheduled that will get the players Inventory and print it to chat
 */
function repeatMonitorPlayerInv(){
	if ("inv" in activeMonitors){
		for (let moderatorName in activeMonitors["inv"]["moderator"]){ 
			let player = activeMonitors["inv"]["moderator"][moderatorName]["player"]
			let moderator = activeMonitors["inv"]["moderator"][moderatorName]["moderator"]
			let inventory_text = "\u00A74" + player.name+": \u00A7f"
			let inventory = player.getComponent("inventory");
			for (let slot = 0; slot<36;slot++){
				let itemStack = inventory.container.getItem(slot);
				if(!((typeof itemStack) === 'undefined')){
					inventory_text+=itemStack.type.id + ", "; 
				}
			}
			sayInChat(moderator, inventory_text)

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
function sayInChat(target,text){
	text=text.split("minecraft:").join("")
	target.runCommandAsync('tellraw @s {"rawtext":[{"text":"'+text+'"}]}')
}
function mobcapEntity(entityType){
	const excludedEntityTypes= ["minecraft:villager_v2", "minecraft:item", "minecraft:snow_golem", "minecraft:iron_golem", 
		"minecraft:boat", "minecraft:chest_boat", "minecraft:warden", "minecraft:wither", "minecraft:xp_orb", 
		"minecraft:minecart", "minecraft:hopper_minecart", "minecraft:tnt_minecart", "minecraft:chest_minecart", 
		"minecraft:shulker", "minecraft:allay", "minecraft:evocation_illager", "minecraft:evocation_fang", "minecraft:vindicator", 
		"minecraft:pillager", "minecraft:ravager", "minecraft:elder_guardian", "minecraft:elder_guardian_ghost", 
		"minecraft:ender_crystal", "minecraft:ender_dragon", "minecraft:endermite", "minecraft:arrow", "minecraft:fireworks_rocket", 
		"minecraft:egg", "minecraft:leash_knot", "minecraft:lightning_bolt", "minecraft:npc", "minecraft:sniffer", 
		"minecraft:snowball", "minecraft:splash_potion", "minecraft:tnt", "minecraft:vex", "minecraft:piglin_brute", 
		"minecraft:mule", "minecraft:trader_llama", "minecraft:wandering_trader", "minecraft:silver_fish", 
		"minecraft:skeleton_horse", "minecraft:zoglin", "minecraft:camel", "minecraft:armor_stand", "minecraft:falling_block", 
		"minecraft:thrown_trident", "minecraft:zombie_villager", "minecraft:zombie_villager_v2", "minecraft:zombie_horse", 
		"minecraft:player", "minecraft:villager"]
	return !excludedEntityTypes.includes(entityType)
}
import shutil
import os
import json
import uuid
full_pack_name="Bedrock Moderation Tools-Autostart-BETA"
no_autostart_pack_name="Bedrock Moderation Tools-Manual Start-BETA"
no_default_admin_description= "A set of moderation tools that allow specifically taged players to be able to execute specific actions in the game. No default admin is given."
gui_pack_name="Bedrock Moderation Tools-GUI"

trigger_manual_start="Bedrock Moderation Tools-1.20.30 Manual Start"
triggers_no_auto_text="Due to a bug in 1.20.30 the GUI and triggers must be seperated. The trigger pack will have limited functionality, but can be used on its own, Does not automatically make first person Root"
trigger_auto_start="Bedrock Moderation Tools-1.20.30 Auto Start"
def removeOld():
    if os.path.exists(f'{full_pack_name}.mcpack'):
        os.remove(f'{full_pack_name}.mcpack')
        
    if os.path.exists(f'{no_autostart_pack_name}.mcpack'):
        os.remove(f'{no_autostart_pack_name}.mcpack')

    if os.path.exists(f'{gui_pack_name}.mcpack'):
        os.remove(f'{gui_pack_name}.mcpack')

    if os.path.exists(f'{trigger_manual_start}.mcpack'):
        os.remove(f'{trigger_manual_start}.mcpack')

    if os.path.exists(f'{trigger_auto_start}.mcpack'):
        os.remove(f'{trigger_auto_start}.mcpack')
    if os.path.exists(f'BedrockModerationToolsTriggersTemp'):
        shutil.rmtree("BedrockModerationToolsTriggersTemp")
    if os.path.exists(f'BedrockModerationToolsTemp'):
        shutil.rmtree("BedrockModerationToolsTemp")
    if os.path.exists(f'addon'):
        shutil.rmtree("addon")
    if os.path.exists('BedrockModerationTools1-20-30.addon'):
        os.remove('BedrockModerationTools1-20-30.addon')
def makeFullPackAutostart(packGUID):
    with open("BedrockModerationTools\\manifest.json") as file:
        manifest=json.load(file)
    manifest["modules"][0]["uuid"]= str(uuid.uuid4())
    manifest["header"]["uuid"]= str(packGUID)
    with open("BedrockModerationTools\\manifest.json","w+") as file:
        json.dump(manifest, file, indent=2)  
    shutil.make_archive(f"{full_pack_name}", 'zip', "BedrockModerationTools")
    os.rename(f'{full_pack_name}.zip',f'{full_pack_name}.mcpack')
def makeFullPackManual(packGUID):
    ## pack up full pack no autostart
    shutil.copytree("BedrockModerationTools", "BedrockModerationToolsTemp")
    shutil.rmtree("BedrockModerationToolsTemp\\functions")
    shutil.rmtree("BedrockModerationToolsTemp\\structures")
    with open("BedrockModerationToolsTemp\\manifest.json") as file:
        manifest=json.load(file)
    manifest["header"]["name"]="Bedrock Moderation Tools-Manual Start"
    manifest["header"]["description"]=no_default_admin_description
    manifest["modules"][0]["uuid"]= str(uuid.uuid4())
    manifest["header"]["uuid"]= str(packGUID)
    with open("BedrockModerationToolsTemp\\manifest.json","w+") as file:
        json.dump(manifest, file, indent=2)
    shutil.make_archive(f"{no_autostart_pack_name}", 'zip', "BedrockModerationToolsTemp")
    os.rename(f'{no_autostart_pack_name}.zip',f'{no_autostart_pack_name}.mcpack')
    
def packGui(packGUID):
    ## pack up GUI pack...
    with open("BedrockModerationToolsGUI\\manifest.json") as file:
        manifest=json.load(file)
    manifest["modules"][0]["uuid"]= str(uuid.uuid4())
    manifest["header"]["uuid"]= str(packGUID)
    with open("BedrockModerationToolsGUI\\manifest.json","w+") as file:
        json.dump(manifest, file, indent=2)  
    shutil.make_archive(f"{gui_pack_name}", 'zip', "BedrockModerationToolsGUI")
    os.rename(f'{gui_pack_name}.zip',f'{gui_pack_name}.mcpack')

def packTriggerAutostart(guid,depenancyGUID):
    ## pack up Triggers Autostart pack...
    with open("BedrockModerationToolsTriggers\\manifest.json") as file:
        manifest=json.load(file)
    manifest["modules"][0]["uuid"]= str(uuid.uuid4())
    manifest["header"]["uuid"]= str(guid)
    manifest["dependencies"].append({"uuid":str(depenancyGUID),"version":[1,0,0]})
    with open("BedrockModerationToolsTriggers\\manifest.json","w+") as file:
        json.dump(manifest, file, indent=2)  
    shutil.make_archive(f"{trigger_auto_start}", 'zip', "BedrockModerationToolsTriggers")
    os.rename(f'{trigger_auto_start}.zip',f'{trigger_auto_start}.mcpack')
def packTriggerManualstart(guid,depenancyGUID):
    ## pack up trigger No auto start
    shutil.copytree("BedrockModerationToolsTriggers", "BedrockModerationToolsTriggersTemp")
    shutil.rmtree("BedrockModerationToolsTriggersTemp\\functions")
    shutil.rmtree("BedrockModerationToolsTriggersTemp\\structures")
    with open("BedrockModerationToolsTriggersTemp\\manifest.json") as file:
        manifest=json.load(file)
    manifest["header"]["name"]="Bedrock Moderation Tools-Manual Start"
    manifest["header"]["description"]=triggers_no_auto_text
    manifest["modules"][0]["uuid"]= str(uuid.uuid4())
    manifest["header"]["uuid"]= str(guid)
    manifest["dependencies"].append({"uuid":str(depenancyGUID),"version":[1,0,0]})
    with open("BedrockModerationToolsTriggersTemp\\manifest.json","w+") as file:
        json.dump(manifest, file, indent=2)
    shutil.make_archive(f"{trigger_manual_start}", 'zip', "BedrockModerationToolsTriggersTemp")
    os.rename(f'{trigger_manual_start}.zip',f'{trigger_manual_start}.mcpack')

def removeTemps():
    shutil.rmtree("BedrockModerationToolsTriggersTemp")
    shutil.rmtree("BedrockModerationToolsTemp")
    try:
        shutil.rmtree("addon")
    except:
        pass
def makeAddons():
    shutil.copytree("BedrockModerationToolsTriggersTemp", "addon\BedrockModerationToolsTriggersManual")
    shutil.copytree("BedrockModerationToolsGUI", "addon\BedrockModerationToolsGUI")
    shutil.copytree("BedrockModerationToolsTriggers", "addon\BedrockModerationToolsTriggers")
    shutil.make_archive("BedrockModerationTools1-20-30", 'zip', "addon")
    os.rename('BedrockModerationTools1-20-30.zip','BedrockModerationTools1-20-30.addon')
    print("here")



removeOld()
makeFullPackAutostart(uuid.uuid4())
makeFullPackManual(uuid.uuid4())
uuidGUI=uuid.uuid4()
uuidTrigger1=uuid.uuid4()
uuidTrigger2=uuid.uuid4()
packGui(uuidGUI)
packTriggerManualstart(uuidTrigger1,uuidGUI)
packTriggerAutostart(uuidTrigger2,uuidGUI)
#makeAddons()
removeTemps()

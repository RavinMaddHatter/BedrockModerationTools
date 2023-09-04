import shutil
import os
import json
import uuid
full_pack_name="Bedrock Moderation Tools-Autostart"
no_autostart_pack_name="Bedrock Moderation Tools-Manual Start"
if os.path.exists(f'{full_pack_name}.mcpack'):
    os.remove(f'{full_pack_name}.mcpack')
if os.path.exists(f'{no_autostart_pack_name}.mcpack'):
    os.remove(f'{no_autostart_pack_name}.mcpack')
with open("BedrockModerationTools\\manifest.json") as file:
    manifest=json.load(file)
manifest["modules"][0]["uuid"]= str(uuid.uuid4())
manifest["header"]["uuid"]= str(uuid.uuid4())
with open("BedrockModerationTools\\manifest.json","w+") as file:
    json.dump(manifest, file, indent=2)  
shutil.make_archive(f"{full_pack_name}", 'zip', "BedrockModerationTools")
os.rename(f'{full_pack_name}.zip',f'{full_pack_name}.mcpack')


no_default_admin_description= "A set of moderation tools that allow specifically taged players to be able to execute specific actions in the game. No default admin is given."



shutil.copytree("BedrockModerationTools", "BedrockModerationToolsTemp")
shutil.rmtree("BedrockModerationToolsTemp\\functions")
shutil.rmtree("BedrockModerationToolsTemp\\structures")
manifest["header"]["name"]="Bedrock Moderation Tools-Manual Start"
manifest["header"]["description"]=no_default_admin_description
manifest["modules"][0]["uuid"]= str(uuid.uuid4())
manifest["header"]["uuid"]= str(uuid.uuid4())
with open("BedrockModerationToolsTemp\\manifest.json","w+") as file:
    json.dump(manifest, file, indent=2)

shutil.make_archive(f"{no_autostart_pack_name}", 'zip', "BedrockModerationToolsTemp")
os.rename(f'{no_autostart_pack_name}.zip',f'{no_autostart_pack_name}.mcpack')
shutil.rmtree("BedrockModerationToolsTemp")

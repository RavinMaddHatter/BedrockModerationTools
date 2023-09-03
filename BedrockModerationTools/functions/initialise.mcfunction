scoreboard objectives add world4944879 dummy
scoreboard players add initialised4944879 world4944879 0




execute as @p if score initialised4944879 world4944879 matches 0 run tag @a add root
execute as @p at @s if score initialised4944879 world4944879 matches 0 run structure load menuStick ~~~
execute as @p if score initialised4944879 world4944879 matches 0 run say you are the first player that joined you have root


execute as @p run scoreboard players set initialised4944879 world4944879 1
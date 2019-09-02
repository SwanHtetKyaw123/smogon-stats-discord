import Discord = require('discord.js');
import { CommandBase, MovesetCommandData } from "./command";
import { AppDataSource } from "../appDataSource";
import { ColorService } from '../pokemon/colorService';
import { FormatHelper } from '../smogon/helpers';
import { TypeService } from '../pokemon/typeService';
import { EffectivenessType, Pokemon } from '../pokemon/models';
import { UsageData, SmogonFormat, MoveSetUsage } from '../smogon/models';

export class PokemonCommand extends CommandBase {
  name = "pokemon";
  description = "Lists the most used moves of a given Pokémon";
  aliases = [ 'p', 'pkm', 'mon' ];

  constructor(dataSource: AppDataSource) {
    super(dataSource);
  }
  
  execute(message: any, args: any) {
    const cmd = this.tryGetMoveSetCommand(message, args);
    if (!cmd.valid) return;

    const embed = new Discord.RichEmbed()
      .setColor(ColorService.getColorForType(cmd.pokemon.type1))
      .setImage(`https://play.pokemonshowdown.com/sprites/xyani/${cmd.pokemon.name.replace(/ /g, '').toLowerCase()}.gif`)

    // base stats
    const { stats, baseStatsData } = this.getBaseStatsData(cmd);
    embed.addField("Base Stats Total: " + stats.tot, baseStatsData, true);

    // general info
    const infoX = this.getGeneralInfoData(cmd);
    embed.addField("General Info", infoX, true);

    // abilities
    const abilities = this.getData(cmd.moveSet.abilities);
    embed.addField("Abilities", abilities, true);

    // moves
    const moves = this.getData(cmd.moveSet.moves);
    embed.addField("Moves", moves, true);

    // items
    const items = this.getData(cmd.moveSet.items);
    embed.addField("Items", items, true);

    // effectiveness
    const weakResist = this.getWeakResistData(cmd);
    embed.addField("Weak/Resist", weakResist, true);

    // iv´s spread
    const spreads = this.getData(cmd.moveSet.spreads, 6, true);
    embed.addField("Nature/IV spread", spreads, true);

    // counters & checks
    let countersChecks = cmd.moveSet.checksAndCounters.slice(0, 6).map(iv => `\`${iv.name}: KOed ${iv.kOed.toFixed(1)}% / Swed ${iv.switchedOut.toFixed(1)}%\``).join('\n');
    countersChecks = countersChecks ? countersChecks : "-";
    embed.addField("Counters & Checks", countersChecks, true);

    // title and send message
    const msgHeader = `**__${cmd.pokemon.name}:__** ${FormatHelper.toString(cmd.format)}`;
    message.channel.send(msgHeader, embed);
  }

  private getBaseStatsData(cmd: MovesetCommandData) {
    const stats = cmd.pokemon.baseStats;
    const baseStatsH1 = "__\`HP      Atk     Def\`__".replace(new RegExp(' ', 'g'), "\u2006");
    const baseStatsH2 = "__\`Sp.Atk  Sp.Def  Spe\`__".replace(new RegExp(' ', 'g'), "\u2006");
    const baseStatsL1 = `${baseStatsH1}\n\`${stats.hp.toString().padEnd(8, "\u2006")}${stats.atk.toString().padEnd(8, "\u2005")}${stats.def}\``;
    const baseStatsL2 = `${baseStatsH2}\n\`${stats.spA.toString().padEnd(8, "\u2006")}${stats.spD.toString().padEnd(8, "\u2006")}${stats.spe}\``;
    const baseStatsData = `${baseStatsL1}\n${baseStatsL2}`;
    return { stats, baseStatsData };
  }

  private getGeneralInfoData(cmd: MovesetCommandData) {
    const usage = this.dataSource.smogonStats.getUsage(cmd.pokemon.name, cmd.format);
    const info1 = `Tier: \`${cmd.pokemon.tier}\``;
    const info2 = `Generation: \`${cmd.pokemon.generation}\``;
    const info3 = `Type: \`${cmd.pokemon.type1} ${(cmd.pokemon.type2 ? '/ ' + cmd.pokemon.type2 : '')}\``;
    const info4 = `Usage: \`${(usage ? usage.usageRaw.toFixed(2) + '%' : '')}\``;
    const infoX = `${info1}\n${info2}\n${info3}\n${info4}`;
    return infoX;
  }

  private getWeakResistData(cmd: MovesetCommandData) {
    const effectiveness = TypeService.getFullEffectiveness(cmd.pokemon);
    const weakss = effectiveness.filter(e => e.effect == EffectivenessType.SuperEffective
                                            || e.effect == EffectivenessType.SuperEffective2x)
                                .map((w, i) => ((i + 1) % 4 === 0 ? '\n' : '') + (w.effect == EffectivenessType.SuperEffective2x ? `**${w.type}**` : w.type))
                                .join(', ');
    const resist = effectiveness.filter(e => e.effect == EffectivenessType.NotVeryEffective
                                          || e.effect == EffectivenessType.NotVeryEffective2x)
                                .map((w, i) => ((i + 1) % 4 === 0 ? '\n' : '') + (w.effect == EffectivenessType.NotVeryEffective2x ? `**${w.type}**` : w.type))
                                .join(', ');
    const imune = effectiveness.filter(e => e.effect == EffectivenessType.None)
                               .map(w => w.type)
                               .join(', ');
    const weakResist = `__Weak:__ \n${weakss}\n__Resist:__ \n${resist}\n__Imune:__\n${imune}`;
    return weakResist;
  }

  private getData(usageData: UsageData[], limit: number = 6, highlighEverything: boolean = false): string {
    const hl1 = highlighEverything ? "\`" : "";
    const hl2 = highlighEverything ? ""   : "\`";
    const data = usageData.slice(0, limit).map(iv => `${hl1}${iv.name}: ${hl2}${iv.percentage.toFixed(2)}%\``).join('\n');
    return data;
  }
}